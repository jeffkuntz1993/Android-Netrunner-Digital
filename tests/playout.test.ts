import { describe, expect, it } from 'vitest';
import { createInitialGameState, executeAction, getLegalActions, GameState, SideCode } from '../src/core';
import { starterGameSetup } from '../src/data/starterDecks';

/**
 * Plays whole games by picking random legal actions, to check that the
 * engine never offers an action it then rejects, never gets stuck with no
 * legal action, and never throws an unexpected error.
 */
function playout(seed: number, maxSteps: number): GameState {
  let state = createInitialGameState(starterGameSetup(seed));
  let rand = seed;
  const next = () => {
    rand = (rand * 1103515245 + 12345) % 2147483648;
    return rand / 2147483648;
  };
  for (let step = 0; step < maxSteps && !state.winner; step++) {
    const sides: SideCode[] = state.pendingPrompts.length > 0 ? [state.pendingPrompts[0].side] : [state.activePlayer];
    let actions = sides.flatMap(side => getLegalActions(state, side));
    // During a run the Corp may also rez; give it a turn sometimes.
    if (state.activeRun && state.pendingPrompts.length === 0 && next() < 0.3) {
      const corp = getLegalActions(state, 'corp');
      if (corp.length > 0) actions = corp;
    }
    // Prefer not ending turns early so games progress.
    if (actions.length === 0) throw new Error(`Seed ${seed}: no legal actions at step ${step}`);
    const action = actions[Math.floor(next() * actions.length)];
    state = executeAction(state, action);
  }
  return state;
}

describe('random playouts', () => {
  for (let seed = 1; seed <= 10; seed++) {
    it(`seed ${seed} plays 600 legal actions without errors`, () => {
      const state = playout(seed, 600);
      expect(state.turnNumber).toBeGreaterThan(1);
    });
  }
});
