import { SideCode } from '../types/card';
import { GameAction } from '../types/actions';
import { GameState } from '../types/state';
import { isLegalAction } from './gameEngine';
import { activePrompt } from './prompts';
import { breakerScript } from './ice';
import { activeCards } from './triggers';
import { getCardScript } from '../scripts';
import { cardDef } from '../cards';
import { isAdvanceable } from './helpers';

/**
 * Lists every action the given side can legally take right now.
 *
 * Candidates are generated broadly and then filtered through the engine
 * itself, so this never lists an action that executeAction would reject.
 * UI buttons and AI agents should read from this list rather than
 * re-implementing rules.
 */
export function getLegalActions(state: GameState, side: SideCode): GameAction[] {
  if (state.winner) return [];
  return candidateActions(state, side).filter(action => isLegalAction(state, action));
}

function candidateActions(state: GameState, side: SideCode): GameAction[] {
  const prompt = activePrompt(state);
  if (prompt) return prompt.side === side ? promptAnswers(state) : [];

  const candidates: GameAction[] = [];
  // Cheap necessary conditions first (the engine still checks every candidate):
  // basic actions need the side's own action phase, and all but scoring need a click.
  const actionPhase = state.activePlayer === side && !state.activeRun;
  const hasClick = state[side].clicks > 0;

  if (state.activeRun) {
    if (side === 'runner') {
      candidates.push({ type: 'CONTINUE_RUN', player: 'runner' }, { type: 'JACK_OUT', player: 'runner' });
      candidates.push(...breakCandidates(state));
    }
  } else if (actionPhase) {
    candidates.push({ type: 'END_TURN', player: side });
    if (hasClick) candidates.push({ type: 'GAIN_CREDIT', player: side }, { type: 'DRAW_CARD', player: side });
    if (side === 'runner' && hasClick && state.runner.tags > 0) candidates.push({ type: 'REMOVE_TAG', player: 'runner' });
    if (side === 'corp' && hasClick) {
      if (state.corp.clicks >= 3) candidates.push({ type: 'PURGE_VIRUS', player: 'corp' });
      if (state.runner.tags > 0) {
        for (const card of state.runner.rig.resources) {
          candidates.push({ type: 'TRASH_RESOURCE', player: 'corp', cardInstanceId: card.instanceId });
        }
      }
    }
  }

  const servers = Object.values(state.corp.servers);
  candidates.push(...abilityCandidates(state, side));

  if (side === 'corp') {
    if (actionPhase) {
      if (hasClick) {
        for (const card of state.corp.hq) {
          const type = cardDef(card).type_code;
          if (type === 'operation') {
            candidates.push({ type: 'PLAY_OPERATION_OR_EVENT', player: 'corp', cardInstanceId: card.instanceId });
            continue;
          }
          candidates.push({ type: 'INSTALL_CARD', player: 'corp', cardInstanceId: card.instanceId, asNewRemote: true });
          for (const server of servers) {
            if (!server.isRemote && (type === 'agenda' || type === 'asset')) continue;
            if (type === 'ice' && server.ice.length > state.corp.credits) continue;
            candidates.push({ type: 'INSTALL_CARD', player: 'corp', cardInstanceId: card.instanceId, targetServerId: server.id });
          }
        }
      }
      for (const server of servers) {
        if (hasClick) {
          for (const card of [...server.ice, ...server.root]) {
            if (!isAdvanceable(card)) continue;
            candidates.push({ type: 'ADVANCE_CARD', player: 'corp', cardInstanceId: card.instanceId, serverId: server.id });
          }
        }
        for (const card of server.root) {
          const def = cardDef(card);
          if (def.type_code !== 'agenda' || card.advancementCounters < (def.advancement_cost ?? 0)) continue;
          candidates.push({ type: 'SCORE_AGENDA', player: 'corp', cardInstanceId: card.instanceId });
        }
      }
    }
    for (const server of servers) {
      for (const card of [...server.ice, ...server.root]) {
        if (!card.isRezzed && cardDef(card).type_code !== 'agenda') {
          candidates.push({ type: 'REZ_CARD', player: 'corp', cardInstanceId: card.instanceId });
        }
      }
    }
  } else if (actionPhase && hasClick) {
    for (const card of state.runner.grip) {
      if (cardDef(card).type_code === 'event') {
        candidates.push({ type: 'PLAY_OPERATION_OR_EVENT', player: 'runner', cardInstanceId: card.instanceId });
      } else if (getCardScript(card.cardCode)?.installsOnIce) {
        for (const ice of servers.flatMap(s => s.ice)) {
          candidates.push({ type: 'INSTALL_CARD', player: 'runner', cardInstanceId: card.instanceId, hostInstanceId: ice.instanceId });
        }
      } else {
        candidates.push({ type: 'INSTALL_CARD', player: 'runner', cardInstanceId: card.instanceId });
      }
    }
    for (const server of servers) {
      candidates.push({ type: 'INITIATE_RUN', player: 'runner', targetServerId: server.id });
    }
  }

  return candidates;
}

