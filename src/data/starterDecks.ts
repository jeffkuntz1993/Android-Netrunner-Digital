import { GameSetup } from '../core/engine/gameState';
import { SYSTEM_GATEWAY_CARDS } from './cards';

// System Gateway teaching identities
export const CORP_STARTER_IDENTITY = '30077'; // The Syndicate
export const RUNNER_STARTER_IDENTITY = '30076'; // The Catalyst

// Extract System Gateway corp and runner cards to form default decks (card codes)
export function getStarterCorpDeck(): string[] {
  const cards = SYSTEM_GATEWAY_CARDS.filter(
    c => c.side_code === 'corp' && c.type_code !== 'identity'
  );
  // Pick a compact legal starter deck
  return cards.slice(0, 30).map(c => c.code);
}

export function getStarterRunnerDeck(): string[] {
  const cards = SYSTEM_GATEWAY_CARDS.filter(
    c => c.side_code === 'runner' && c.type_code !== 'identity'
  );
  return cards.slice(0, 30).map(c => c.code);
}

/** Setup for a game between the two starter decks. */
export function starterGameSetup(seed: number): GameSetup {
  return {
    seed,
    corpIdentity: CORP_STARTER_IDENTITY,
    corpDeck: getStarterCorpDeck(),
    runnerIdentity: RUNNER_STARTER_IDENTITY,
    runnerDeck: getStarterRunnerDeck(),
  };
}
