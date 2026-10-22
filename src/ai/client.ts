import { CardInstance, GameAction, GameState, SideCode } from '../core';
import { Difficulty, createAgent } from './index';
import type { AIRequest, AIResponse } from './worker';

/**
 * The game's handle on the computer player: asks a background worker for
 * moves, or (where workers aren't available) computes them in place.
 */
export class AIClient {
  private worker: Worker | null = null;
  private local = null as ReturnType<typeof createAgent> | null;
  private nextId = 1;
  private pending = new Map<number, (r: AIResponse) => void>();

  constructor(side: SideCode, difficulty: Difficulty) {
    try {
      this.worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
      this.worker.onmessage = (e: MessageEvent<AIResponse>) => {
        this.pending.get(e.data.id)?.(e.data);
        this.pending.delete(e.data.id);
      };
      this.worker.postMessage({ type: 'init', side, difficulty } satisfies AIRequest);
    } catch {
      this.worker = null;
      this.local = createAgent(side, difficulty);
    }
  }

  private ask(msg: { type: 'action'; state: GameState } | { type: 'rez'; state: GameState; cards: CardInstance[] }): Promise<GameAction | null> {
    if (!this.worker) {
      const agent = this.local!;
      return Promise.resolve(msg.type === 'action' ? agent.chooseAction(msg.state) : agent.chooseRez?.(msg.state, msg.cards) ?? null);
    }
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, r => (r.error ? reject(new Error(r.error)) : resolve(r.action)));
      this.worker!.postMessage({ ...msg, id } as AIRequest);
    });
  }

  chooseAction(state: GameState): Promise<GameAction> {
    return this.ask({ type: 'action', state }) as Promise<GameAction>;
  }

  chooseRez(state: GameState, cards: CardInstance[]): Promise<GameAction | null> {
    return this.ask({ type: 'rez', state, cards });
  }

  dispose() {
    this.worker?.terminate();
    this.pending.clear();
  }
}
