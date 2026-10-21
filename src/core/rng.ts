/**
 * Seeded PRNG (mulberry32). The generator state lives inside GameState so that
 * a game is fully reproducible from its seed plus the list of actions taken,
 * and so that cloning/serializing the state also captures the RNG position.
 */
export interface RngState {
  seed: number;
  state: number;
}

export function createRng(seed: number): RngState {
  const normalized = seed >>> 0;
  return { seed: normalized, state: normalized };
}

/** Returns a float in [0, 1) and advances the generator. */
export function nextFloat(rng: RngState): number {
  rng.state = (rng.state + 0x6d2b79f5) >>> 0;
  let t = rng.state;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** Returns an integer in [0, maxExclusive). */
export function nextInt(rng: RngState, maxExclusive: number): number {
  return Math.floor(nextFloat(rng) * maxExclusive);
}

/** Fisher-Yates shuffle in place using the seeded generator. */
export function shuffleInPlace<T>(rng: RngState, array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = nextInt(rng, i + 1);
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}
