import { DrawCardAction, GainCreditAction } from '../../types/actions';
import { GameState } from '../../types/state';
import { cardDef } from '../../cards';
import { addLog } from '../log';
import { illegal, requireActionPhase, requireClicks } from '../helpers';

export function gainCredit(state: GameState, action: GainCreditAction): void {
  const side = action.player;
  requireActionPhase(state, side);
  requireClicks(state, side);
  state[side].clicks -= 1;
  state[side].credits += 1;
  addLog(state, side, `${side === 'corp' ? 'Corp' : 'Runner'} spent [click] to gain 1 credit.`);
}

export function drawCard(state: GameState, action: DrawCardAction): void {
  requireActionPhase(state, action.player);
  requireClicks(state, action.player);
  if (action.player === 'corp') {
    if (state.corp.rd.length === 0) {
      state.winner = 'runner';
      state.winReason = 'Corp decked out (R&D is empty)';
      addLog(state, 'system', 'Runner wins: Corp attempted to draw from an empty R&D.');
      return;
    }
    state.corp.clicks -= 1;
    const drawn = state.corp.rd.shift()!;
    state.corp.hq.push(drawn);
    addLog(state, 'corp', 'Corp spent [click] to draw 1 card.');
  } else {
    if (state.runner.stack.length === 0) illegal('Stack is empty');
    state.runner.clicks -= 1;
    const drawn = state.runner.stack.shift()!;
    state.runner.grip.push(drawn);
    addLog(state, 'runner', `Runner spent [click] to draw 1 card (${cardDef(drawn).title}).`);
  }
}
