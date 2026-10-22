import { GameState } from '../types/state';
import { cardDef } from '../cards';
import { addLog } from './log';
import { trashInstalledRunnerCard } from './damage';
import { fireTrigger } from './triggers';
import { findCardAnywhere } from './helpers';

/** Ends the active run (successful or not) and cleans up run-scoped effects. */
export function endRun(state: GameState): void {
  const run = state.activeRun;
  if (!run) return;
  for (const id of run.trashAtRunEnd) {
    const card = state.runner.rig.programs.find(c => c.instanceId === id);
    if (card) {
      trashInstalledRunnerCard(state, card);
      addLog(state, 'runner', `${cardDef(card).title} was trashed as the run ended.`);
    }
  }
  state.activeRun = null;
  state.phase = 'runner_turn';
  const persistent = run.persistentIds.flatMap(id => findCardAnywhere(state, id) ?? []);
  fireTrigger(
    state,
    {
      type: 'run_ends',
      server: run.server,
      successful: run.isSuccessful,
      accessedCount: run.accessedCount,
      stoleAgenda: run.stoleAgenda,
    },
    persistent
  );
}

/** "End the run": the run ends unsuccessfully. */
export function endTheRun(state: GameState): void {
  if (!state.activeRun) return;
  addLog(state, 'corp', 'The run was ended.');
  endRun(state);
}
