import { DrawCardAction, GainCreditAction } from '../../types/actions';
import { GameState } from '../../types/state';
import { cardDef } from '../../cards';
import { addLog } from '../log';
import { drawCards, illegal, requireActionPhase, requireClicks } from '../helpers';
import { getCardScript } from '../../scripts';
import { activeCards } from '../triggers';
import { bumpTurnFlag, TurnFlag } from '../cardEffects';

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
    // Replacement effects such as Verbal Plasticity change how many cards the basic action draws.
    const first = bumpTurnFlag(state, TurnFlag.basicDraws) === 1;
    const count = activeCards(state, 'runner').reduce(
      (n, c) => Math.max(n, (first && getCardScript(c.cardCode)?.modifiers?.firstBasicDraw) || 1),
      1
    );
    const before = state.runner.grip.length;
    drawCards(state, 'runner', count);
    const drawn = state.runner.grip.slice(before);
    addLog(state, 'runner', `Runner spent [click] to draw ${drawn.length} card(s) (${drawn.map(c => cardDef(c).title).join(', ')}).`);
  }
}
