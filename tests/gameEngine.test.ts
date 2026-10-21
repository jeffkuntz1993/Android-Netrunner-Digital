import { describe, it, expect } from 'vitest';
import { createInitialGameState } from '../src/core/engine/gameState';
import { executeAction } from '../src/core/engine/gameEngine';
import { CORP_STARTER_IDENTITY, RUNNER_STARTER_IDENTITY, getStarterCorpDeck, getStarterRunnerDeck } from '../src/data/starterDecks';

describe('Netrunner Rules Engine', () => {
  it('initializes game state correctly according to official rules', () => {
    const state = createInitialGameState(
      CORP_STARTER_IDENTITY,
      getStarterCorpDeck(),
      RUNNER_STARTER_IDENTITY,
      getStarterRunnerDeck()
    );

    // Turn 1 Corp starts
    expect(state.activePlayer).toBe('corp');
    expect(state.turnNumber).toBe(1);

    // Corp starting resources
    expect(state.corp.credits).toBe(5);
    expect(state.corp.clicks).toBe(3);
    expect(state.corp.hq.length).toBe(5);
    expect(state.corp.servers.hq).toBeDefined();
    expect(state.corp.servers.rd).toBeDefined();
    expect(state.corp.servers.archives).toBeDefined();

    // Runner starting resources
    expect(state.runner.credits).toBe(5);
    expect(state.runner.clicks).toBe(4);
    expect(state.runner.grip.length).toBe(5);
  });

  it('handles gaining credits via clicks', () => {
    let state = createInitialGameState(
      CORP_STARTER_IDENTITY,
      getStarterCorpDeck(),
      RUNNER_STARTER_IDENTITY,
      getStarterRunnerDeck()
    );

    state = executeAction(state, { type: 'GAIN_CREDIT', player: 'corp' });
    expect(state.corp.credits).toBe(6);
    expect(state.corp.clicks).toBe(2);
  });

  it('transitions turn from Corp to Runner properly', () => {
    let state = createInitialGameState(
      CORP_STARTER_IDENTITY,
      getStarterCorpDeck(),
      RUNNER_STARTER_IDENTITY,
      getStarterRunnerDeck()
    );

    // Corp spends 3 clicks
    state = executeAction(state, { type: 'GAIN_CREDIT', player: 'corp' });
    state = executeAction(state, { type: 'GAIN_CREDIT', player: 'corp' });
    state = executeAction(state, { type: 'GAIN_CREDIT', player: 'corp' });
    expect(state.corp.clicks).toBe(0);

    // End corp turn
    state = executeAction(state, { type: 'END_TURN', player: 'corp' });
    expect(state.activePlayer).toBe('runner');
    expect(state.phase).toBe('runner_turn');
    expect(state.runner.clicks).toBe(4);
  });

  it('allows Runner to initiate and complete a run on a central server', () => {
    let state = createInitialGameState(
      CORP_STARTER_IDENTITY,
      getStarterCorpDeck(),
      RUNNER_STARTER_IDENTITY,
      getStarterRunnerDeck()
    );

    // Pass turn to runner
    state.activePlayer = 'runner';
    state.phase = 'runner_turn';

    // Initiate run on HQ
    state = executeAction(state, { type: 'INITIATE_RUN', player: 'runner', targetServerId: 'hq' });
    expect(state.activeRun).toBeDefined();
    expect(state.activeRun?.server).toBe('hq');
    expect(state.runner.clicks).toBe(3);

    // HQ has no ice, so approach server -> access
    state = executeAction(state, { type: 'CONTINUE_RUN', player: 'runner' });
    expect(state.activeRun).toBeNull(); // Run completed
    expect(state.phase).toBe('runner_turn');
  });
});
