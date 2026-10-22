import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadCustomDecks, saveCustomDecks } from '../src/data/customDecks';
import { DeckList, getDeck } from '../src/data/decks';

function fakeStorage(initial: Record<string, string> = {}) {
  const store = { ...initial };
  vi.stubGlobal('window', {
    localStorage: {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => {
        store[k] = v;
      },
    },
  });
  return store;
}

const deck: DeckList = {
  id: 'custom-1',
  name: 'My Weyland',
  side: 'corp',
  identity: 'Weyland Consortium: Built to Last',
  cards: { 'Hedge Fund': 3, Palisade: 2 },
  source: 'custom',
};

afterEach(() => vi.unstubAllGlobals());

describe('custom decks', () => {
  it('round-trips through localStorage', () => {
    fakeStorage();
    expect(saveCustomDecks([deck])).toBe(true);
    expect(loadCustomDecks()).toEqual([deck]);
    expect(getDeck('custom-1', loadCustomDecks()).name).toBe('My Weyland');
  });

  it('drops malformed entries and decks with unknown cards', () => {
    fakeStorage({
      'netrunner.customDecks.v1': JSON.stringify([deck, { ...deck, id: 'x', cards: { 'Not A Card': 1 } }, { nope: true }, 5]),
    });
    expect(loadCustomDecks().map(d => d.id)).toEqual(['custom-1']);
  });

  it('works without storage', () => {
    vi.stubGlobal('window', {
      localStorage: {
        getItem: () => {
          throw new Error('blocked');
        },
        setItem: () => {
          throw new Error('blocked');
        },
      },
    });
    expect(loadCustomDecks()).toEqual([]);
    expect(saveCustomDecks([deck])).toBe(false);
  });
});
