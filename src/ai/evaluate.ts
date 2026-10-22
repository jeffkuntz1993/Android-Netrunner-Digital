import { CardInstance, GameState, SideCode, cardDef } from '../core';
import { breakerScript, isIcebreaker } from '../core/engine/ice';
import { counters } from '../core/engine/cardEffects';

/**
 * Board evaluation shared by both AIs, in "credit" units: a credit is worth
 * 1, a click about 1, a card in hand about 1.5 while the hand is small.
 * Scores compare positions one action apart, so only differences matter.
 */

/** Credits are worth more while a side is short of them. */
export function creditValue(credits: number): number {
  return credits + 0.6 * Math.min(Math.max(credits, 0), 6);
}

/** Value of a hand of `size` cards: the first few matter most, cards over the limit not at all. */
export function handValue(size: number, limit: number): number {
  let value = 0;
  for (let i = 0; i < size; i++) value += i < 3 ? 2 : i < limit ? 0.8 : 0;
  return value;
}

// Rough worth of an installed Runner card beyond icebreaker coverage (by card code).
const RUNNER_CARD_VALUE: Record<string, number> = {
  '30003': 3, // Carnivore
  '30004': 2, // Botulus
  '30007': 1, // Fermenter (its counters count too)
  '30008': 2.5, // Leech
  '30009': 0.5, // Cookbook
  '30013': 2.5, // Docklands Pass
  '30014': 3.5, // Pennyshaver
  '30017': 2.5, // Tranquilizer
  '30018': 1, // Red Team (hosted credits count too)
  '30022': 2.5, // DZMZ Optimizer
  '30023': 2.5, // Pantograph
  '30024': 4, // Conduit
  '30027': 1.5, // Telework Contract
  '30031': 2, // T400 Memory Diamond
  '30033': 2.5, // Smartware Distributor
  '30034': 3.5, // Verbal Plasticity
  '35010': 4, // Cacophony
  '35006': 3.5, // Bling
  '35018': 3.5, // Detente
  '35022': 2.5, // Open Market
  '35034': 2.5, // Side Hustle
};

/** Icebreaker coverage: each ice subtype the rig can break is worth a lot. */
export function rigCoverage(cards: CardInstance[]): { covered: Set<string>; anyBreakers: number } {
  const covered = new Set<string>();
  let anyBreakers = 0;
  for (const card of cards) {
    const script = breakerScript(card);
    if (!script) continue;
    if (script.breaks === 'any') anyBreakers++;
    else covered.add(script.breaks);
  }
  return { covered, anyBreakers };
}

function runnerRigValue(state: GameState): number {
  const rig = state.runner.rig;
  const cards = [...rig.programs, ...rig.hardware, ...rig.resources];
  const { covered, anyBreakers } = rigCoverage(rig.programs);
  let value = covered.size * 8 + (anyBreakers > 0 ? 2 : 0);
  for (const card of cards) {
    value += isIcebreaker(card) ? 2 : 2 * (RUNNER_CARD_VALUE[card.cardCode] ?? 2);
    value += counters(card, 'credit') * (card.cardCode === '30033' ? 0.25 : 0.6); // Smartware pays out 1 a turn
    value += counters(card, 'virus') * (card.cardCode === '30007' ? 1.5 : 0.7);
    value += (card.hostedCards?.length ?? 0) * 0.8; // Bling, Madani: cards to play later
  }
  return value;
}

// Corp cards the Runner would like to trash, and the Corp would like to keep (by card code).
const CORP_CARD_VALUE: Record<string, number> = {
  '30037': 5, // Nico Campaign
  '30071': 6, // Regolith Mining License
  '30053': 2, // Spin Doctor
  '30042': 4, // Manegarm Skunkworks
  '30050': 3, // Anoetic Void
  '30058': 2, // AMAZE Amusements
  '30066': 2, // Malapert Data Vault
  '35072': 5, // Anthill Excavation Contract
  '35040': 4, // Otto Campaign
  '35062': 3, // Public Access Plaza
  '35039': 3, // Humanoid Resources
  '35082': 3, // Mahkota Langit Grid
  '35056': 2, // Mitra Aman
  '35045': 2, // Mercia B4LL4RD
  '35051': 2, // Phật Gioan Baotixita
};

