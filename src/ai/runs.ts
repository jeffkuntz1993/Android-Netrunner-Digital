import { CardInstance, GameState, cardDef } from '../core';
import {
  boostCostOf,
  breakerScript,
  breakerStrength,
  iceScript,
  iceStrength,
  iceSubtypes,
  installedIcebreakers,
  isBioroid,
} from '../core/engine/ice';
import { availableCredits } from '../core/engine/cardEffects';
import { corpCardValue } from './evaluate';

/**
 * What the Runner AI knows about runs. It only reads public information:
 * rezzed ice, rezzed cards and advancement counters. Unrezzed ice and
 * unrezzed root cards are guesses.
 */

const BLOCK = Infinity;
const MAYFLY = '30032';

/** Credits-equivalent cost of letting one subroutine resolve (Infinity: it ends the run). */
export function subroutineCost(state: GameState, label: string): number {
  const runner = state.runner;
  if (/cannot steal or trash/i.test(label)) return BLOCK;
  if (/or end the run/i.test(label)) return runner.rig.programs.length > 0 ? 5 : BLOCK;
  if (/odd cost/i.test(label)) return runner.grip.length <= 1 ? BLOCK : 4; // Diviner: half the time it ends the run
  if (/6 credits or less/i.test(label)) return runner.credits - 3 <= 6 ? BLOCK : 0;
  if (/end the run/i.test(label)) return BLOCK;
  const damage = label.match(/(\d+) (net|meat) damage/i);
  if (damage) {
    const n = Number(damage[1]);
    return n >= runner.grip.length ? BLOCK : 2 * n;
  }
  if (/tag/i.test(label)) return 3;
  if (/loses? 3 credits/i.test(label)) return 3;
  if (/trash 1 installed runner card/i.test(label)) return 4;
  if (/gain 1 credit/i.test(label)) return 0.3;
  if (/install/i.test(label)) return 1.5;
  return 2;
}

export interface BreakPlan {
  breaker: CardInstance;
  /** Credits to break every subroutine in `indices`, boosts included. */
  credits: number;
  boostsNeeded: number;
}

/**
 * The cheapest installed icebreaker that can break the given subroutines of
 * this ice, counting strength boosts already bought this encounter.
 */
export function bestBreakPlan(state: GameState, ice: CardInstance, subCount: number): BreakPlan | null {
  if (subCount === 0) return null;
  const types = iceSubtypes(ice, state);
  const iceStr = iceStrength(state, ice);
  let best: BreakPlan | null = null;
  for (const breaker of installedIcebreakers(state)) {
    const script = breakerScript(breaker);
    if (!script || (script.breaks !== 'any' && !types.includes(script.breaks))) continue;
    const strength = breakerStrength(state, breaker);
    const amount = script.boostAmount(state, breaker);
    if (strength < iceStr && amount <= 0) continue;
    const boostsNeeded = Math.max(0, Math.ceil((iceStr - strength) / Math.max(amount, 1)));
    const credits =
      boostsNeeded * boostCostOf(state, breaker) +
      Math.ceil(subCount / script.breakMax) * script.breakCost(state, breaker) +
      (breaker.cardCode === MAYFLY ? 2 : 0); // Mayfly is trashed after the run
    if (!best || credits < best.credits) best = { breaker, credits, boostsNeeded };
  }
  return best;
}

/** Estimated cost to get past one piece of ice, as the Runner sees it. */
export function iceCost(state: GameState, ice: CardInstance): number {
  if (!ice.isRezzed) return state.corp.credits >= 3 ? 1.5 : 0.5;
  const subs = iceScript(ice)?.subroutines ?? [];
  let tank = subs.reduce((sum, s) => sum + subroutineCost(state, s.label), 0);
  if (ice.cardCode === '30054') tank += 3; // Funhouse: take a tag or the run ends
  const plan = bestBreakPlan(state, ice, subs.length);
  const breakCost = plan ? plan.credits + (ice.cardCode === '30054' ? 3 : 0) : BLOCK;
  const bioroid = isBioroid(ice) ? subs.length * 1.5 : BLOCK;
  return Math.min(tank, breakCost, bioroid);
}

