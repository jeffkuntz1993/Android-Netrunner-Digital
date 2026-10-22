import { describe, expect, it } from 'vitest';
import { playout } from './helpers';

describe('random playouts', () => {
  for (let seed = 1; seed <= 10; seed++) {
    it(`seed ${seed} plays 600 legal actions without errors`, () => {
      const state = playout(seed, 600);
      expect(state.turnNumber).toBeGreaterThan(1);
    });
  }
});
