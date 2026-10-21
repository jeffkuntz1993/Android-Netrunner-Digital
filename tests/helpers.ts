import { createInitialGameState, cardDef, GameState, CardTypeCode } from '../src/core';
import { starterGameSetup } from '../src/data/starterDecks';

/** A fresh starter-deck game. Same seed always gives the same deal. */
export function newGame(seed = 1): GameState {
  return createInitialGameState(starterGameSetup(seed));
}

/**
 * Moves the first card of the given type from a side's deck into its hand
 * (test setup only) and returns its instance id.
 */
export function putInHand(state: GameState, side: 'corp' | 'runner', type: CardTypeCode): string {
  const deck = side === 'corp' ? state.corp.rd : state.runner.stack;
  const hand = side === 'corp' ? state.corp.hq : state.runner.grip;
  const idx = deck.findIndex(c => cardDef(c).type_code === type);
  if (idx === -1) throw new Error(`No ${type} left in ${side} deck`);
  const [card] = deck.splice(idx, 1);
  hand.push(card);
  return card.instanceId;
}

/** Hands the turn to the Runner without going through actions (test setup only). */
export function startRunnerTurn(state: GameState): void {
  state.activePlayer = 'runner';
  state.phase = 'runner_turn';
  state.runner.clicks = state.runner.maxClicks;
}
