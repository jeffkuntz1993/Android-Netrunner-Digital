import { GameSetup } from '../core/engine/gameState';
import { SideCode } from '../core/types/card';
import { SYSTEM_GATEWAY_CARDS } from './cards';

/**
 * Playable System Gateway decks.
 *
 * The two starter decks are the official lists from the System Gateway box
 * (Null Signal Games product page). NSG did not publish lists for the seven
 * faction identities, so those are 40-card decks built from Gateway cards
 * only: legal for their identity (influence, agenda points, deck limits),
 * with every deck covering barrier, code gate and sentry.
 */

export interface DeckList {
  id: string;
  name: string;
  side: SideCode;
  /** Identity title. */
  identity: string;
  /** Card title -> copies. */
  cards: Record<string, number>;
  /** Official list, or built for this app. */
  source: 'official starter' | 'custom';
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
    name: 'Haas-Bioroid: Precision Design',
    side: 'corp',
    identity: 'Haas-Bioroid: Precision Design',
    source: 'custom',
    cards: {
      'Luminal Transubstantiation': 1, 'Offworld Office': 3, 'Send a Message': 2, 'Superconducting Hub': 2, 'Orbital Superiority': 1,
      'Ansel 1.0': 3, 'Brân 1.0': 3, 'Palisade': 3, 'Whitespace': 3, 'Tithe': 2,
      'Nico Campaign': 3, 'Regolith Mining License': 2, 'Manegarm Skunkworks': 2,
      'Seamless Launch': 2, 'Sprint': 2, 'Hedge Fund': 3, 'Government Subsidy': 2, 'Hansei Review': 1,
    },
  },
  {
    id: 'jinteki-restoring-humanity',
    name: 'Jinteki: Restoring Humanity',
    side: 'corp',
    identity: 'Jinteki: Restoring Humanity',
    source: 'custom',
    cards: {
      'Longevity Serum': 1, 'Offworld Office': 3, 'Send a Message': 2, 'Orbital Superiority': 2,
      'Diviner': 3, 'Karunā': 3, 'Palisade': 3, 'Tithe': 3, 'Whitespace': 2,
      'Urtica Cipher': 3, 'Anoetic Void': 3, 'Regolith Mining License': 3,
      'Hansei Review': 3, 'Neurospike': 3, 'Hedge Fund': 3,
    },
  },
  {
    id: 'nbn-reality-plus',
    name: 'NBN: Reality Plus',
    side: 'corp',
    identity: 'NBN: Reality Plus',
    source: 'custom',
    cards: {
      'Tomorrowʼs Headline': 1, 'Offworld Office': 3, 'Orbital Superiority': 3, 'Send a Message': 1, 'Superconducting Hub': 1,
      'Funhouse': 3, 'Ping': 3, 'Palisade': 3, 'Whitespace': 3, 'Tithe': 2,
      'Spin Doctor': 3, 'AMAZE Amusements': 2, 'Regolith Mining License': 3,
      'Predictive Planogram': 3, 'Public Trail': 3, 'Hedge Fund': 3,
    },
  },
  {
    id: 'weyland-built-to-last',
    name: 'Weyland Consortium: Built to Last',
    side: 'corp',
    identity: 'Weyland Consortium: Built to Last',
    source: 'custom',
    cards: {
      'Above the Law': 1, 'Offworld Office': 3, 'Send a Message': 2, 'Orbital Superiority': 2,
      'Ballista': 3, 'Pharos': 3, 'Palisade': 3, 'Whitespace': 3, 'Tithe': 2,
      'Clearinghouse': 3, 'Malapert Data Vault': 3, 'Regolith Mining License': 3,
      'Government Subsidy': 3, 'Retribution': 2, 'Hedge Fund': 3, 'Seamless Launch': 1,
    },
  },
  {
    id: 'rene-arcemont',
    name: 'René “Loup” Arcemont: Party Animal',
    side: 'runner',
    identity: 'René “Loup” Arcemont: Party Animal',
    source: 'custom',
    cards: {
      'Sure Gamble': 3, 'Jailbreak': 3, 'Wildcat Strike': 3, 'Overclock': 2,
      'Carnivore': 3, 'T400 Memory Diamond': 3,
      'Buzzsaw': 2, 'Cleaver': 2, 'Echelon': 2, 'Mayfly': 2, 'Botulus': 3, 'Fermenter': 2, 'Leech': 2,
      'Cookbook': 2, 'Smartware Distributor': 3, 'Verbal Plasticity': 3,
    },
  },
  {
    id: 'zahya-sadeghi',
    name: 'Zahya Sadeghi: Versatile Smuggler',
    side: 'runner',
    identity: 'Zahya Sadeghi: Versatile Smuggler',
    source: 'custom',
    cards: {
      'Sure Gamble': 3, 'Jailbreak': 3, 'Mutual Favor': 2, 'Tread Lightly': 2, 'Overclock': 2, 'Creative Commission': 2,
      'Docklands Pass': 2, 'Pennyshaver': 2, 'T400 Memory Diamond': 3,
      'Carmen': 3, 'Marjanah': 3, 'Unity': 2, 'Mayfly': 2,
      'Red Team': 3, 'Telework Contract': 2, 'Smartware Distributor': 2, 'Verbal Plasticity': 2,
    },
  },
  {
    id: 'tao-salonga',
    name: 'Tāo Salonga: Telepresence Magician',
    side: 'runner',
    identity: 'Tāo Salonga: Telepresence Magician',
    source: 'custom',
    cards: {
      'Sure Gamble': 3, 'Creative Commission': 3, 'VRcation': 2, 'Jailbreak': 2, 'Overclock': 2,
      'Pantograph': 3, 'DZMZ Optimizer': 3, 'T400 Memory Diamond': 2,
      'Echelon': 3, 'Unity': 3, 'Marjanah': 2, 'Mayfly': 2, 'Conduit': 2,
      'Telework Contract': 3, 'Smartware Distributor': 2, 'Verbal Plasticity': 3,
    },
  },
];

const codeByTitle = new Map(SYSTEM_GATEWAY_CARDS.map(c => [c.title, c.code]));

function codeOf(title: string): string {
  const code = codeByTitle.get(title);
  if (!code) throw new Error(`Unknown card title in decklist: ${title}`);
  return code;
}

export function getDeck(id: string): DeckList {
  const deck = DECKS.find(d => d.id === id);
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

/** Game setup for two decklists. */
export function deckGameSetup(seed: number, corpDeckId: string, runnerDeckId: string): GameSetup {
  const corp = deckCodes(getDeck(corpDeckId));
  const runner = deckCodes(getDeck(runnerDeckId));
  return { seed, corpIdentity: corp.identity, corpDeck: corp.cards, runnerIdentity: runner.identity, runnerDeck: runner.cards };
}
