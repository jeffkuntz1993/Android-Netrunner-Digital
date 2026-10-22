import { InstallCardAction } from '../../types/actions';
import { GameState } from '../../types/state';
import { cardDef } from '../../cards';
import { getCardScript } from '../../scripts';
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
  const card = state.corp.hq.find(c => c.instanceId === action.cardInstanceId);
  if (!card) illegal('Card not in HQ');
  const newRemote = action.asNewRemote || !action.targetServerId;
  const blocker = corpInstallBlocker(state, card, newRemote ? null : action.targetServerId!, false);
  if (blocker) illegal(blocker);
  state.corp.clicks -= 1;
  installCorpCardFrom(state, card, state.corp.hq, newRemote ? null : action.targetServerId!, false);
}

/** Why the Corp can't install this card in that server (null server = new remote), or null if it can. */
export function corpInstallBlocker(state: GameState, card: CardInstance, serverId: string | null, ignoreCosts: boolean): string | null {
  const def = cardDef(card);
  if (def.type_code === 'operation') return 'Operations are played, not installed';
  const server = serverId === null ? null : state.corp.servers[serverId];
  if (serverId !== null && !server) return 'Server not found';
  if ((def.type_code === 'agenda' || def.type_code === 'asset') && server && !server.isRemote) {
    return 'Agendas and assets can only be installed in a remote server';
  }
  const cost = def.type_code === 'ice' && !ignoreCosts ? server?.ice.length ?? 0 : 0;
  if (state.corp.credits < cost) return `Need ${cost} credits to install ice on this server`;
  return null;
}

/**
 * Installs a Corp card from any zone into a server (null = new remote),
 * paying the ice install cost unless ignoring costs. No click is spent here.
 */
export function installCorpCardFrom(
  state: GameState,
  card: CardInstance,
  zone: CardInstance[],
  serverId: string | null,
  ignoreCosts: boolean
): void {
  const blocker = corpInstallBlocker(state, card, serverId, ignoreCosts);
  if (blocker) illegal(blocker);
  const def = cardDef(card);
  const installCost = def.type_code === 'ice' && !ignoreCosts && serverId ? state.corp.servers[serverId].ice.length : 0;

  removeCard(zone, card);
  card.isRezzed = false;
  card.installedTurn = turnKey(state);
  state.corp.credits -= installCost;
  const server = serverId === null ? createRemoteServer(state) : state.corp.servers[serverId];

  if (def.type_code === 'ice') {
    // Outer ice is placed at the end of the array
    server.ice.push(card);
    addLog(state, 'corp', `Corp installed Ice protecting ${server.name} (cost: ${installCost} [credit]).`);
    return;
  }

  if (def.type_code === 'agenda' || def.type_code === 'asset') {
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

/** Install cost after card-specific modifiers (e.g. Carmen's discount). */
export function runnerInstallCost(state: GameState, card: CardInstance): number {
  const modifier = getCardScript(card.cardCode)?.installCostModifier?.(state, card) ?? 0;
  return Math.max(0, (cardDef(card).cost || 0) + modifier);
}

/** Can the Runner pay to install this card right now (credits and MU)? Returns a reason if not. */
export function runnerInstallBlocker(state: GameState, card: CardInstance): string | null {
  const def = cardDef(card);
  if (state.runner.credits < runnerInstallCost(state, card)) return 'Not enough credits to install';
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
  const installCost = runnerInstallCost(state, card);
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
