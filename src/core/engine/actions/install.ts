import { InstallCardAction } from '../../types/actions';
import { GameState } from '../../types/state';
import { cardDef } from '../../cards';
import { addLog } from '../log';
import { CardInstance } from '../../types/card';
import {
  createRemoteServer,
  illegal,
  removeCard,
  requireActionPhase,
  requireClicks,
  trashInstalledCorpCard,
  turnKey,
} from '../helpers';

export function installCard(state: GameState, action: InstallCardAction): void {
  requireActionPhase(state, action.player);
  requireClicks(state, action.player);
  if (action.player === 'corp') {
    installCorpCard(state, action);
  } else {
    installRunnerCard(state, action);
  }
}

function installCorpCard(state: GameState, action: InstallCardAction): void {
  const cardIndex = state.corp.hq.findIndex(c => c.instanceId === action.cardInstanceId);
  if (cardIndex === -1) illegal('Card not in HQ');
  const card = state.corp.hq[cardIndex];
  const def = cardDef(card);

  if (def.type_code === 'operation') illegal('Operations are played, not installed');

  const existing = action.asNewRemote || !action.targetServerId ? null : state.corp.servers[action.targetServerId];
  if (!(action.asNewRemote || !action.targetServerId) && !existing) illegal('Server not found');

  const isAgendaOrAsset = def.type_code === 'agenda' || def.type_code === 'asset';
  if (isAgendaOrAsset && existing && !existing.isRemote) {
    illegal('Agendas and assets can only be installed in a remote server');
  }

  // Ice install cost: 1 credit per ice already protecting the server
  const installCost = def.type_code === 'ice' ? existing?.ice.length ?? 0 : 0;
  if (state.corp.credits < installCost) {
    illegal(`Need ${installCost} credits to install ice on this server`);
  }

  state.corp.hq.splice(cardIndex, 1);
  state.corp.clicks -= 1;
  card.installedTurn = turnKey(state);
  state.corp.credits -= installCost;
  const server = existing ?? createRemoteServer(state);

  if (def.type_code === 'ice') {
    // Outer ice is placed at the end of the array
    server.ice.push(card);
    addLog(state, 'corp', `Corp installed Ice protecting ${server.name} (cost: ${installCost} [credit]).`);
    return;
  }

  if (isAgendaOrAsset) {
    // A remote holds at most one agenda or asset; the old one is trashed.
    for (const old of server.root.filter(c => ['agenda', 'asset'].includes(cardDef(c).type_code))) {
      trashInstalledCorpCard(state, server, old);
      addLog(state, 'corp', `Corp trashed a card in ${server.name} to make room.`);
    }
  }
  server.root.push(card);
  addLog(state, 'corp', `Corp installed a card into ${server.name}.`);
}

function installRunnerCard(state: GameState, action: InstallCardAction): void {
  const cardIndex = state.runner.grip.findIndex(c => c.instanceId === action.cardInstanceId);
  if (cardIndex === -1) illegal('Card not in Grip');

  const card = state.runner.grip[cardIndex];
  if (cardDef(card).type_code === 'event') illegal('Events are played, not installed');
  state.runner.clicks -= 1;
  installRunnerCardFrom(state, card, state.runner.grip);
}

/** Can the Runner pay to install this card right now (credits and MU)? Returns a reason if not. */
export function runnerInstallBlocker(state: GameState, card: CardInstance): string | null {
  const def = cardDef(card);
  if (state.runner.credits < (def.cost || 0)) return 'Not enough credits to install';
  const mem = def.type_code === 'program' ? def.memory_cost || 0 : 0;
  if (state.runner.memoryUnitsUsed + mem > state.runner.memoryUnitsTotal) {
    return 'Not enough memory units to install this program';
  }
  return null;
}

/**
 * Installs a Runner card from any zone, paying its install cost (but no
 * click). Used by the install action and by effects like Mutual Favor.
 */
export function installRunnerCardFrom(state: GameState, card: CardInstance, zone: CardInstance[]): void {
  const blocker = runnerInstallBlocker(state, card);
  if (blocker) illegal(blocker);
  const def = cardDef(card);
  const installCost = def.cost || 0;
  const mem = def.type_code === 'program' ? def.memory_cost || 0 : 0;

  removeCard(zone, card);
  state.runner.credits -= installCost;
  card.isRezzed = true; // Runner cards enter the game active / face up
  card.installedTurn = turnKey(state);

  if (def.type_code === 'program') {
    state.runner.memoryUnitsUsed += mem;
    state.runner.rig.programs.push(card);
  } else if (def.type_code === 'hardware') {
    state.runner.rig.hardware.push(card);
  } else if (def.type_code === 'resource') {
    state.runner.rig.resources.push(card);
  }

  addLog(state, 'runner', `Runner paid ${installCost} [credit] to install ${def.title}.`);
}
