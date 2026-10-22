import { CardScript } from './types';
import { operationScripts } from './operations';
import { eventScripts } from './events';
import { iceScripts } from './ice';
import { breakerScripts } from './breakers';

export type { CardScript, EffectContext, EffectAnswer } from './types';

const SCRIPTS: Record<string, CardScript> = {
  ...operationScripts,
  ...eventScripts,
  ...iceScripts,
  ...breakerScripts,
};

/** The script for a card code, if its abilities are implemented. */
export function getCardScript(cardCode: string): CardScript | undefined {
  return SCRIPTS[cardCode];
}

/** Card codes with scripted abilities (for docs and UI badges). */
export function scriptedCardCodes(): string[] {
  return Object.keys(SCRIPTS);
}
