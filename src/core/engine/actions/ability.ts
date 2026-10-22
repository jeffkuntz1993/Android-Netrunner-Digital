import { UseAbilityAction } from '../../types/actions';
import { GameState } from '../../types/state';
import { cardDef } from '../../cards';
import { getCardScript } from '../../scripts';
import { addLog } from '../log';
import { illegal, requireActionPhase, requireClicks } from '../helpers';
import { activeCards } from '../triggers';
import { availableCredits, counters, removeCounters, removeFromGame, spendCredits, trashInstalledCard, turnFlag } from '../cardEffects';

/** Turn-flag key for a "once per turn" ability. */
export function abilityUsedKey(instanceId: string, index: number): string {
  return `ability:${instanceId}:${index}`;
}

/**
 * Uses an ability on an active card. Click abilities follow the timing of
 * click actions (controller's action phase, not during a run); other paid
 * abilities can be used whenever the controller could act.
 */
export function useAbility(state: GameState, action: UseAbilityAction): void {
  const card = activeCards(state, action.player).find(c => c.instanceId === action.cardInstanceId);
  if (!card) illegal('That card is not active');
  const ability = getCardScript(card.cardCode)?.abilities?.[action.abilityIndex];
  if (!ability) illegal('No such ability');
  const side = action.player;
  const ctx = { state, card, side };
  const title = cardDef(card).title;

  const clicks = ability.clicks ?? 0;
  if (clicks > 0) {
    requireActionPhase(state, side);
    requireClicks(state, side, clicks);
  }
  const key = abilityUsedKey(card.instanceId, action.abilityIndex);
  if (ability.oncePerTurn && turnFlag(state, key) > 0) illegal(`${title}: once per turn`);
  const credits = ability.credits ?? 0;
  if (availableCredits(state, side) < credits) illegal(`Need ${credits} credits`);
  if (ability.counters && counters(card, ability.counters.type) < ability.counters.count) {
    illegal(`${title} needs ${ability.counters.count} ${ability.counters.type} counter(s)`);
  }
  const reason = ability.canUse?.(ctx);
  if (reason) illegal(reason);

  state[side].clicks -= clicks;
  spendCredits(state, side, credits);
  if (ability.counters) removeCounters(card, ability.counters.type, ability.counters.count);
  if (ability.oncePerTurn) state.turnFlags[key] = 1;
  addLog(state, side, `${side === 'corp' ? 'Corp' : 'Runner'} used ${title}: ${ability.label}`, card.cardCode);

  ability.resolve(ctx);
  if (ability.trashSelf) trashInstalledCard(state, card);
  if (ability.removeSelfFromGame) removeFromGame(state, card);
}
