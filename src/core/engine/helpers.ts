import { CardInstance, SideCode } from '../types/card';
import { GameState, ServerState } from '../types/state';
import { cardDef } from '../cards';
import { IllegalActionError } from './errors';
import { addLog } from './log';

export const WINNING_SCORE = 7;

export function illegal(message: string): never {
  throw new IllegalActionError(message);
}

export function requireClicks(state: GameState, side: SideCode, count = 1): void {
  if (state[side].clicks < count) illegal('Not enough clicks');
}

/**
 * Click actions (and ending the turn) are only available to the active
 * player during their own action phase, never during a run.
 */
export function requireActionPhase(state: GameState, side: SideCode): void {
  if (state.activePlayer !== side) illegal(`It is not the ${side === 'corp' ? 'Corp' : 'Runner'}'s turn`);
  if (state.activeRun) illegal('Not allowed during a run');
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
): { card: CardInstance; server: ServerState; location: 'ice' | 'root' } | null {
  for (const server of Object.values(state.corp.servers)) {
    const ice = server.ice.find(c => c.instanceId === instanceId);
    if (ice) return { card: ice, server, location: 'ice' };
    const root = server.root.find(c => c.instanceId === instanceId);
    if (root) return { card: root, server, location: 'root' };
  }
  return null;
}

/** Finds a Corp card anywhere the Runner can access it (servers, HQ, R&D, Archives). */
export function locateCorpCard(
  state: GameState,
  instanceId: string
): { card: CardInstance; zone: CardInstance[]; inArchives: boolean } | null {
  const zones: [CardInstance[], boolean][] = [
    ...Object.values(state.corp.servers).flatMap(s => [[s.root, false], [s.ice, false]] as [CardInstance[], boolean][]),
    [state.corp.hq, false],
    [state.corp.rd, false],
    [state.corp.archives.faceUp, true],
    [state.corp.archives.faceDown, true],
  ];
  for (const [zone, inArchives] of zones) {
    const card = zone.find(c => c.instanceId === instanceId);
    if (card) return { card, zone, inArchives };
  }
  return null;
}

/** Removes a card from an array by instance id. Returns true if it was there. */
export function removeCard(cards: CardInstance[], card: CardInstance): boolean {
  const idx = cards.findIndex(c => c.instanceId === card.instanceId);
  if (idx === -1) return false;
  cards.splice(idx, 1);
  return true;
}

/** Trashes an installed Corp card to Archives (face up if it was rezzed). */
export function trashInstalledCorpCard(state: GameState, server: ServerState, card: CardInstance): void {
  removeCard(server.root, card) || removeCard(server.ice, card);
  const wasRezzed = card.isRezzed;
  card.isRezzed = false;
  card.advancementCounters = 0;
  if (wasRezzed) {
    state.corp.archives.faceUp.push(card);
  } else {
    state.corp.archives.faceDown.push(card);
  }
}

/** True if the card can receive advancement counters via the advance action. */
export function isAdvanceable(card: CardInstance): boolean {
  const def = cardDef(card);
  return def.type_code === 'agenda' || /you can advance this/i.test(def.stripped_text ?? def.text ?? '');
}

/** Ends the game if either side has reached the winning score. */
export function checkAgendaVictory(state: GameState): void {
  if (state.winner) return;
  if (state.corp.score >= WINNING_SCORE) {
    state.winner = 'corp';
    state.winReason = `Corp scored ${WINNING_SCORE} agenda points!`;
    addLog(state, 'system', `Victory: Corp has reached ${WINNING_SCORE} agenda points!`);
  } else if (state.runner.score >= WINNING_SCORE) {
    state.winner = 'runner';
    state.winReason = `Runner scored ${WINNING_SCORE} agenda points!`;
    addLog(state, 'system', `Victory: Runner reached ${WINNING_SCORE} agenda points!`);
  }
}
