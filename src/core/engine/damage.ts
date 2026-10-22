import { CardInstance } from '../types/card';
import { GameState } from '../types/state';
import { cardDef } from '../cards';
import { nextInt } from '../rng';
import { addLog } from './log';
import { findCardAnywhere, removeCard } from './helpers';
import { bumpTurnFlag, TurnFlag } from './cardEffects';
import { fireTrigger } from './triggers';

/**
 * Net damage: trash cards at random from the grip, one per point. If the
 * damage is more than the grip holds, the Runner is flatlined and the Corp
 * wins. Returns the trashed cards.
 * TODO (roadmap M4): meat and core damage, damage prevention.
 */
export function dealNetDamage(state: GameState, amount: number): CardInstance[] {
  const trashed: CardInstance[] = [];
  for (let i = 0; i < amount; i++) {
    if (state.runner.grip.length === 0) {
      state.winner = 'corp';
      state.winReason = 'Runner flatlined';
      addLog(state, 'system', 'Corp wins: the Runner was flatlined.');
      break;
    }
    const card = state.runner.grip[nextInt(state.rng, state.runner.grip.length)];
    removeCard(state.runner.grip, card);
    state.runner.heap.push(card);
    trashed.push(card);
  }
  if (trashed.length > 0) {
    addLog(state, 'corp', `Corp did ${amount} net damage, trashing ${trashed.map(c => cardDef(c).title).join(', ')}.`);
  }
  return trashed;
}

/** Gives the Runner tags and fires "whenever the Runner takes a tag" abilities. */
export function giveTags(state: GameState, count: number): void {
  if (count <= 0) return;
  state.runner.tags += count;
  addLog(state, 'corp', `The Runner took ${count} tag(s) (now ${state.runner.tags}).`);
  bumpTurnFlag(state, TurnFlag.tagEvents);
  fireTrigger(state, { type: 'tags_taken', count });
}

/** All installed Runner cards. */
export function installedRunnerCards(state: GameState): CardInstance[] {
  const { programs, hardware, resources } = state.runner.rig;
  return [...programs, ...hardware, ...resources];
}

/** Trashes an installed Runner card to the heap, freeing its memory if it is a program. */
export function trashInstalledRunnerCard(state: GameState, card: CardInstance): void {
  const { rig } = state.runner;
  if (removeCard(rig.programs, card)) {
    state.runner.memoryUnitsUsed -= cardDef(card).memory_cost || 0;
  } else {
    removeCard(rig.hardware, card) || removeCard(rig.resources, card);
  }
  if (card.hostedOnId) {
    const host = findCardAnywhere(state, card.hostedOnId);
    if (host) host.hostedCardIds = host.hostedCardIds.filter(id => id !== card.instanceId);
    card.hostedOnId = undefined;
  }
  card.tokens = {};
  state.runner.heap.push(card);
}
