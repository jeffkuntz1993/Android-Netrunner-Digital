import { describe, it, expect } from 'vitest';
import { createRng, nextFloat, shuffleInPlace, executeAction, GameAction, GameState } from '../src/core';
import { newGame } from './helpers';

const deckOrder = (s: GameState) => ({
  hq: s.corp.hq.map(c => c.cardCode),
  rd: s.corp.rd.map(c => c.cardCode),
  grip: s.runner.grip.map(c => c.cardCode),
  stack: s.runner.stack.map(c => c.cardCode),
});

describe('Seeded RNG', () => {
  it('produces the same sequence for the same seed', () => {
    const a = createRng(42);
    const b = createRng(42);
    const seqA = Array.from({ length: 20 }, () => nextFloat(a));
    const seqB = Array.from({ length: 20 }, () => nextFloat(b));
    expect(seqA).toEqual(seqB);
    seqA.forEach(x => {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
    });
  });

  it('shuffles to a permutation of the input', () => {
    const input = Array.from({ length: 50 }, (_, i) => i);
    const shuffled = shuffleInPlace(createRng(7), [...input]);
    expect([...shuffled].sort((x, y) => x - y)).toEqual(input);
    expect(shuffled).not.toEqual(input);
  });
});

describe('Deterministic games', () => {
  it('deals identically for the same seed and differently for another', () => {
    expect(deckOrder(newGame(123))).toEqual(deckOrder(newGame(123)));
    expect(deckOrder(newGame(123))).not.toEqual(deckOrder(newGame(456)));
  });

  it('replays a sequence of actions to an identical state', () => {
    const actions: GameAction[] = [
      { type: 'GAIN_CREDIT', player: 'corp' },
      { type: 'DRAW_CARD', player: 'corp' },
      { type: 'GAIN_CREDIT', player: 'corp' },
      { type: 'END_TURN', player: 'corp' },
      { type: 'DRAW_CARD', player: 'runner' },
      { type: 'INITIATE_RUN', player: 'runner', targetServerId: 'hq' },
      { type: 'CONTINUE_RUN', player: 'runner' },
      { type: 'END_TURN', player: 'runner' },
    ];
    const play = () => actions.reduce(executeAction, newGame(99));
    expect(play()).toEqual(play());
  });

  it('keeps state plain JSON (serializable for saves, replays and multiplayer)', () => {
    const state = newGame(5);
    expect(JSON.parse(JSON.stringify(state))).toEqual(state);
    expect(state.corp.hq[0]).not.toHaveProperty('def');
  });

  it('does not mutate the input state', () => {
    const state = newGame(8);
    const snapshot = structuredClone(state);
    executeAction(state, { type: 'GAIN_CREDIT', player: 'corp' });
    expect(state).toEqual(snapshot);
  });
});
