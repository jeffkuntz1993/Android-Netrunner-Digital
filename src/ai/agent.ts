import { CardInstance, GameAction, GameState, SideCode } from '../core';

/**
 * A player the computer controls. The game asks it for an action whenever
 * it is that side's move: its own turn, a run in progress (Runner), or a
 * prompt it has to answer. Agents only return legal actions.
 */
export interface Agent {
  readonly side: SideCode;
  chooseAction(state: GameState): GameAction;
  /**
   * Corp only: the Runner is approaching ice or a server and these cards can
   * be rezzed. Returns a rez action, or null to let the Runner carry on.
   */
  chooseRez?(state: GameState, cards: CardInstance[]): GameAction | null;
}

/** An action with an AI's score for it (higher is better). */
export interface ScoredAction {
  action: GameAction;
  score: number;
}
