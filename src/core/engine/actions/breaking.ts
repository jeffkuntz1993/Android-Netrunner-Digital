import { BioroidBreakAction, BoostBreakerAction, BreakSubroutineAction } from '../../types/actions';
import { CardInstance } from '../../types/card';
import { EncounterState, GameState } from '../../types/state';
import { cardDef } from '../../cards';
import { addLog } from '../log';
import { availableCredits, spendCredits } from '../cardEffects';
import { illegal } from '../helpers';
import {
  addBreakerStrength,
  boostCostOf,
  breakerScript,
  breakerStrength,
  canBreakSubroutinesWith,
  encounteredIce,
  iceScript,
  iceStrength,
  iceSubtypes,
  isBioroid,
} from '../ice';

/** The encounter in its break window (before subroutines start resolving). */
function breakWindow(state: GameState, player: string): { encounter: EncounterState; ice: CardInstance } {
  if (player !== 'runner') illegal('Only the Runner can break subroutines');
  const encounter = state.activeRun?.encounter;
  const ice = encounteredIce(state);
  if (!encounter || !ice || state.activeRun?.phase !== 'encounter_ice') illegal('Not encountering ice');
  if (encounter.resolvingIndex !== null) illegal('Subroutines are already resolving');
  return { encounter, ice };
}

function installedBreaker(state: GameState, instanceId: string): CardInstance {
  const card = state.runner.rig.programs.find(c => c.instanceId === instanceId);
  if (!card || !breakerScript(card)) illegal('Not an installed icebreaker');
  return card;
}

export function breakSubroutine(state: GameState, action: BreakSubroutineAction): void {
  const { encounter, ice } = breakWindow(state, action.player);
  const breaker = installedBreaker(state, action.breakerInstanceId);
  const script = breakerScript(breaker)!;
  const name = cardDef(breaker).title;

  if (script.breaks !== 'any' && !iceSubtypes(ice, state).includes(script.breaks)) {
    illegal(`${name} can only interface with ${script.breaks} ice`);
  }
  if (!canBreakSubroutinesWith(ice, breaker)) illegal(`Only a fracter can break ${cardDef(ice).title}`);
  if (breakerStrength(state, breaker) < iceStrength(state, ice)) {
    illegal(`${name} needs strength ${iceStrength(state, ice)} (has ${breakerStrength(state, breaker)})`);
  }

  const indices = action.subroutineIndices;
  if (indices.length === 0 || indices.length > script.breakMax) {
    illegal(`${name} breaks 1${script.breakMax > 1 ? `-${script.breakMax}` : ''} subroutine(s) per use`);
  }
  if (new Set(indices).size !== indices.length) illegal('Duplicate subroutine');
  for (const i of indices) {
    if (i < 0 || i >= encounter.broken.length) illegal('No such subroutine');
    if (encounter.broken[i]) illegal('Subroutine already broken');
  }

  const cost = script.breakCost(state, breaker);
  if (availableCredits(state, 'runner') < cost) illegal(`Need ${cost} credits`);
  spendCredits(state, 'runner', cost);
  for (const i of indices) encounter.broken[i] = true;
  script.onBreakUsed?.(state, breaker);
  addLog(state, 'runner', `Runner paid ${cost} [credit] to break ${indices.length} subroutine(s) on ${cardDef(ice).title} with ${name}.`);
}

export function boostBreaker(state: GameState, action: BoostBreakerAction): void {
  breakWindow(state, action.player);
  const breaker = installedBreaker(state, action.breakerInstanceId);
  const script = breakerScript(breaker)!;
  const cost = boostCostOf(state, breaker);
  if (availableCredits(state, 'runner') < cost) illegal(`Need ${cost} credits`);
  const amount = script.boostAmount(state, breaker);
  spendCredits(state, 'runner', cost);
  addBreakerStrength(state, breaker, amount);
  addLog(state, 'runner', `Runner paid ${cost} [credit]: ${cardDef(breaker).title} +${amount} strength (now ${breakerStrength(state, breaker)}).`);
}

/**
 * An ability on the ice that only the Runner can use to break 1 of its
 * subroutines: "[Lose click]" on bioroids, or a credit cost (N-Pot).
 */
export function bioroidBreak(state: GameState, action: BioroidBreakAction): void {
  const { encounter, ice } = breakWindow(state, action.player);
  const credits = iceScript(ice)?.runnerBreakCost;
  if (credits === undefined && !isBioroid(ice)) illegal('This ice has no ability to break its subroutines');
  const i = action.subroutineIndex;
  if (i < 0 || i >= encounter.broken.length) illegal('No such subroutine');
  if (encounter.broken[i]) illegal('Subroutine already broken');
  if (credits !== undefined) {
    if (availableCredits(state, 'runner') < credits) illegal(`Need ${credits} credits`);
    spendCredits(state, 'runner', credits);
    addLog(state, 'runner', `Runner paid ${credits} [credit] to break a subroutine on ${cardDef(ice).title}.`);
  } else {
    if (state.runner.clicks < 1) illegal('No clicks left to lose');
    state.runner.clicks -= 1;
    addLog(state, 'runner', `Runner lost [click] to break a subroutine on ${cardDef(ice).title}.`);
  }
  encounter.broken[i] = true;
}
