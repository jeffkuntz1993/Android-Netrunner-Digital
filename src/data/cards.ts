import rawCards from './system-gateway-cards.json';
import { CardDefinition, SideCode } from '../core/types/card';

export const SYSTEM_GATEWAY_CARDS: CardDefinition[] = rawCards as unknown as CardDefinition[];

export const CARDS_BY_CODE = new Map<string, CardDefinition>(
  SYSTEM_GATEWAY_CARDS.map(c => [c.code, c])
);

export function getCardDefinition(code: string): CardDefinition {
  const card = CARDS_BY_CODE.get(code);
  if (!card) {
    throw new Error(`Card definition with code ${code} not found!`);
  }
  return card;
}

export function getCardImageUrl(code: string): string {
  // Use local fast assets from public/cards, fallback handled by img onError
  return `/cards/${code}.jpg`;
}

export function getCardBackUrl(side: SideCode = 'corp', style: 'nsg' | 'classic' = 'nsg'): string {
  return `/card-backs/${side}-${style}.png`;
}
