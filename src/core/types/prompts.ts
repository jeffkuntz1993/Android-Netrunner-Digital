import { SideCode } from './card';

/**
 * A decision the game is waiting on. While any prompt is pending, the only
 * legal action is RESOLVE_PROMPT for the first prompt in the queue, made by
 * the prompt's side.
 */
export type Prompt = MulliganPrompt | DiscardPrompt | AccessTrashPrompt;

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

export type PromptChoice =
  | { kind: 'mulligan'; mulligan: boolean }
  | { kind: 'discard'; cardInstanceIds: string[] }
  | { kind: 'access_trash'; trash: boolean };
