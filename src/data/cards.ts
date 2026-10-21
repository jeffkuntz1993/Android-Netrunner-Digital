import { SideCode } from '../core/types/card';

export { ALL_CARDS as SYSTEM_GATEWAY_CARDS, getCardDefinition, cardDef } from '../core/cards';

export function getCardImageUrl(code: string): string {
  // Use local fast assets from public/cards, fallback handled by img onError
  return `/cards/${code}.jpg`;
}

export function getCardBackUrl(side: SideCode = 'corp', style: 'nsg' | 'classic' = 'nsg'): string {
  return `/card-backs/${side}-${style}.png`;
}
