import { SideCode } from '../types/card';
import { GameAction } from '../types/actions';
import { GameState } from '../types/state';
import { isLegalAction } from './gameEngine';
import { activePrompt } from './prompts';

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

  if (state.activeRun) {
    if (side === 'runner') {
      candidates.push({ type: 'CONTINUE_RUN', player: 'runner' }, { type: 'JACK_OUT', player: 'runner' });
    }
  } else {
    candidates.push(
      { type: 'GAIN_CREDIT', player: side },
      { type: 'DRAW_CARD', player: side },
      { type: 'END_TURN', player: side }
    );
  }

  const servers = Object.values(state.corp.servers);

  if (side === 'corp') {
    if (!state.activeRun) {
      for (const card of state.corp.hq) {
        candidates.push({ type: 'INSTALL_CARD', player: 'corp', cardInstanceId: card.instanceId, asNewRemote: true });
        for (const server of servers) {
          candidates.push({ type: 'INSTALL_CARD', player: 'corp', cardInstanceId: card.instanceId, targetServerId: server.id });
        }
      }
      for (const server of servers) {
        for (const card of [...server.ice, ...server.root]) {
          candidates.push({ type: 'ADVANCE_CARD', player: 'corp', cardInstanceId: card.instanceId, serverId: server.id });
        }
        for (const card of server.root) {
          candidates.push({ type: 'SCORE_AGENDA', player: 'corp', cardInstanceId: card.instanceId });
        }
      }
    }
    for (const server of servers) {
      for (const card of [...server.ice, ...server.root]) {
        if (!card.isRezzed) {
          candidates.push({ type: 'REZ_CARD', player: 'corp', cardInstanceId: card.instanceId });
        }
      }
    }
  } else if (!state.activeRun) {
    for (const card of state.runner.grip) {
      candidates.push({ type: 'INSTALL_CARD', player: 'runner', cardInstanceId: card.instanceId });
    }
    for (const server of servers) {
      candidates.push({ type: 'INITIATE_RUN', player: 'runner', targetServerId: server.id });
    }
  }

  return candidates;
}

/** Every possible answer to the active prompt. */
function promptAnswers(state: GameState): GameAction[] {
  const prompt = activePrompt(state)!;
  const base = { type: 'RESOLVE_PROMPT' as const, player: prompt.side, promptId: prompt.id };
  switch (prompt.kind) {
    case 'mulligan':
      return [false, true].map(mulligan => ({ ...base, choice: { kind: 'mulligan' as const, mulligan } }));
    case 'access_trash':
      return [false, true].map(trash => ({ ...base, choice: { kind: 'access_trash' as const, trash } }));
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
