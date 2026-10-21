import { createInitialGameState, createCardInstance, cardDef, executeAction, GameState, CardTypeCode } from '../src/core';
import { starterGameSetup } from '../src/data/starterDecks';

/** A starter-deck game still waiting on both mulligan decisions. */
export function newGameAtSetup(seed = 1): GameState {
  return createInitialGameState(starterGameSetup(seed));
}

/** A fresh starter-deck game where both players kept, at the start of Corp turn 1. */
export function newGame(seed = 1): GameState {
  let state = newGameAtSetup(seed);
  while (state.pendingPrompts.length > 0) {
    const p = state.pendingPrompts[0];
    state = executeAction(state, {
      type: 'RESOLVE_PROMPT',
      player: p.side,
      promptId: p.id,
      choice: { kind: 'mulligan', mulligan: false },
    });
  }
  return state;
}

/** Answers the active prompt (test shorthand). */
export function answer(state: GameState, choice: import('../src/core').PromptChoice): GameState {
  const p = state.pendingPrompts[0];
  if (!p) throw new Error('No prompt pending');
  return executeAction(state, { type: 'RESOLVE_PROMPT', player: p.side, promptId: p.id, choice });
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

/** Moves a specific card (by type) from the Corp deck into a server root or ice, bypassing costs (test setup only). */
export function installForTest(
  state: GameState,
  type: CardTypeCode,
  serverId: string,
  where: 'root' | 'ice' = type === 'ice' ? 'ice' : 'root'
): string {
  const idx = state.corp.rd.findIndex(c => cardDef(c).type_code === type);
  if (idx === -1) throw new Error(`No ${type} left in R&D`);
  const [card] = state.corp.rd.splice(idx, 1);
  if (!state.corp.servers[serverId]) {
    state.corp.servers[serverId] = { id: serverId, name: serverId, isRemote: true, ice: [], root: [] };
  }
  state.corp.servers[serverId][where].push(card);
  return card.instanceId;
}

/** Creates a new copy of a card (by code) directly in a player's hand (test setup only). */
export function giveCard(state: GameState, side: 'corp' | 'runner', code: string): string {
  const card = createCardInstance(state, code);
  (side === 'corp' ? state.corp.hq : state.runner.grip).push(card);
  return card.instanceId;
}

/** Plays a card from hand (test shorthand). */
export function play(state: GameState, side: 'corp' | 'runner', cardInstanceId: string): GameState {
  return executeAction(state, { type: 'PLAY_OPERATION_OR_EVENT', player: side, cardInstanceId });
}
