import { CardInstance, GameState, SideCode, activePrompt, isLegalAction } from '../core';

/** Whose eyes are on the screen: one side, or both (open table, for testing). */
export type Viewer = SideCode | 'both';

/** How the screen chooses its viewer. Pass and play follows whoever has to act. */
export type ViewMode = 'open' | 'hotseat' | SideCode;

export const canSeeCorpSecrets = (viewer: Viewer) => viewer !== 'runner';
export const canSeeRunnerSecrets = (viewer: Viewer) => viewer !== 'corp';
export const canActAs = (viewer: Viewer, side: SideCode) => viewer === 'both' || viewer === side;

/**
 * The Corp's chance to rez during a run: the approached ice, or the unrezzed
 * cards in the attacked server's root once the Runner approaches the server.
 * The engine lets the Corp rez whenever it is legal; this names the moments
 * the UI stops to ask, so pass and play can hand the screen over.
 */
export interface RezWindow {
  /** Identifies this window so a "no rez" answer is remembered. */
  key: string;
  cards: CardInstance[];
}

export function corpRezWindow(state: GameState, runSerial: number): RezWindow | null {
  const run = state.activeRun;
  if (!run || state.winner || activePrompt(state)) return null;
  const server = state.corp.servers[run.server];
  if (!server) return null;
  const rezzable = (c: CardInstance) =>
    !c.isRezzed && isLegalAction(state, { type: 'REZ_CARD', player: 'corp', cardInstanceId: c.instanceId });

  let cards: CardInstance[] = [];
  if (run.phase === 'approach_ice' && run.icePosition !== null) {
    const ice = server.ice[run.icePosition];
    if (ice && rezzable(ice)) cards = [ice];
  } else if (run.phase === 'approach_server') {
    cards = server.root.filter(rezzable);
  }
  if (cards.length === 0) return null;
  return { key: `${state.turnNumber}|${runSerial}|${run.phase}|${run.icePosition}`, cards };
}

/** The side the game is waiting on, or null when the game is over. */
export function actingSide(state: GameState, rezWindowOpen: boolean): SideCode | null {
  if (state.winner) return null;
  const prompt = activePrompt(state);
  if (prompt) return prompt.side;
  if (rezWindowOpen) return 'corp';
  if (state.activeRun) return 'runner';
  return state.activePlayer;
}
