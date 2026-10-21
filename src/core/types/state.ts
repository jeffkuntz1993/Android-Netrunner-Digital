import { CardInstance, SideCode } from './card';

export type CentralServerType = 'hq' | 'rd' | 'archives';
export type ServerType = CentralServerType | string; // remote names like "remote-1"

export interface ServerState {
  id: string; // 'hq', 'rd', 'archives', or 'remote-1', 'remote-2'
  name: string;
  isRemote: boolean;
  ice: CardInstance[]; // Array of installed ice, index 0 is innermost (closest to server root)
  root: CardInstance[]; // Cards installed in the root of the server (assets, agendas, upgrades)
}

export interface CorpState {
  credits: number;
  clicks: number;
  maxClicks: number;
  badPublicity: number;
  handSizeLimit: number;
  scoreArea: CardInstance[];
  score: number;
  identity: CardInstance;
  hq: CardInstance[]; // Cards in hand
  rd: CardInstance[]; // Draw deck (top of deck is index 0)
  archives: {
    faceUp: CardInstance[];
    faceDown: CardInstance[];
  };
  servers: Record<string, ServerState>;
  remoteCounter: number;
}

export interface RunnerRig {
  programs: CardInstance[];
  hardware: CardInstance[];
  resources: CardInstance[];
}

export interface RunnerState {
  credits: number;
  clicks: number;
  maxClicks: number;
  tags: number;
  coreDamage: number;
  memoryUnitsTotal: number;
  memoryUnitsUsed: number;
  handSizeLimit: number;
  scoreArea: CardInstance[];
  score: number;
  identity: CardInstance;
  grip: CardInstance[]; // Hand
  stack: CardInstance[]; // Draw deck (top of deck is index 0)
  heap: CardInstance[]; // Discard pile (face up)
  rig: RunnerRig;
}

export type RunPhase =
  | 'initiation'
  | 'approach_ice'
  | 'encounter_ice'
  | 'pass_ice'
  | 'approach_server'
  | 'access'
  | 'complete';

export interface RunState {
  server: string;
  phase: RunPhase;
  icePosition: number | null; // index into server.ice (outermost down to 0)
  isSuccessful: boolean;
  isJackedOut: boolean;
  cannotJackOut: boolean;
  subroutinesToResolve: string[];
}

export type TurnPlayer = SideCode;

export type GamePhase =
  | 'corp_turn'
  | 'runner_turn'
  | 'run'
  | 'game_over';

export interface LogEntry {
  id: string;
  timestamp: number;
  player: SideCode | 'system';
  message: string;
  cardCode?: string;
}

export interface GameState {
  id: string;
  turnNumber: number;
  activePlayer: TurnPlayer;
  phase: GamePhase;
  corp: CorpState;
  runner: RunnerState;
  activeRun: RunState | null;
  winner: SideCode | null;
  winReason: string | null;
  log: LogEntry[];
}
