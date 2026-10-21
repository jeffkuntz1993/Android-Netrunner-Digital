import { SideCode } from '../types/card';
import { EffectSource } from '../types/prompts';
import { GameState } from '../types/state';
import { pushPrompt } from '../engine/prompts';
import { EffectContext } from './types';

/** Helpers shared by card scripts. */

export function gainCredits(state: GameState, side: SideCode, amount: number): void {
  state[side].credits += amount;
}

/** "If you have any [click] remaining, lose [click]." */
export function loseClickIfAny(state: GameState, side: SideCode): void {
  if (state[side].clicks > 0) state[side].clicks -= 1;
}

export function source(ctx: EffectContext, step: string, data?: EffectSource['data']): EffectSource {
  return { cardCode: ctx.card.cardCode, instanceId: ctx.card.instanceId, step, data };
}

export function askChoice(
  ctx: EffectContext,
  side: SideCode,
  message: string,
  options: { id: string; label: string }[],
  step: string,
  data?: EffectSource['data']
): void {
  pushPrompt(ctx.state, { kind: 'effect_choice', side, message, options, source: source(ctx, step, data) });
}

export function askCards(
  ctx: EffectContext,
  side: SideCode,
  message: string,
  candidateIds: string[],
  min: number,
  max: number,
  step: string,
  data?: EffectSource['data']
): void {
  pushPrompt(ctx.state, { kind: 'effect_cards', side, message, candidateIds, min, max, source: source(ctx, step, data) });
}
