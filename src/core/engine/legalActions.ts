import { SideCode } from '../types/card';
import { GameAction } from '../types/actions';
import { GameState } from '../types/state';
import { isLegalAction } from './gameEngine';

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
