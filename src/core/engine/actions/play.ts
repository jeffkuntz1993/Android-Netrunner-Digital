import { PlayOperationOrEventAction } from '../../types/actions';
import { GameState } from '../../types/state';
import { cardDef } from '../../cards';
import { getCardScript } from '../../scripts';
import { NotImplementedError } from '../errors';
import { addLog } from '../log';
import { illegal, removeCard, requireActionPhase, requireClicks } from '../helpers';

/**
 * Basic action: spend a click and the play cost, move the card to the
 * discard pile (face up), then resolve its scripted effect.
 */
export function playOperationOrEvent(state: GameState, action: PlayOperationOrEventAction): void {
  const side = action.player;
  requireActionPhase(state, side);
  requireClicks(state, side);

  const hand = side === 'corp' ? state.corp.hq : state.runner.grip;
  const card = hand.find(c => c.instanceId === action.cardInstanceId);
  if (!card) illegal(side === 'corp' ? 'Card not in HQ' : 'Card not in Grip');

  const def = cardDef(card);
  const playable = side === 'corp' ? 'operation' : 'event';
  if (def.type_code !== playable) illegal(`Only ${playable}s can be played`);

  const script = getCardScript(card.cardCode);
  if (!script?.onPlay) throw new NotImplementedError(`${def.title} (card effect)`);

  const ctx = { state, card, side };
  const restriction = script.canPlay?.(ctx);
  if (restriction) illegal(restriction);

  const cost = def.cost || 0;
  if (state[side].credits < cost) illegal(`Need ${cost} credits to play ${def.title}`);

  state[side].clicks -= 1;
  state[side].credits -= cost;
  removeCard(hand, card);
  card.isRezzed = true;
  if (side === 'corp') state.corp.archives.faceUp.push(card);
  else state.runner.heap.push(card);

  addLog(state, side, `${side === 'corp' ? 'Corp' : 'Runner'} spent [click] and ${cost} [credit] to play ${def.title}.`, card.cardCode);
  script.onPlay(ctx);
}
