import { GameAction, GameActionType } from '../types/actions';
import { GameState } from '../types/state';
import { IllegalActionError, NotImplementedError } from './errors';
import { drawCard, gainCredit } from './actions/basic';
import { installCard } from './actions/install';
import { advanceCard, rezCard } from './actions/corp';
import { continueRun, initiateRun, jackOut } from './actions/run';
import { endTurn } from './actions/turn';

export { addLog } from './log';

type ActionOf<T extends GameActionType> = Extract<GameAction, { type: T }>;

/**
 * One handler per action type. A handler mutates the (already cloned) state
 * it is given, and throws IllegalActionError if the action is not legal.
 * Add new actions here; the mapped type makes a missing entry a type error.
 */
type ActionHandlers = { [T in GameActionType]: (state: GameState, action: ActionOf<T>) => void };

const notImplemented = (state: GameState, action: GameAction): void => {
  throw new NotImplementedError(action.type);
};

const handlers: ActionHandlers = {
  GAIN_CREDIT: gainCredit,
  DRAW_CARD: drawCard,
  INSTALL_CARD: installCard,
  ADVANCE_CARD: advanceCard,
  REZ_CARD: rezCard,
  INITIATE_RUN: initiateRun,
  CONTINUE_RUN: continueRun,
  JACK_OUT: jackOut,
  END_TURN: endTurn,
  PLAY_OPERATION_OR_EVENT: notImplemented,
  PURGE_VIRUS: notImplemented,
  BREAK_SUBROUTINE: notImplemented,
  ACCESS_CARD: notImplemented,
  PASS_PRIORITY: notImplemented,
};

/**
 * Applies an action and returns the next state. The input state is never
 * mutated; on an illegal action an IllegalActionError is thrown.
 */
export function executeAction(prevState: GameState, action: GameAction): GameState {
  if (prevState.winner) {
    throw new IllegalActionError('Game is already over.');
  }
  const state = structuredClone(prevState);
  const handler = handlers[action.type] as (state: GameState, action: GameAction) => void;
  if (!handler) {
    throw new IllegalActionError(`Unknown action type: ${(action as { type: string }).type}`);
  }
  handler(state, action);
  return state;
}

/** True if the action can be applied to the state without error. */
export function isLegalAction(state: GameState, action: GameAction): boolean {
  try {
    executeAction(state, action);
    return true;
  } catch (err) {
    if (err instanceof IllegalActionError) return false;
    throw err;
  }
}
