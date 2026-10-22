import { GameState, SideCode, executeAction } from '../core';
import { actingSide, corpRezWindow } from '../ui/viewer';
import { Agent } from './agent';
import { HeuristicCorpAI } from './corpAI';
import { HeuristicRunnerAI } from './runnerAI';

export type { Agent } from './agent';
export { HeuristicCorpAI } from './corpAI';
export { HeuristicRunnerAI } from './runnerAI';

export function createAgent(side: SideCode): Agent {
  return side === 'corp' ? new HeuristicCorpAI() : new HeuristicRunnerAI();
}

export interface AIGameResult {
  state: GameState;
  steps: number;
}

/**
 * Plays a game with the computer on both sides (tests and balancing). The
 * Corp gets the same rez windows a person would: before the Runner
 * continues past approached ice, and when the Runner approaches the server.
 */
export function playAIGame(start: GameState, maxSteps = 3000, maxTurns = 80): AIGameResult {
  const agents = { corp: createAgent('corp'), runner: createAgent('runner') };
  let state = start;
  let runSerial = 0;
  const passed = new Set<string>();
  let steps = 0;
  for (; steps < maxSteps && !state.winner && state.turnNumber <= maxTurns; steps++) {
    const window = corpRezWindow(state, runSerial);
    const windowOpen = window !== null && !passed.has(window.key);
    if (windowOpen) {
      const rez = agents.corp.chooseRez?.(state, window.cards) ?? null;
      if (!rez) {
        passed.add(window.key);
        continue;
      }
      state = executeAction(state, rez);
      continue;
    }
    const side = actingSide(state, false);
    if (!side) break;
    const action = agents[side].chooseAction(state);
    const next = executeAction(state, action);
    if (!state.activeRun && next.activeRun) runSerial++;
    state = next;
  }
  return { state, steps };
}
