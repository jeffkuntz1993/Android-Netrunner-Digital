import { InstallCardAction } from '../../types/actions';
import { GameState } from '../../types/state';
import { cardDef } from '../../cards';
import { addLog } from '../log';
import { createRemoteServer, illegal, requireClicks } from '../helpers';

export function installCard(state: GameState, action: InstallCardAction): void {
  if (action.player === 'corp') {
    installCorpCard(state, action);
  } else {
    installRunnerCard(state, action);
  }
}

function installCorpCard(state: GameState, action: InstallCardAction): void {
  requireClicks(state, 'corp');
  const cardIndex = state.corp.hq.findIndex(c => c.instanceId === action.cardInstanceId);
  if (cardIndex === -1) illegal('Card not in HQ');

  const card = state.corp.hq.splice(cardIndex, 1)[0];
  state.corp.clicks -= 1;

  const server =
    action.asNewRemote || !action.targetServerId
      ? createRemoteServer(state)
      : state.corp.servers[action.targetServerId] ?? illegal('Server not found');

  if (cardDef(card).type_code === 'ice') {
    // Install cost: 1 credit per ice already protecting this server
    const installCost = server.ice.length;
    if (state.corp.credits < installCost) {
      illegal(`Need ${installCost} credits to install ice on this server`);
    }
    state.corp.credits -= installCost;
    // Outer ice is placed at the end of the array
    server.ice.push(card);
    addLog(state, 'corp', `Corp installed Ice protecting ${server.name} (cost: ${installCost} [credit]).`);
  } else {
    // Asset, Agenda, or Upgrade in server root
    server.root.push(card);
    addLog(state, 'corp', `Corp installed a card into ${server.name}.`);
  }
}

function installRunnerCard(state: GameState, action: InstallCardAction): void {
  requireClicks(state, 'runner');
  const cardIndex = state.runner.grip.findIndex(c => c.instanceId === action.cardInstanceId);
  if (cardIndex === -1) illegal('Card not in Grip');

  const card = state.runner.grip[cardIndex];
  const def = cardDef(card);
  const installCost = def.cost || 0;
  if (state.runner.credits < installCost) illegal('Not enough credits to install');

  state.runner.grip.splice(cardIndex, 1);
  state.runner.clicks -= 1;
  state.runner.credits -= installCost;
  card.isRezzed = true; // Runner cards enter the game active / face up

  if (def.type_code === 'program') {
    state.runner.memoryUnitsUsed += def.memory_cost || 0;
    state.runner.rig.programs.push(card);
  } else if (def.type_code === 'hardware') {
    state.runner.rig.hardware.push(card);
  } else if (def.type_code === 'resource') {
    state.runner.rig.resources.push(card);
  }

  addLog(state, 'runner', `Runner spent [click] and ${installCost} [credit] to install ${def.title}.`);
}
