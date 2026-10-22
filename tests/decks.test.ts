import { describe, expect, it } from 'vitest';
import { createInitialGameState, requiredAgendaPoints, validateDeck } from '../src/core';
import { DECKS, deckCodes, deckGameSetup } from '../src/data/decks';
import { playout } from './helpers';

describe('decklists', () => {
  for (const deck of DECKS) {
    it(`${deck.name} is legal`, () => {
      expect(validateDeck(deckCodes(deck))).toEqual([]);
    });
  }

  it('the official starter decks have the published sizes', () => {
    expect(deckCodes(DECKS.find(d => d.id === 'catalyst-starter')!).cards).toHaveLength(30);
    expect(deckCodes(DECKS.find(d => d.id === 'syndicate-starter')!).cards).toHaveLength(34);
  });

  it('custom faction decks are 40 cards', () => {
    for (const deck of DECKS.filter(d => d.source === 'custom')) expect(deckCodes(deck).cards).toHaveLength(40);
  });

  it('builds a game from two decklists', () => {
    const state = createInitialGameState(deckGameSetup(7, 'weyland-built-to-last', 'zahya-sadeghi'));
    expect(state.corp.hq.length + state.corp.rd.length).toBe(40);
    expect(state.runner.identity.cardCode).toBe('30010');
  });
});

describe('validateDeck', () => {
  const weyland = () => deckCodes(DECKS.find(d => d.id === 'weyland-built-to-last')!);

  it('needs 2 points per 5 cards plus 2 (or 1 more)', () => {
    expect(requiredAgendaPoints(40)).toEqual([18, 19]);
    expect(requiredAgendaPoints(45)).toEqual([20, 21]);
  });

  it('reports size, copies, side, influence, agenda points and out-of-faction agendas', () => {
    const d = weyland();
    expect(validateDeck({ ...d, cards: d.cards.slice(0, 39) }).join('|')).toMatch(/needs at least 40/);
    expect(validateDeck({ ...d, cards: [...d.cards, '30072'] }).join('|')).toMatch(/4 copies of Palisade/);
    expect(validateDeck({ ...d, cards: [...d.cards, '30030'] }).join('|')).toMatch(/Sure Gamble is a runner card/);
    expect(validateDeck({ ...d, cards: [...d.cards, '30044'] }).join('|')).toMatch(/out-of-faction agenda/);
    const heavy = [...d.cards, ...Array(3).fill('30050'), ...Array(3).fill('30049')]; // Anoetic Void 4, Neurospike 3
    expect(validateDeck({ ...d, cards: heavy }).join('|')).toMatch(/influence/);
    const noAgendas = d.cards.filter(c => !['30060', '30067', '30069', '30068'].includes(c));
    expect(validateDeck({ ...d, cards: [...noAgendas, ...Array(40 - noAgendas.length).fill('30075')] }).join('|')).toMatch(/agenda points/);
  });
});

describe('real deck playouts', () => {
  const corps = DECKS.filter(d => d.side === 'corp');
  const runners = DECKS.filter(d => d.side === 'runner');
  corps.forEach((corp, i) => {
    const runner = runners[i % runners.length];
    it(`${corp.name} vs ${runner.name} plays without errors`, () => {
      const state = playout(100 + i, 500, deckGameSetup(100 + i, corp.id, runner.id));
      expect(state.turnNumber).toBeGreaterThan(1);
    });
  });
});
