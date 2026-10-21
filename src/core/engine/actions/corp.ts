import { AdvanceCardAction, RezCardAction } from '../../types/actions';
import { GameState } from '../../types/state';
import { cardDef } from '../../cards';
import { addLog } from '../log';
import { findInstalledCorpCard, illegal, requireClicks } from '../helpers';

export function advanceCard(state: GameState, action: AdvanceCardAction): void {
  if (action.player !== 'corp') illegal('Only Corp can advance');
  requireClicks(state, 'corp');
  if (state.corp.credits < 1) illegal('Not enough credits to advance');

  const server = state.corp.servers[action.serverId];
  if (!server) illegal('Server not found');

  const card = server.root.find(c => c.instanceId === action.cardInstanceId);
  if (!card) illegal('Card not found in server root');

  state.corp.clicks -= 1;
  state.corp.credits -= 1;
  card.advancementCounters += 1;

  addLog(state, 'corp', `Corp spent [click] and 1 [credit] to advance a card in ${server.name} (now ${card.advancementCounters} counters).`);

  // Check if it's an Agenda ready to score
  const def = cardDef(card);
  if (def.type_code === 'agenda' && def.advancement_cost && card.advancementCounters >= def.advancement_cost) {
    const cardIdx = server.root.findIndex(c => c.instanceId === card.instanceId);
    server.root.splice(cardIdx, 1);
    card.isRezzed = true;
    state.corp.scoreArea.push(card);
    const pts = def.agenda_points || 0;
    state.corp.score += pts;
    addLog(state, 'corp', `Corp scored ${def.title} for ${pts} agenda point(s)! Total: ${state.corp.score}`);

    if (state.corp.score >= 7) {
      state.winner = 'corp';
      state.winReason = 'Corp scored 7 agenda points!';
      addLog(state, 'system', 'Victory: Corp has reached 7 agenda points!');
    }
  }
}

export function rezCard(state: GameState, action: RezCardAction): void {
  if (action.player !== 'corp') illegal('Only Corp can rez cards');

  const found = findInstalledCorpCard(state, action.cardInstanceId);
  if (!found) illegal('Card to rez not found');
  const { card } = found;
  if (card.isRezzed) illegal('Card already rezzed');

  const def = cardDef(card);
  const rezCost = def.cost || 0;
  if (state.corp.credits < rezCost) illegal('Not enough credits to rez');

  state.corp.credits -= rezCost;
  card.isRezzed = true;
  addLog(state, 'corp', `Corp spent ${rezCost} [credit] to rez ${def.title}.`);
}
