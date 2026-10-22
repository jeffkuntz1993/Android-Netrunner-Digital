import { GameSetup } from '../core/engine/gameState';
import { SideCode } from '../core/types/card';
import { SYSTEM_GATEWAY_CARDS } from './cards';

/**
 * Playable System Gateway decks.
 *
 * The two starter decks are the official lists from the System Gateway box
 * (Null Signal Games product page). The seven faction decks are the
 * "System Gateway-only" lists from NSG's Getting Started sample decklists
 * (https://nullsignal.games/players/getting-started-sample-decklists/,
 * decks by Grey "CritHitD20" Tongue): 44-card Corp decks, 40-card Runner decks.
 */

export interface DeckList {
  id: string;
  name: string;
  side: SideCode;
  /** Identity title. */
  identity: string;
  /** Card title -> copies. */
  cards: Record<string, number>;
  /** Where the list comes from: NSG starter, NSG sample, or built by the player. */
  source: 'official starter' | 'official sample' | 'custom';
}

export const DECKS: DeckList[] = [
  {
    id: 'syndicate-starter',
    name: 'The Syndicate (starter)',
    side: 'corp',
    identity: 'The Syndicate: Profit over Principle',
    source: 'official starter',
    cards: {
      'Offworld Office': 3, 'Send a Message': 2, 'Superconducting Hub': 2,
      'Nico Campaign': 2, 'Urtica Cipher': 2, 'Regolith Mining License': 2, 'Manegarm Skunkworks': 1,
      'Brân 1.0': 2, 'Diviner': 2, 'Karunā': 2, 'Palisade': 3, 'Tithe': 2, 'Whitespace': 2,
      'Seamless Launch': 2, 'Government Subsidy': 2, 'Hedge Fund': 3,
    },
  },
  {
    id: 'catalyst-starter',
    name: 'The Catalyst (starter)',
    side: 'runner',
    identity: 'The Catalyst: Convention Breaker',
    source: 'official starter',
    cards: {
      'Tread Lightly': 2, 'Creative Commission': 2, 'VRcation': 2, 'Overclock': 2, 'Jailbreak': 3, 'Sure Gamble': 3,
      'Docklands Pass': 1, 'Pennyshaver': 1,
      'Cleaver': 2, 'Carmen': 2, 'Unity': 2, 'Mayfly': 2,
      'Red Team': 1, 'Telework Contract': 2, 'Smartware Distributor': 2, 'Verbal Plasticity': 1,
    },
  },
  {
    id: 'hb-precision-design',
    name: 'Discretion Advised',
    side: 'corp',
    identity: 'Haas-Bioroid: Precision Design',
    source: 'official sample',
    cards: {
      'Luminal Transubstantiation': 1, 'Offworld Office': 3, 'Send a Message': 3, 'Superconducting Hub': 1,
      'Nico Campaign': 3, 'Urtica Cipher': 3,
      'Government Subsidy': 3, 'Hedge Fund': 3, 'Predictive Planogram': 3, 'Seamless Launch': 2, 'Sprint': 2,
      'Manegarm Skunkworks': 2,
      'Brân 1.0': 2, 'Palisade': 3, 'Pharos': 1, 'Whitespace': 3, 'Ansel 1.0': 3, 'Tithe': 3,
    },
  },
  {
    id: 'jinteki-restoring-humanity',
    name: 'Advanced Yomi',
    side: 'corp',
    identity: 'Jinteki: Restoring Humanity',
    source: 'official sample',
    cards: {
      'Longevity Serum': 1, 'Offworld Office': 3, 'Orbital Superiority': 2, 'Send a Message': 2,
      'Clearinghouse': 3, 'Regolith Mining License': 3, 'Spin Doctor': 3, 'Urtica Cipher': 3,
      'Hansei Review': 3, 'Hedge Fund': 3,
      'Anoetic Void': 2,
      'Palisade': 3, 'Diviner': 3, 'Whitespace': 3, 'Ansel 1.0': 1, 'Karunā': 3, 'Tithe': 3,
    },
  },
  {
    id: 'nbn-reality-plus',
    name: 'Hyper Velocity',
    side: 'corp',
    identity: 'NBN: Reality Plus',
    source: 'official sample',
    cards: {
      'Orbital Superiority': 3, 'Send a Message': 3, 'Superconducting Hub': 1, 'Tomorrowʼs Headline': 1,
      'Spin Doctor': 3,
      'Hansei Review': 3, 'Hedge Fund': 3, 'Neurospike': 2, 'Predictive Planogram': 3, 'Public Trail': 3,
      'AMAZE Amusements': 2, 'Manegarm Skunkworks': 2,
      'Palisade': 3, 'Ping': 3, 'Funhouse': 3, 'Whitespace': 3, 'Tithe': 3,
    },
  },
  {
    id: 'weyland-built-to-last',
    name: 'Quick and Dirty',
    side: 'corp',
    identity: 'Weyland Consortium: Built to Last',
    source: 'official sample',
    cards: {
      'Above the Law': 1, 'Offworld Office': 3, 'Orbital Superiority': 2, 'Send a Message': 2,
      'Government Subsidy': 3, 'Hedge Fund': 3, 'Predictive Planogram': 3, 'Public Trail': 3, 'Retribution': 3, 'Sprint': 2,
      'Malapert Data Vault': 2,
      'Palisade': 3, 'Pharos': 3, 'Funhouse': 2, 'Whitespace': 3, 'Ballista': 3, 'Tithe': 3,
    },
  },
  {
    id: 'rene-arcemont',
    name: 'Party Hard',
    side: 'runner',
    identity: 'René “Loup” Arcemont: Party Animal',
    source: 'official sample',
    cards: {
      'Overclock': 3, 'Sure Gamble': 3, 'Wildcat Strike': 3,
      'Carnivore': 3, 'Docklands Pass': 2, 'DZMZ Optimizer': 3,
      'Cookbook': 3, 'Smartware Distributor': 3, 'Verbal Plasticity': 3,
      'Buzzsaw': 2, 'Carmen': 2, 'Cleaver': 2, 'Botulus': 3, 'Fermenter': 3, 'Leech': 2,
    },
  },
  {
    id: 'zahya-sadeghi',
    name: 'Stolen Goods',
    side: 'runner',
    identity: 'Zahya Sadeghi: Versatile Smuggler',
    source: 'official sample',
    cards: {
      'Jailbreak': 3, 'Mutual Favor': 2, 'Overclock': 3, 'Sure Gamble': 3, 'Tread Lightly': 3, 'VRcation': 3,
      'Docklands Pass': 2, 'Pennyshaver': 3, 'T400 Memory Diamond': 1,
      'Red Team': 3, 'Smartware Distributor': 3, 'Verbal Plasticity': 2,
      'Buzzsaw': 2, 'Carmen': 2, 'Marjanah': 2, 'Conduit': 1, 'Leech': 2,
    },
  },
  {
    id: 'tao-salonga',
    name: 'Planning Ahead',
    side: 'runner',
    identity: 'Tāo Salonga: Telepresence Magician',
    source: 'official sample',
    cards: {
      'Creative Commission': 3, 'Jailbreak': 3, 'Sure Gamble': 3, 'Tread Lightly': 2, 'VRcation': 3,
      'DZMZ Optimizer': 3, 'Pantograph': 2,
      'Smartware Distributor': 3, 'Telework Contract': 3, 'Verbal Plasticity': 2,
      'Cleaver': 2, 'Echelon': 2, 'Mayfly': 2, 'Unity': 2, 'Conduit': 2, 'Tranquilizer': 3,
    },
  },
];

