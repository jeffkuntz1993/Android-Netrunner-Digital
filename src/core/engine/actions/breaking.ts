import { BioroidBreakAction, BoostBreakerAction, BreakSubroutineAction } from '../../types/actions';
import { CardInstance } from '../../types/card';
import { EncounterState, GameState } from '../../types/state';
import { cardDef } from '../../cards';
import { addLog } from '../log';
import { illegal } from '../helpers';
import { breakerScript, breakerStrength, encounteredIce, iceStrength, iceSubtypes, isBioroid } from '../ice';

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

  if (script.breaks !== 'any' && !iceSubtypes(ice).includes(script.breaks)) {
    illegal(`${name} can only interface with ${script.breaks} ice`);
  }
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
  if (state.runner.credits < cost) illegal(`Need ${cost} credits`);
  state.runner.credits -= cost;
  for (const i of indices) encounter.broken[i] = true;
  script.onBreakUsed?.(state, breaker);
  addLog(state, 'runner', `Runner paid ${cost} [credit] to break ${indices.length} subroutine(s) on ${cardDef(ice).title} with ${name}.`);
}

export function boostBreaker(state: GameState, action: BoostBreakerAction): void {
  const { encounter } = breakWindow(state, action.player);
  const breaker = installedBreaker(state, action.breakerInstanceId);
  const script = breakerScript(breaker)!;
  if (state.runner.credits < script.boostCost) illegal(`Need ${script.boostCost} credits`);
  const amount = script.boostAmount(state, breaker);
  state.runner.credits -= script.boostCost;
  encounter.boosts[breaker.instanceId] = (encounter.boosts[breaker.instanceId] ?? 0) + amount;
  addLog(state, 'runner', `Runner paid ${script.boostCost} [credit]: ${cardDef(breaker).title} +${amount} strength (now ${breakerStrength(state, breaker)}).`);
}

/** "[Lose click]: Break 1 subroutine on this ice. Only the Runner can use this ability." */
export function bioroidBreak(state: GameState, action: BioroidBreakAction): void {
  const { encounter, ice } = breakWindow(state, action.player);
  if (!isBioroid(ice)) illegal('Only bioroid ice can be broken by spending clicks');
  if (state.runner.clicks < 1) illegal('No clicks left to lose');
  const i = action.subroutineIndex;
  if (i < 0 || i >= encounter.broken.length) illegal('No such subroutine');
  if (encounter.broken[i]) illegal('Subroutine already broken');
  state.runner.clicks -= 1;
  encounter.broken[i] = true;
  addLog(state, 'runner', `Runner lost [click] to break a subroutine on ${cardDef(ice).title}.`);
}
