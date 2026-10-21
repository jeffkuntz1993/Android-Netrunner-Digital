import { AdvanceCardAction, RezCardAction, ScoreAgendaAction } from '../../types/actions';
import { GameState } from '../../types/state';
import { cardDef } from '../../cards';
import { addLog } from '../log';
import {
  checkAgendaVictory,
  findInstalledCorpCard,
  illegal,
  isAdvanceable,
  removeCard,
  requireActionPhase,
  requireClicks,
} from '../helpers';

export function advanceCard(state: GameState, action: AdvanceCardAction): void {
  if (action.player !== 'corp') illegal('Only Corp can advance');
  requireActionPhase(state, 'corp');
  requireClicks(state, 'corp');
  if (state.corp.credits < 1) illegal('Not enough credits to advance');

  const found = findInstalledCorpCard(state, action.cardInstanceId);
  if (!found || found.server.id !== action.serverId) illegal('Card not found in that server');
  const { card, server } = found;
  if (!isAdvanceable(card)) illegal('This card cannot be advanced');

  state.corp.clicks -= 1;
  state.corp.credits -= 1;
  card.advancementCounters += 1;

  addLog(state, 'corp', `Corp spent [click] and 1 [credit] to advance a card in ${server.name} (now ${card.advancementCounters} counters).`);
}

/** Scoring is a separate Corp choice, available in their own turn once the requirement is met. */
export function scoreAgenda(state: GameState, action: ScoreAgendaAction): void {
  if (action.player !== 'corp') illegal('Only Corp can score agendas');
  requireActionPhase(state, 'corp');

  const found = findInstalledCorpCard(state, action.cardInstanceId);
  if (!found || found.location !== 'root') illegal('Agenda not found in a server root');
  const { card, server } = found;
  const def = cardDef(card);
  if (def.type_code !== 'agenda') illegal('Only agendas can be scored');
  if (card.advancementCounters < (def.advancement_cost ?? 0)) {
    illegal(`Needs ${def.advancement_cost} advancement counters to score`);
  }

  removeCard(server.root, card);
  card.isRezzed = true;
  state.corp.scoreArea.push(card);
  const pts = def.agenda_points || 0;
  state.corp.score += pts;
  addLog(state, 'corp', `Corp scored ${def.title} for ${pts} agenda point(s)! Total: ${state.corp.score}`);
  checkAgendaVictory(state);
}

export function rezCard(state: GameState, action: RezCardAction): void {
  if (action.player !== 'corp') illegal('Only Corp can rez cards');

  const found = findInstalledCorpCard(state, action.cardInstanceId);
  if (!found) illegal('Card to rez not found');
  const { card, server, location } = found;
  if (card.isRezzed) illegal('Card already rezzed');

  const def = cardDef(card);
  if (def.type_code === 'agenda') illegal('Agendas cannot be rezzed');

  if (location === 'ice') {
    // Ice can only be rezzed while the Runner is approaching it.
    const run = state.activeRun;
    const approached =
      run && run.phase === 'approach_ice' && run.server === server.id && run.icePosition !== null
        ? server.ice[run.icePosition]
        : null;
    if (!approached || approached.instanceId !== card.instanceId) {
      illegal('Ice can only be rezzed while the Runner is approaching it');
    }
  }

  const rezCost = def.cost || 0;
  if (state.corp.credits < rezCost) illegal('Not enough credits to rez');

  state.corp.credits -= rezCost;
  card.isRezzed = true;
  addLog(state, 'corp', `Corp spent ${rezCost} [credit] to rez ${def.title}.`);
}
