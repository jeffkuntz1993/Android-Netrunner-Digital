import { SideCode } from './card';
import { PromptChoice } from './prompts';

export type GameActionType =
  // Basic clicks
  | 'GAIN_CREDIT'
  | 'DRAW_CARD'
  | 'INSTALL_CARD'
  | 'PLAY_OPERATION_OR_EVENT'
  | 'ADVANCE_CARD'
  | 'SCORE_AGENDA'
  | 'PURGE_VIRUS'
  | 'INITIATE_RUN'
  // Reactive / Run actions
  | 'REZ_CARD'
  | 'CONTINUE_RUN'
  | 'JACK_OUT'
  | 'BREAK_SUBROUTINE'
  | 'ACCESS_CARD'
  | 'PASS_PRIORITY'
  | 'RESOLVE_PROMPT'
  | 'END_TURN';

export interface BaseAction {
  type: GameActionType;
  player: SideCode;
}

export interface GainCreditAction extends BaseAction {
  type: 'GAIN_CREDIT';
}

export interface DrawCardAction extends BaseAction {
  type: 'DRAW_CARD';
}

export interface InstallCardAction extends BaseAction {
  type: 'INSTALL_CARD';
  cardInstanceId: string;
  targetServerId?: string; // required for Corp installs
  asNewRemote?: boolean;
}

export interface PlayOperationOrEventAction extends BaseAction {
  type: 'PLAY_OPERATION_OR_EVENT';
  cardInstanceId: string;
}

export interface AdvanceCardAction extends BaseAction {
  type: 'ADVANCE_CARD';
  cardInstanceId: string;
  serverId: string;
}

export interface ScoreAgendaAction extends BaseAction {
  type: 'SCORE_AGENDA';
  cardInstanceId: string;
}

export interface PurgeVirusAction extends BaseAction {
  type: 'PURGE_VIRUS';
}

export interface InitiateRunAction extends BaseAction {
  type: 'INITIATE_RUN';
  targetServerId: string;
}

export interface RezCardAction extends BaseAction {
  type: 'REZ_CARD';
  cardInstanceId: string;
}

export interface ContinueRunAction extends BaseAction {
  type: 'CONTINUE_RUN';
}

export interface JackOutAction extends BaseAction {
  type: 'JACK_OUT';
}

export interface BreakSubroutineAction extends BaseAction {
  type: 'BREAK_SUBROUTINE';
  subroutineIndex: number;
  breakerInstanceId: string;
}

export interface AccessCardAction extends BaseAction {
  type: 'ACCESS_CARD';
  cardInstanceId: string;
}

export interface PassPriorityAction extends BaseAction {
  type: 'PASS_PRIORITY';
}

export interface ResolvePromptAction extends BaseAction {
  type: 'RESOLVE_PROMPT';
  promptId: string;
  choice: PromptChoice;
}

export interface EndTurnAction extends BaseAction {
  type: 'END_TURN';
}

export type GameAction =
  | GainCreditAction
  | DrawCardAction
  | InstallCardAction
  | PlayOperationOrEventAction
  | AdvanceCardAction
  | ScoreAgendaAction
  | PurgeVirusAction
  | InitiateRunAction
  | RezCardAction
  | ContinueRunAction
  | JackOutAction
  | BreakSubroutineAction
  | AccessCardAction
  | PassPriorityAction
  | ResolvePromptAction
  | EndTurnAction;