const codeByTitle = new Map(SYSTEM_GATEWAY_CARDS.map(c => [c.title, c.code]));

function codeOf(title: string): string {
  const code = codeByTitle.get(title);
  if (!code) throw new Error(`Unknown card title in decklist: ${title}`);
  return code;
}

/** A built-in deck, or one of `extra` (the player's custom decks). */
export function getDeck(id: string, extra: DeckList[] = []): DeckList {
  const deck = [...DECKS, ...extra].find(d => d.id === id);
  if (!deck) throw new Error(`Unknown deck ${id}`);
  return deck;
}

/** The identity code and the card codes (one entry per copy) of a decklist. */
export function deckCodes(deck: DeckList): { identity: string; cards: string[] } {
  return {
    identity: codeOf(deck.identity),
    cards: Object.entries(deck.cards).flatMap(([title, n]) => Array<string>(n).fill(codeOf(title))),
  };
}

export const DEFAULT_CORP_DECK = 'syndicate-starter';
export const DEFAULT_RUNNER_DECK = 'catalyst-starter';

/** Game setup for two decklists (built-in deck ids, or the decks themselves). */
export function deckGameSetup(seed: number, corpDeck: string | DeckList, runnerDeck: string | DeckList): GameSetup {
  const corp = deckCodes(typeof corpDeck === 'string' ? getDeck(corpDeck) : corpDeck);
  const runner = deckCodes(typeof runnerDeck === 'string' ? getDeck(runnerDeck) : runnerDeck);
  return { seed, corpIdentity: corp.identity, corpDeck: corp.cards, runnerIdentity: runner.identity, runnerDeck: runner.cards };
}