/** Cards the Runner has already accessed (instance id -> card code), so it doesn't keep checking them. */
export type RunnerMemory = Map<string, string>;

const URTICA = '30045';

/** What accessing this server is worth to the Runner right now. */
export function serverValue(state: GameState, serverId: string, extraAccesses = 0, memory?: RunnerMemory): number {
  const server = state.corp.servers[serverId];
  if (!server) return 0;
  const priorRuns = state.runsThisTurn.filter(r => r.server === serverId);
  if (priorRuns.some(r => !r.successful)) return 0; // it stopped us once already this turn
  const repeat = priorRuns.length;

  let value = 0;
  if (serverId === 'rd') value = 3.5 + 1.5 * extraAccesses - 1 * repeat;
  else if (serverId === 'hq') value = state.corp.hq.length === 0 ? 0 : 2.8 + 1.2 * extraAccesses - 1 * repeat;
  else if (serverId === 'archives') {
    if (repeat > 0) return 0;
    const faceUpAgendas = state.corp.archives.faceUp.filter(c => cardDef(c).type_code === 'agenda').length;
    value = Math.min(3, 0.6 * state.corp.archives.faceDown.length) + 6 * faceUpAgendas;
  }
  if (repeat > 0 && server.isRemote) return 0;
  // Urtica Cipher (in Jinteki and both starter Corp decks) does 2 + counters net damage
  const trapRisk = true;
  for (const card of server.root) {
    if (!card.isRezzed && memory?.has(card.instanceId)) {
      // Seen it: only worth coming back to trash it, and never into a known trap
      if (card.cardCode === URTICA) return 0;
      const trash = cardDef(card).trash_cost;
      if (trash != null && trash <= state.runner.credits) value += Math.max(0, corpCardValue(card) - trash) * 0.6;
    } else if (!card.isRezzed) {
      if (trapRisk && card.advancementCounters === 0 && state.runner.grip.length <= 3) value -= 3; // might be a trap
      // Advanced and unrezzed: an agenda, or a trap (Urtica Cipher does 2 + counters net damage)
      if (trapRisk && card.advancementCounters > 0 && state.runner.grip.length <= 2 + card.advancementCounters) return 0;
      value += 3 + 2.5 * Math.min(card.advancementCounters, 4);
    } else {
      const trash = cardDef(card).trash_cost;
      if (trash != null && trash <= state.runner.credits) value += Math.max(0.5, corpCardValue(card) - trash) * 0.6;
    }
  }
  return value;
}

/** A remote worth running that the Runner's hand is too small to risk (draw first). */
export function needsBiggerHand(state: GameState, memory?: RunnerMemory): boolean {
  return Object.values(state.corp.servers).some(server =>
    server.root.some(
      c => !c.isRezzed && !memory?.has(c.instanceId) && c.advancementCounters > 0 && state.runner.grip.length <= 2 + c.advancementCounters
    )
  );
}

export interface RunOptions {
  bonusCredits?: number;
  extraAccesses?: number;
  /** Tread Lightly: unrezzed ice costs 3 more to rez, so it's less likely to be rezzed. */
  rezTax?: boolean;
  memory?: RunnerMemory;
}

/**
 * How good a run on this server is now, net of the click and expected costs.
 * -Infinity when the Runner can't get in.
 */
export function runScore(state: GameState, serverId: string, options: RunOptions = {}): number {
  const server = state.corp.servers[serverId];
  if (!server) return -Infinity;
  let value = serverValue(state, serverId, options.extraAccesses ?? 0, options.memory);
  if (state.runner.grip.length <= 1) value -= 2; // one net damage from flatlining
  if (value <= 0) return -Infinity;
  let known = 0;
  let expected = 0;
  for (const ice of server.ice) {
    const cost = iceCost(state, ice);
    if (cost === BLOCK) return -Infinity;
    if (ice.isRezzed) known += cost;
    expected += !ice.isRezzed && options.rezTax ? cost * 0.3 : cost;
  }
  if (known > availableCredits(state, 'runner') + (options.bonusCredits ?? 0)) return -Infinity;
  const paid = Math.max(0, expected - (options.bonusCredits ?? 0));
  return value - 0.6 * paid - 1;
}
