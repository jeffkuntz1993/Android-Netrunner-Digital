import { ResolvePromptAction } from '../../types/actions';
import { CardInstance } from '../../types/card';
import { GameState } from '../../types/state';
import { cardDef } from '../../cards';
import { shuffleInPlace } from '../../rng';
import { addLog } from '../log';
import { illegal, locateCorpCard, removeCard } from '../helpers';
import { activePrompt, sideName } from '../prompts';
import { beginCorpTurn, finishEndTurn } from './turn';
import { continueAccess } from './run';

export function resolvePrompt(state: GameState, action: ResolvePromptAction): void {
  const prompt = activePrompt(state);
  if (!prompt || prompt.id !== action.promptId) illegal('That prompt is not waiting for an answer');
  if (prompt.side !== action.player) illegal(`Waiting on the ${sideName(prompt.side)}`);
  if (prompt.kind !== action.choice.kind) illegal('Answer does not match the prompt');

  state.pendingPrompts.shift();
  const choice = action.choice;

  switch (prompt.kind) {
    case 'mulligan': {
      if (choice.kind !== 'mulligan') return;
      if (choice.mulligan) mulligan(state, prompt.side);
      else addLog(state, prompt.side, `${sideName(prompt.side)} kept their opening hand.`);
      // Once both players have decided, the Corp's first turn begins.
      if (!state.pendingPrompts.some(p => p.kind === 'mulligan')) beginCorpTurn(state);
      return;
    }

    case 'discard': {
      if (choice.kind !== 'discard') return;
      const ids = new Set(choice.cardInstanceIds);
      const hand = prompt.side === 'corp' ? state.corp.hq : state.runner.grip;
      const chosen = hand.filter(c => ids.has(c.instanceId));
      if (ids.size !== prompt.count || chosen.length !== prompt.count) {
        illegal(`Choose exactly ${prompt.count} card(s) from your hand`);
      }
      for (const card of chosen) {
        removeCard(hand, card);
        if (prompt.side === 'corp') state.corp.archives.faceDown.push(card);
        else state.runner.heap.push(card);
      }
      addLog(
        state,
        prompt.side,
        prompt.side === 'corp'
          ? `Corp discarded ${chosen.length} card(s) to Archives.`
          : `Runner discarded ${chosen.map(c => cardDef(c).title).join(', ')}.`
      );
      finishEndTurn(state, prompt.side);
      return;
    }

    case 'access_trash': {
      if (choice.kind !== 'access_trash') return;
      if (choice.trash) {
        if (state.runner.credits < prompt.trashCost) illegal('Not enough credits to trash');
        const found = locateCorpCard(state, prompt.cardInstanceId);
        if (found) {
          state.runner.credits -= prompt.trashCost;
          trashAccessedCard(state, found.card, found.zone);
          addLog(state, 'runner', `Runner paid ${prompt.trashCost} [credit] to trash ${cardDef(found.card).title}.`);
        }
      }
      if (state.activeRun) continueAccess(state);
      return;
    }
  }
}

function trashAccessedCard(state: GameState, card: CardInstance, zone: CardInstance[]): void {
  removeCard(zone, card);
  card.isRezzed = false;
  card.advancementCounters = 0;
  // Cards trashed by the Runner go to Archives face up.
  state.corp.archives.faceUp.push(card);
}

/** Shuffles the hand back into the deck and draws 5 new cards. */
function mulligan(state: GameState, side: 'corp' | 'runner'): void {
  if (side === 'corp') {
    state.corp.rd.push(...state.corp.hq.splice(0));
    shuffleInPlace(state.rng, state.corp.rd);
    state.corp.hq = state.corp.rd.splice(0, 5);
  } else {
    state.runner.stack.push(...state.runner.grip.splice(0));
    shuffleInPlace(state.rng, state.runner.stack);
    state.runner.grip = state.runner.stack.splice(0, 5);
  }
  addLog(state, side, `${sideName(side)} took a mulligan and drew a new hand of 5.`);
}
