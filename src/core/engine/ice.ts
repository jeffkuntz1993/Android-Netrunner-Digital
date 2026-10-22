import { CardInstance } from '../types/card';
import { GameState } from '../types/state';
import { cardDef } from '../cards';
import { getCardScript } from '../scripts';
import { BreakerScript, IceScript, IceSubtype } from '../scripts/types';
import { addLog } from './log';
import { endRun } from './runEnd';
import { fireTrigger } from './triggers';

export function iceScript(ice: CardInstance): IceScript | undefined {
  return getCardScript(ice.cardCode)?.ice;
}

export function breakerScript(card: CardInstance): BreakerScript | undefined {
  return getCardScript(card.cardCode)?.breaker;
}

export function iceSubtypes(ice: CardInstance): IceSubtype[] {
  const keywords = (cardDef(ice).keywords ?? '').toLowerCase();
  return (['barrier', 'code gate', 'sentry'] as const).filter(t => keywords.includes(t));
}

export function isBioroid(ice: CardInstance): boolean {
  return /bioroid/i.test(cardDef(ice).keywords ?? '');
}

export function isIcebreaker(card: CardInstance): boolean {
  return /icebreaker/i.test(cardDef(card).keywords ?? '');
}

export function installedIcebreakers(state: GameState): CardInstance[] {
  return state.runner.rig.programs.filter(isIcebreaker);
}

export function iceStrength(state: GameState, ice: CardInstance): number {
  const encounter = state.activeRun?.encounter;
  const encounterMod = encounter?.iceId === ice.instanceId ? encounter.iceStrengthModifier : 0;
  return Math.max(0, (cardDef(ice).strength ?? 0) + (iceScript(ice)?.strengthModifier?.(state, ice) ?? 0) + encounterMod);
}

/** Current breaker strength, including boosts for the encounter in progress. */
export function breakerStrength(state: GameState, breaker: CardInstance): number {
  const base = (cardDef(breaker).strength ?? 0) + (breakerScript(breaker)?.strengthModifier?.(state, breaker) ?? 0);
  return base + (state.activeRun?.encounter?.boosts[breaker.instanceId] ?? 0);
}

/** The ice being encountered, if any. */
export function encounteredIce(state: GameState): CardInstance | undefined {
  const run = state.activeRun;
  if (!run?.encounter || run.icePosition === null) return undefined;
  return state.corp.servers[run.server].ice.find(c => c.instanceId === run.encounter!.iceId);
}

/** Starts an encounter with the approached (rezzed) ice and fires "when encountered" effects. */
export function beginEncounter(state: GameState, ice: CardInstance): void {
  const run = state.activeRun!;
  const subs = iceScript(ice)?.subroutines ?? [];
  run.phase = 'encounter_ice';
  run.encounter = { iceId: ice.instanceId, broken: subs.map(() => false), boosts: {}, resolvingIndex: null, iceStrengthModifier: 0 };
  addLog(state, 'system', `Runner encounters ${cardDef(ice).title} (strength ${iceStrength(state, ice)}).`);
  iceScript(ice)?.onEncounter?.({ state, card: ice, side: 'corp' });
}

/**
 * The Runner is done breaking: resolve unbroken subroutines in order. A
 * subroutine may queue a prompt; resolution then pauses and resumes from
 * resumeEncounter() once the prompt is answered.
 */
export function startSubroutineResolution(state: GameState): void {
  state.activeRun!.encounter!.resolvingIndex = 0;
  continueSubroutines(state);
}

/** Called after any prompt is answered, to pick up a paused encounter. */
export function resumeEncounter(state: GameState): void {
  if (state.pendingPrompts.length > 0 || state.winner) return;
  if (state.activeRun?.encounter?.resolvingIndex != null) continueSubroutines(state);
}

function continueSubroutines(state: GameState): void {
  while (true) {
    const run = state.activeRun;
    const encounter = run?.encounter;
    if (!run || !encounter || encounter.resolvingIndex === null) return; // run ended
    const ice = encounteredIce(state);
    const subs = ice ? iceScript(ice)?.subroutines ?? [] : [];
    const i = encounter.resolvingIndex;
    if (!ice || i >= subs.length) break;
    encounter.resolvingIndex = i + 1;
    if (encounter.broken[i]) continue;
    addLog(state, 'corp', `${cardDef(ice).title} subroutine fires: ${subs[i].label}`);
    subs[i].resolve({ state, card: ice, side: 'corp' });
    if (state.winner) return;
    if (state.pendingPrompts.length > 0) return; // resumes after the answer
  }
  passIce(state);
}

/** Finishes the encounter and moves inward to the next ice or the server. */
export function passIce(state: GameState): void {
  const run = state.activeRun;
  if (!run) return;
  run.encounter = null;
  run.icePassed += 1;
  if (run.icePosition! > 0) {
    run.icePosition! -= 1;
    run.phase = 'approach_ice';
  } else {
    approachServer(state);
  }
}

/** The Runner approaches the attacked server ("whenever the Runner approaches this server"). */
export function approachServer(state: GameState): void {
  const run = state.activeRun!;
  run.phase = 'approach_server';
  run.icePosition = null;
  fireTrigger(state, { type: 'approach_server', server: run.server });
}

export { endRun };
