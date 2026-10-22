import { CardInstance, SideCode } from '../types/card';
import { EffectSource, PromptChoice } from '../types/prompts';
import { CardInstance as Card } from '../types/card';
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
  /** Ice behavior: subroutines, strength modifiers, encounter/rez triggers. */
  ice?: IceScript;
  /** Icebreaker behavior: what it breaks, costs, and strength abilities. */
  breaker?: BreakerScript;
  /** Install cost change for Runner cards (e.g. Carmen). Negative = cheaper. */
  installCostModifier?(state: GameState, card: Card): number;
}

export interface Subroutine {
  /** Short text shown in the UI. */
  label: string;
  /** Resolves the subroutine. May queue prompts; resolution resumes after they are answered. */
  resolve(ctx: EffectContext): void;
}

export interface IceScript {
  subroutines: Subroutine[];
  /** Change to printed strength (e.g. Palisade on remotes). */
  strengthModifier?(state: GameState, ice: Card): number;
  /** "When the Runner encounters this ice" (Funhouse). */
  onEncounter?(ctx: EffectContext): void;
  /** "When you rez this ice during a run against this server" (Ping). */
  onRezDuringRunOnServer?(ctx: EffectContext): void;
}

export type IceSubtype = 'barrier' | 'code gate' | 'sentry';

export interface BreakerScript {
  /** Ice subtype this breaker's interface ability works on; 'any' for AI breakers. */
  breaks: IceSubtype | 'any';
  /** Most subroutines one use of the break ability can break. */
  breakMax: number;
  breakCost(state: GameState, breaker: Card): number;
  boostCost: number;
  boostAmount(state: GameState, breaker: Card): number;
  /** Constant change to printed strength (e.g. Echelon). */
  strengthModifier?(state: GameState, breaker: Card): number;
  /** Called after the break ability is used (e.g. Mayfly's trash-at-run-end). */
  onBreakUsed?(state: GameState, breaker: Card): void;
}
