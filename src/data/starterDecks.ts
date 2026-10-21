import { CardDefinition } from '../core/types/card';
import { SYSTEM_GATEWAY_CARDS, getCardDefinition } from './cards';

// System Gateway teaching identities
export const CORP_STARTER_IDENTITY = getCardDefinition('30077'); // The Syndicate
export const RUNNER_STARTER_IDENTITY = getCardDefinition('30076'); // The Catalyst

// Extract System Gateway corp and runner cards to form default decks
export function getStarterCorpDeck(): CardDefinition[] {
  const cards = SYSTEM_GATEWAY_CARDS.filter(
    c => c.side_code === 'corp' && c.type_code !== 'identity'
  );
  // Pick a compact legal starter deck
  return cards.slice(0, 30);
}

export function getStarterRunnerDeck(): CardDefinition[] {
  const cards = SYSTEM_GATEWAY_CARDS.filter(
    c => c.side_code === 'runner' && c.type_code !== 'identity'
  );
  return cards.slice(0, 30);
}
