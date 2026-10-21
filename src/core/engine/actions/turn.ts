import { EndTurnAction } from '../../types/actions';
import { GameState } from '../../types/state';
import { addLog } from '../log';
import { requireActionPhase } from '../helpers';

// TODO: discard down to maximum hand size, and require all clicks to be spent
// (both need a player choice prompt).
export function endTurn(state: GameState, action: EndTurnAction): void {
  requireActionPhase(state, action.player);
  if (action.player === 'corp') {
    state.activePlayer = 'runner';
    state.phase = 'runner_turn';
    state.runner.clicks = state.runner.maxClicks;
    addLog(state, 'corp', 'Corp ended turn. Runner turn begins (4 clicks).');
    return;
  }

  state.turnNumber += 1;
  state.activePlayer = 'corp';
  state.phase = 'corp_turn';
  state.corp.clicks = state.corp.maxClicks;

  // Mandatory Corp Draw at start of turn
  if (state.corp.rd.length === 0) {
    state.winner = 'runner';
    state.winReason = 'Corp decked out (R&D empty during mandatory draw)';
    addLog(state, 'system', 'Runner wins: Corp cannot perform mandatory draw from empty R&D.');
    return;
  }

  const drawn = state.corp.rd.shift()!;
  state.corp.hq.push(drawn);
  addLog(state, 'system', `--- Turn ${state.turnNumber} ---`);
  addLog(state, 'corp', 'Corp drew 1 card (Mandatory Draw) and gained 3 clicks.');
}