/** Worth of an installed Corp root card (assets and upgrades). */
export function corpCardValue(card: CardInstance): number {
  const hosted = counters(card, 'credit');
  if (card.isRezzed && hosted > 0) return 1 + hosted * 0.6;
  return CORP_CARD_VALUE[card.cardCode] ?? 1;
}

function corpBoardValue(state: GameState): number {
  let value = 0;
  for (const server of Object.values(state.corp.servers)) {
    for (const ice of server.ice) value += ice.isRezzed ? 1 + 0.6 * (cardDef(ice).cost ?? 0) : 1;
    for (const card of server.root) {
      const def = cardDef(card);
      if (def.type_code === 'agenda') {
        const cost = def.advancement_cost ?? 0;
        value += card.advancementCounters * 1.5 + (card.advancementCounters >= cost ? 6 : 0);
      } else {
        value += corpCardValue(card);
      }
    }
  }
  return value;
}

export function sideStrength(state: GameState, side: SideCode): number {
  if (side === 'corp') {
    const corp = state.corp;
    return (
      creditValue(corp.credits) +
      corp.clicks +
      handValue(corp.hq.length, corp.handSizeLimit) +
      8 * corp.score +
      corpBoardValue(state) +
      1.5 * state.runner.tags +
      // Dividends and Next Big Thing counters, AU Co. power counters
      1.5 * corp.scoreArea.reduce((n, a) => n + counters(a, 'agenda'), 0) +
      0.8 * counters(corp.identity, 'power')
    );
  }
  const runner = state.runner;
  return (
    creditValue(runner.credits) +
    runner.clicks +
    handValue(runner.grip.length, runner.handSizeLimit) +
    8 * runner.score -
    3 * runner.tags -
    4 * runner.coreDamage +
    runnerRigValue(state)
  );
}

/** How good the position is for `side` (mine minus theirs; a win is decisive). */
export function evaluate(state: GameState, side: SideCode): number {
  if (state.winner) return state.winner === side ? 1000 : -1000;
  const other: SideCode = side === 'corp' ? 'runner' : 'corp';
  return sideStrength(state, side) - sideStrength(state, other);
}

/**
 * How much a side would like to keep each card in hand (for discards and
 * for effects that trash, shuffle away or fetch cards).
 */
export function keepValue(state: GameState, card: CardInstance): number {
  const def = cardDef(card);
  if (def.side_code === 'corp') {
    switch (def.type_code) {
      case 'agenda':
        return 4;
      case 'ice': {
        const iceCount = Object.values(state.corp.servers).reduce((n, s) => n + s.ice.length, 0);
        return iceCount < 4 ? 3.5 : 2;
      }
      case 'operation':
        return /gain \d+/i.test(def.stripped_text ?? '') ? 2.5 : 1.5;
      case 'asset':
        return CORP_CARD_VALUE[card.cardCode] ? 2.5 : 1.5;
      default:
        return 1.2;
    }
  }
  if (isIcebreaker(card)) {
    const { covered } = rigCoverage(state.runner.rig.programs);
    const breaks = breakerScript(card)?.breaks;
    return breaks && breaks !== 'any' && !covered.has(breaks) ? 5 : 1.5;
  }
  if (def.uniqueness && [...state.runner.rig.programs, ...state.runner.rig.hardware, ...state.runner.rig.resources].some(c => c.cardCode === card.cardCode)) {
    return 0.2;
  }
  if (def.type_code === 'event') return /gain \d+/i.test(def.stripped_text ?? '') ? 3 : 2;
  return 2 + (RUNNER_CARD_VALUE[card.cardCode] ?? 2) * 0.3;
}
