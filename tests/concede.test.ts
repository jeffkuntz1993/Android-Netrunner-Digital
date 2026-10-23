import { describe, expect, it } from 'vitest';
import { executeAction, getLegalActions } from '../src/core';
import { newGame, newGameAtSetup } from './helpers';

describe('Conceding', () => {
  it('ends the game with the other side winning', () => {
    const state = executeAction(newGame(), { type: 'CONCEDE', player: 'corp' });
    expect(state.winner).toBe('runner');
    expect(state.winReason).toBe('Corp conceded');
    expect(state.log.at(-1)?.message).toBe('Runner wins: Corp conceded.');
  });

  it('works on the other player\'s turn and while a decision is pending', () => {
    const setup = newGameAtSetup();
    expect(setup.pendingPrompts.length).toBeGreaterThan(0);
    const state = executeAction(setup, { type: 'CONCEDE', player: 'runner' });
    expect(state.winner).toBe('corp');
    expect(getLegalActions(state, 'corp')).toEqual([]);
  });

  it('is never offered to the AI as a move', () => {
    const state = newGame();
    expect(getLegalActions(state, 'corp').some(a => a.type === 'CONCEDE')).toBe(false);
  });
});
