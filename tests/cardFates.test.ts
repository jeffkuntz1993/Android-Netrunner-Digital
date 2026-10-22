import { describe, expect, it } from 'vitest';
import { cardFates } from '../src/ui/cardFates';
import { GameState } from '../src/core/types/state';
import { CardInstance } from '../src/core/types/card';

const card = (instanceId: string, cardCode = '30001'): CardInstance =>
  ({ instanceId, cardCode, isRezzed: false, advancementCounters: 0, tokens: {}, hostedCardIds: [] }) as unknown as CardInstance;

function state(over: { root?: CardInstance[]; hq?: CardInstance[]; heap?: CardInstance[]; grip?: CardInstance[]; faceUp?: CardInstance[]; faceDown?: CardInstance[]; stolen?: CardInstance[]; programs?: CardInstance[]; phase?: string } = {}): GameState {
  return {
    corp: {
      servers: { remote1: { id: 'remote1', name: 'Remote 1', root: over.root ?? [], ice: [] } },
      hq: over.hq ?? [],
      rd: [],
      archives: { faceUp: over.faceUp ?? [], faceDown: over.faceDown ?? [] },
      scoreArea: [],
    },
    runner: {
      grip: over.grip ?? [],
      heap: over.heap ?? [],
      scoreArea: over.stolen ?? [],
      rig: { programs: over.programs ?? [], hardware: [], resources: [] },
    },
    activeRun: over.phase ? { phase: over.phase } : null,
  } as unknown as GameState;
}

describe('cardFates', () => {
  it('reports a stolen agenda', () => {
    const a = card('a');
    expect(cardFates(state({ root: [a] }), state({ stolen: [a] })).map(f => f.kind)).toEqual(['stolen']);
  });

  it('reports installed cards trashed, keeping face-down Archives secret', () => {
    const asset = card('x');
    const prog = card('p');
    const fates = cardFates(state({ root: [asset], programs: [prog] }), state({ faceDown: [asset], heap: [prog] }));
    expect(fates.map(f => [f.kind, f.card.instanceId, f.corpSecret])).toEqual([
      ['trashed', 'x', true],
      ['trashed', 'p', false],
    ]);
  });

  it('reports a card trashed from HQ on access, but not a discard from hand', () => {
    const c = card('h');
    expect(cardFates(state({ hq: [c], phase: 'access' }), state({ faceUp: [c] })).map(f => f.kind)).toEqual(['trashed']);
    expect(cardFates(state({ hq: [c] }), state({ faceDown: [c] }))).toEqual([]);
    const g = card('g');
    expect(cardFates(state({ grip: [g] }), state({ heap: [g] }))).toEqual([]);
  });
});
