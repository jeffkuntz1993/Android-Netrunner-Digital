import { SideCode } from './card';

/**
 * A decision the game is waiting on. While any prompt is pending, the only
 * legal action is RESOLVE_PROMPT for the first prompt in the queue, made by
 * the prompt's side.
 */
export type Prompt = MulliganPrompt | DiscardPrompt | AccessTrashPrompt | EffectChoicePrompt | EffectCardsPrompt;

interface BasePrompt {
  id: string;
  side: SideCode;
  message: string;
}

/** Keep the opening hand, or shuffle it back and draw a new one. */
export interface MulliganPrompt extends BasePrompt {
  kind: 'mulligan';
}

/** Discard exactly `count` cards from hand at end of turn. */
export interface DiscardPrompt extends BasePrompt {
  kind: 'discard';
  count: number;
}

/** The Runner accessed a card with a trash cost and may pay to trash it. */
export interface AccessTrashPrompt extends BasePrompt {
  kind: 'access_trash';
  cardInstanceId: string;
  trashCost: number;
}

/**
 * Identifies the card script waiting on a prompt answer and where it is in
 * its resolution. `data` must stay plain JSON.
 */
export interface EffectSource {
  cardCode: string;
  instanceId: string;
  step: string;
  data?: Record<string, string | number | boolean | string[]>;
}

/** A card effect asks a player to pick one option. */
export interface EffectChoicePrompt extends BasePrompt {
  kind: 'effect_choice';
  options: { id: string; label: string }[];
  source: EffectSource;
}

/** A card effect asks a player to pick between `min` and `max` of the candidate cards. */
export interface EffectCardsPrompt extends BasePrompt {
  kind: 'effect_cards';
  candidateIds: string[];
  min: number;
  max: number;
  source: EffectSource;
}

export type PromptChoice =
  | { kind: 'mulligan'; mulligan: boolean }
  | { kind: 'discard'; cardInstanceIds: string[] }
  | { kind: 'access_trash'; trash: boolean }
  | { kind: 'effect_choice'; optionId: string }
  | { kind: 'effect_cards'; cardInstanceIds: string[] };
