import { ConcedeAction, EndTurnAction } from '../../types/actions';
import { SideCode } from '../../types/card';
import { GameState } from '../../types/state';
import { addLog } from '../log';
import { requireActionPhase, illegal } from '../helpers';
import { pushPrompt, sideName } from '../prompts';
import { fireTrigger } from '../triggers';
import { maxHandSize, refillRecurringCredits } from '../cardEffects';
import { flatline } from '../damage';

export function handSize(state: GameState, side: SideCode): number {
  return side === 'corp' ? state.corp.hq.length : state.runner.grip.length;
}

/** A player may concede at any time, even mid-run or while a decision is pending; the other side wins. */
export function concede(state: GameState, action: ConcedeAction): void {
  const winner: SideCode = action.player === 'corp' ? 'runner' : 'corp';
  state.winner = winner;
  state.winReason = `${sideName(action.player)} conceded`;
  addLog(state, 'system', `${sideName(winner)} wins: ${sideName(action.player)} conceded.`);
}

/**
 * Ends the action phase. The rest of the turn (discard phase, handing over)
 * is a sequence of steps that pauses whenever a card ability asks a question
 * and carries on from resumeTurn() once it is answered.
 */
export function endTurn(state: GameState, action: EndTurnAction): void {
  const side = action.player;
  requireActionPhase(state, side);
  if (state[side].clicks > 0) illegal('You must spend all clicks before ending your turn');
  if (state.turnStep) illegal('The turn is already ending');
  state.turnStep = { kind: 'end_turn', side, stage: 'action_ended' };
  fireTrigger(state, { type: 'action_phase_ends', side });
  resumeTurn(state);
}

/** Carries the end of a turn or the Corp's draw forward until a prompt needs an answer. */
export function resumeTurn(state: GameState): void {
  while (state.turnStep && state.pendingPrompts.length === 0 && !state.winner) {
    const step = state.turnStep;
    if (step.kind === 'corp_draw') {
      state.turnStep = null;
      mandatoryDraw(state);
      continue;
    }
    const side = step.side;
    switch (step.stage) {
      case 'action_ended': {
        const limit = maxHandSize(state, side);
        if (side === 'runner' && limit < 0) {
          // Core damage can push the maximum hand size below 0: the Runner is flatlined.
          state.turnStep = null;
          flatline(state);
          return;
        }
        const excess = handSize(state, side) - Math.max(0, limit);
        if (excess > 0) {
          step.stage = 'discarding';
          pushPrompt(state, {
            kind: 'discard',
            side,
            count: excess,
            message: `${sideName(side)}: discard ${excess} card(s) down to your maximum hand size of ${limit}.`,
          });
          return;
        }
        step.stage = 'discarded';
        break;
      }
      case 'discarding':
        return; // waiting on the discard prompt
      case 'discarded':
        step.stage = 'handover';
        fireTrigger(state, { type: 'discard_phase_ends', side });
        break;
      case 'handover':
        state.turnStep = null;
        handOver(state, side);
        break;
    }
  }
}

/** After the discard prompt is answered: the discard phase continues. */
export function finishDiscard(state: GameState): void {
  const step = state.turnStep;
  if (step?.kind === 'end_turn' && step.stage === 'discarding') step.stage = 'discarded';
}

/** Hands the turn to the other player. */
function handOver(state: GameState, side: SideCode): void {
  if (side === 'runner') state.runnerLastTurnRuns = state.runsThisTurn;
  state.runsThisTurn = [];
  state.turnFlags = {};
  if (side === 'corp') {
    state.activePlayer = 'runner';
    state.phase = 'runner_turn';
    state.runner.clicks = state.runner.maxClicks;
    addLog(state, 'corp', 'Corp ended turn. Runner turn begins (4 clicks).');
    refillRecurringCredits(state, 'runner');
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
  const bonus = state.corp.bonusClicksNextTurn ?? 0;
  state.corp.clicks = state.corp.maxClicks + bonus;
  state.corp.bonusClicksNextTurn = 0;
  if (bonus > 0) addLog(state, 'corp', `Corp gets ${bonus} extra [click] this turn.`);
  refillRecurringCredits(state, 'corp');
  fireTrigger(state, { type: 'turn_begins', side: 'corp' });
  if (state.winner) return;
  state.turnStep = { kind: 'corp_draw' };
  resumeTurn(state);
}

function mandatoryDraw(state: GameState): void {
  if (state.corp.rd.length === 0) {
    state.winner = 'runner';
    state.winReason = 'Corp decked out (R&D empty during mandatory draw)';
    addLog(state, 'system', 'Runner wins: Corp cannot perform mandatory draw from empty R&D.');
    return;
  }
  state.corp.hq.push(state.corp.rd.shift()!);
  addLog(state, 'corp', `Corp gained ${state.corp.clicks} clicks and drew 1 card (Mandatory Draw).`);
}
