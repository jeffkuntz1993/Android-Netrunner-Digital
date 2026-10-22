import { CardInstance, GameAction, GameState, Prompt, SideCode, activePrompt, cardDef, executeAction, getLegalActions } from '../core';
import { evaluate, keepValue } from './evaluate';
import { RunOptions, RunnerMemory, runScore, serverValue } from './runs';

/** Applies an action, or returns null if the engine rejects it. */
export function simulate(state: GameState, action: GameAction): GameState | null {
  try {
    return executeAction(state, action);
  } catch {
    return null;
  }
}

const hand = (state: GameState, side: SideCode) => (side === 'corp' ? state.corp.hq : state.runner.grip);
const sumKeep = (state: GameState, cards: CardInstance[]) => cards.reduce((n, c) => n + keepValue(state, c), 0);

/**
 * Position value after an answer, from `side`'s point of view. Beyond the
 * board evaluation it counts which cards are in hand (so the AI discards
 * its least useful cards) and, for the Runner, the run still in progress.
 */
export function scoreOutcome(before: GameState, after: GameState, side: SideCode, memory?: RunnerMemory): number {
  let score = evaluate(after, side);
  score += 0.5 * (sumKeep(after, hand(after, side)) - sumKeep(before, hand(before, side)));
  if (side === 'runner' && before.activeRun) {
    const value = serverValue(before, before.activeRun.server, 0, memory) * 0.8;
    if (after.activeRun && !after.activeRun.isJackedOut) score += value;
  }
  return score;
}

function answers(state: GameState, side: SideCode): GameAction[] {
  return getLegalActions(state, side).filter(a => a.type === 'RESOLVE_PROMPT').slice(0, 200);
}

function mulligan(state: GameState, prompt: Prompt): boolean {
  const cards = hand(state, prompt.side);
  if (prompt.side === 'corp') return !cards.some(c => cardDef(c).type_code === 'ice');
  const useful = cards.some(c => /icebreaker/i.test(cardDef(c).keywords ?? '') || /gain \d+|load \d+/i.test(cardDef(c).stripped_text ?? ''));
  return !useful;
}

/** The server option ids of a "run any server" choice, if this prompt is one. */
function serverOptions(state: GameState, prompt: Prompt): string[] | null {
  if (prompt.kind !== 'effect_choice') return null;
  const ids = prompt.options.map(o => o.id);
  return ids.length > 0 && ids.every(id => state.corp.servers[id]) ? ids : null;
}

/** Run-event bonuses, by the code of the card that asks which server to run. */
export function runEventOptions(cardCode: string): RunOptions {
  switch (cardCode) {
    case '30028': // Jailbreak
      return { extraAccesses: 1 };
    case '30029': // Overclock
      return { bonusCredits: 5 };
    case '30012': // Tread Lightly
      return { rezTax: true };
    default:
      return {};
  }
}

/** Picks an answer to the active prompt, which belongs to `side`. */
export function answerPrompt(state: GameState, side: SideCode, memory?: RunnerMemory): GameAction {
  const prompt = activePrompt(state)!;
  const base = { type: 'RESOLVE_PROMPT' as const, player: side, promptId: prompt.id };

  if (prompt.kind === 'mulligan') {
    return { ...base, choice: { kind: 'mulligan', mulligan: mulligan(state, prompt) } };
  }
  if (prompt.kind === 'discard') {
    const cards = [...hand(state, side)].sort((a, b) => keepValue(state, a) - keepValue(state, b));
    return { ...base, choice: { kind: 'discard', cardInstanceIds: cards.slice(0, prompt.count).map(c => c.instanceId) } };
  }

  const servers = side === 'runner' ? serverOptions(state, prompt) : null;
  if (servers && prompt.kind === 'effect_choice') {
    const scored = servers.map(id => ({ id, score: runScore(state, id, { ...runEventOptions(prompt.source.cardCode), memory }) }));
    scored.sort((a, b) => b.score - a.score);
    return { ...base, choice: { kind: 'effect_choice', optionId: scored[0].id } };
  }

  // Everything else: try each answer and keep the best outcome.
  const options = answers(state, side);
  let best: GameAction = options[0];
  let bestScore = -Infinity;
  for (const action of options) {
    const after = simulate(state, action);
    if (!after) continue;
    const score = scoreOutcome(state, after, side, memory);
    if (score > bestScore) {
      bestScore = score;
      best = action;
    }
  }
  return best;
}
