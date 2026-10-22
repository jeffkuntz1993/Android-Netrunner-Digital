import { EndTurnAction } from '../../types/actions';
import { SideCode } from '../../types/card';
import { GameState } from '../../types/state';
import { addLog } from '../log';
import { requireActionPhase, illegal } from '../helpers';
import { pushPrompt, sideName } from '../prompts';
import { fireTrigger } from '../triggers';
import { maxHandSize } from '../cardEffects';

export function handSize(state: GameState, side: SideCode): number {
  return side === 'corp' ? state.corp.hq.length : state.runner.grip.length;
}

export function endTurn(state: GameState, action: EndTurnAction): void {
  const side = action.player;
  requireActionPhase(state, side);
  if (state[side].clicks > 0) illegal('You must spend all clicks before ending your turn');

  const limit = maxHandSize(state, side);
  const excess = handSize(state, side) - Math.max(0, limit);
  if (excess > 0) {
    // The turn finishes once the discard prompt is resolved.
    pushPrompt(state, {
      kind: 'discard',
      side,
      count: excess,
      message: `${sideName(side)}: discard ${excess} card(s) down to your maximum hand size of ${limit}.`,
    });
    return;
  }
  finishEndTurn(state, side);
}

/** Ends the discard phase and hands the turn to the other player. */
export function finishEndTurn(state: GameState, side: SideCode): void {
  fireTrigger(state, { type: 'discard_phase_ends', side });
  if (state.winner) return;
  if (side === 'runner') state.runnerLastTurnRuns = state.runsThisTurn;
  state.runsThisTurn = [];
  state.turnFlags = {};
  if (side === 'corp') {
    state.activePlayer = 'runner';
    state.phase = 'runner_turn';
    state.runner.clicks = state.runner.maxClicks;
    addLog(state, 'corp', 'Corp ended turn. Runner turn begins (4 clicks).');
    fireTrigger(state, { type: 'turn_begins', side: 'runner' });
    return;
  }
  state.turnNumber += 1;
  addLog(state, 'system', `--- Turn ${state.turnNumber} ---`);
  beginCorpTurn(state);
}

/** Starts a Corp turn: refill clicks, "when your turn begins" abilities, then the mandatory draw. */
export function beginCorpTurn(state: GameState): void {
  state.activePlayer = 'corp';
  state.phase = 'corp_turn';
  state.corp.clicks = state.corp.maxClicks;
  fireTrigger(state, { type: 'turn_begins', side: 'corp' });
  if (state.winner) return;

  if (state.corp.rd.length === 0) {
    state.winner = 'runner';
    state.winReason = 'Corp decked out (R&D empty during mandatory draw)';
    addLog(state, 'system', 'Runner wins: Corp cannot perform mandatory draw from empty R&D.');
    return;
  }
  state.corp.hq.push(state.corp.rd.shift()!);
  addLog(state, 'corp', `Corp gained ${state.corp.maxClicks} clicks and drew 1 card (Mandatory Draw).`);
}
