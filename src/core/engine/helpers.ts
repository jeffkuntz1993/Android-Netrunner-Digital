import { CardInstance, SideCode } from '../types/card';
import { GameState, ServerState } from '../types/state';
import { IllegalActionError } from './errors';

export function illegal(message: string): never {
  throw new IllegalActionError(message);
}

export function requireClicks(state: GameState, side: SideCode, count = 1): void {
  if (state[side].clicks < count) illegal('Not enough clicks');
}

export function createRemoteServer(state: GameState): ServerState {
  state.corp.remoteCounter += 1;
  const id = `remote-${state.corp.remoteCounter}`;
  const server: ServerState = {
    id,
    name: `Remote Server ${state.corp.remoteCounter}`,
    isRemote: true,
    ice: [],
    root: [],
  };
  state.corp.servers[id] = server;
  return server;
}

/** Finds an installed Corp card (ice or root) by instance id. */
export function findInstalledCorpCard(
  state: GameState,
  instanceId: string
): { card: CardInstance; server: ServerState } | null {
  for (const server of Object.values(state.corp.servers)) {
    const card =
      server.ice.find(c => c.instanceId === instanceId) ??
      server.root.find(c => c.instanceId === instanceId);
    if (card) return { card, server };
  }
  return null;
}
