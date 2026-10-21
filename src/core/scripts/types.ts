import { CardInstance, SideCode } from '../types/card';
import { EffectSource, PromptChoice } from '../types/prompts';
import { GameState } from '../types/state';

export interface EffectContext {
  state: GameState;
  /** The card whose ability is resolving. */
  card: CardInstance;
  side: SideCode;
}

export type EffectAnswer = Extract<PromptChoice, { kind: 'effect_choice' | 'effect_cards' }>;

/**
 * Scripted behavior for one card, keyed by card code in the registry.
 * Hooks mutate the state directly and may queue prompts; when a prompt is
 * answered, onPromptAnswer is called with the step name the script chose.
 */
export interface CardScript {
  /** Extra play restrictions. Return a reason to forbid playing. */
  canPlay?(ctx: EffectContext): string | null;
  /** Resolves an operation or event after its costs are paid. */
  onPlay?(ctx: EffectContext): void;
  /** Continues a multi-step effect after a prompt this script queued is answered. */
  onPromptAnswer?(ctx: EffectContext, source: EffectSource, answer: EffectAnswer): void;
}
