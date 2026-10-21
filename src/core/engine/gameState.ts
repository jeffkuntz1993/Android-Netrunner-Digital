import { CardDefinition, CardInstance } from '../types/card';
import { CorpState, GameState, RunnerRig, RunnerState, ServerState } from '../types/state';

let nextInstanceId = 1;

export function resetInstanceCounter() {
  nextInstanceId = 1;
}

export function createCardInstance(def: CardDefinition): CardInstance {
  return {
    instanceId: `inst-${nextInstanceId++}`,
    cardCode: def.code,
    def,
    isRezzed: false,
    advancementCounters: 0,
    tokens: {},
    hostedCardIds: [],
  };
}

export function shuffle<T>(array: T[], seed?: number): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function createInitialGameState(
  corpIdentityDef: CardDefinition,
  corpDeckDefs: CardDefinition[],
  runnerIdentityDef: CardDefinition,
  runnerDeckDefs: CardDefinition[]
): GameState {
  resetInstanceCounter();

  const corpIdentity = createCardInstance(corpIdentityDef);
  corpIdentity.isRezzed = true;

  const runnerIdentity = createCardInstance(runnerIdentityDef);
  runnerIdentity.isRezzed = true;

  // Build Central Servers
  const servers: Record<string, ServerState> = {
    hq: { id: 'hq', name: 'HQ', isRemote: false, ice: [], root: [] },
    rd: { id: 'rd', name: 'R&D', isRemote: false, ice: [], root: [] },
    archives: { id: 'archives', name: 'Archives', isRemote: false, ice: [], root: [] },
  };

  // Instantiate cards and shuffle decks
  const shuffledCorpDeck = shuffle(corpDeckDefs.map(createCardInstance));
  const shuffledRunnerDeck = shuffle(runnerDeckDefs.map(createCardInstance));

  // Corp draws opening hand of 5 cards
  const corpHand = shuffledCorpDeck.splice(0, 5);
  const corpState: CorpState = {
    credits: 5,
    clicks: 3,
    maxClicks: 3,
    badPublicity: 0,
    handSizeLimit: 5,
    scoreArea: [],
    score: 0,
    identity: corpIdentity,
    hq: corpHand,
    rd: shuffledCorpDeck,
    archives: { faceUp: [], faceDown: [] },
    servers,
    remoteCounter: 0,
  };

  // Runner draws opening hand of 5 cards
  const runnerHand = shuffledRunnerDeck.splice(0, 5);
  const runnerRig: RunnerRig = {
    programs: [],
    hardware: [],
    resources: [],
  };

  const runnerState: RunnerState = {
    credits: 5,
    clicks: 4,
    maxClicks: 4,
    tags: 0,
    coreDamage: 0,
    memoryUnitsTotal: 4,
    memoryUnitsUsed: 0,
    handSizeLimit: 5,
    scoreArea: [],
    score: 0,
    identity: runnerIdentity,
    grip: runnerHand,
    stack: shuffledRunnerDeck,
    heap: [],
    rig: runnerRig,
  };

  return {
    id: `game-${Date.now()}`,
    turnNumber: 1,
    activePlayer: 'corp', // Corp always goes first in Netrunner
    phase: 'corp_turn',
    corp: corpState,
    runner: runnerState,
    activeRun: null,
    winner: null,
    winReason: null,
    log: [
      {
        id: 'log-0',
        timestamp: Date.now(),
        player: 'system',
        message: 'Game started. Corp takes the first turn with 3 clicks and 5 credits.',
      },
    ],
  };
}
