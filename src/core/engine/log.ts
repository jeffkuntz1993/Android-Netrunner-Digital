import { GameState, LogEntry } from '../types/state';

export function addLog(state: GameState, player: LogEntry['player'], message: string, cardCode?: string): void {
  state.log.push({
    id: `log-${state.log.length}`,
    turnNumber: state.turnNumber,
    player,
    message,
    cardCode,
  });
}