/** Every ability on the side's active cards; the engine filters out the unusable ones. */
function abilityCandidates(state: GameState, side: SideCode): GameAction[] {
  return activeCards(state, side).flatMap(card =>
    (getCardScript(card.cardCode)?.abilities ?? []).map((_, abilityIndex) => ({
      type: 'USE_ABILITY' as const,
      player: side,
      cardInstanceId: card.instanceId,
      abilityIndex,
    }))
  );
}

/** Break, boost and bioroid-break options for the current encounter. */
function breakCandidates(state: GameState): GameAction[] {
  const encounter = state.activeRun?.encounter;
  if (!encounter) return [];
  const unbroken = encounter.broken.flatMap((b, i) => (b ? [] : [i]));
  const actions: GameAction[] = [];
  for (const card of state.runner.rig.programs) {
    const script = breakerScript(card);
    if (!script) continue;
    actions.push({ type: 'BOOST_BREAKER', player: 'runner', breakerInstanceId: card.instanceId });
    for (let k = 1; k <= script.breakMax; k++) {
      for (const subroutineIndices of combinations(unbroken, k)) {
        actions.push({ type: 'BREAK_SUBROUTINE', player: 'runner', breakerInstanceId: card.instanceId, subroutineIndices });
      }
    }
  }
  for (const subroutineIndex of unbroken) {
    actions.push({ type: 'BIOROID_BREAK', player: 'runner', subroutineIndex });
  }
  return actions;
}

/** Every possible answer to the active prompt. */
function promptAnswers(state: GameState): GameAction[] {
  const prompt = activePrompt(state)!;
  const base = { type: 'RESOLVE_PROMPT' as const, player: prompt.side, promptId: prompt.id };
  switch (prompt.kind) {
    case 'mulligan':
      return [false, true].map(mulligan => ({ ...base, choice: { kind: 'mulligan' as const, mulligan } }));
    case 'access_trash':
      return [
        ...[false, true].map(trash => ({ ...base, choice: { kind: 'access_trash' as const, trash } })),
        ...(prompt.alternatives ?? []).map(a => ({
          ...base,
          choice: { kind: 'access_trash' as const, trash: false, alternativeId: a.id },
        })),
      ];
    case 'effect_choice':
      return prompt.options.map(o => ({ ...base, choice: { kind: 'effect_choice' as const, optionId: o.id } }));
    case 'effect_cards': {
      const answers: GameAction[] = [];
      for (let k = prompt.min; k <= prompt.max; k++) {
        for (const cardInstanceIds of combinations(prompt.candidateIds, k)) {
          answers.push({ ...base, choice: { kind: 'effect_cards' as const, cardInstanceIds } });
        }
      }
      return answers;
    }
    case 'discard': {
      const hand = prompt.side === 'corp' ? state.corp.hq : state.runner.grip;
      return combinations(hand.map(c => c.instanceId), prompt.count).map(cardInstanceIds => ({
        ...base,
        choice: { kind: 'discard' as const, cardInstanceIds },
      }));
    }
  }
}

function combinations<T>(items: T[], k: number): T[][] {
  if (k === 0) return [[]];
  if (items.length < k) return [];
  const [first, ...rest] = items;
  return [...combinations(rest, k - 1).map(c => [first, ...c]), ...combinations(rest, k)];
}
