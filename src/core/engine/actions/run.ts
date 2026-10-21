import { ContinueRunAction, InitiateRunAction, JackOutAction } from '../../types/actions';
import { GameState, RunState, ServerState } from '../../types/state';
import { cardDef } from '../../cards';
import { addLog } from '../log';
import { illegal, requireClicks } from '../helpers';

export function initiateRun(state: GameState, action: InitiateRunAction): void {
  if (action.player !== 'runner') illegal('Only Runner can initiate runs');
  requireClicks(state, 'runner');
  const targetServer = state.corp.servers[action.targetServerId];
  if (!targetServer) illegal('Invalid target server');

  state.runner.clicks -= 1;
  const iceCount = targetServer.ice.length;

  addLog(state, 'runner', `Runner initiated a run on ${targetServer.name}!`);

  state.activeRun = {
    server: targetServer.id,
    phase: iceCount > 0 ? 'approach_ice' : 'approach_server',
    icePosition: iceCount > 0 ? iceCount - 1 : null,
    isSuccessful: false,
    isJackedOut: false,
    cannotJackOut: false,
    subroutinesToResolve: [],
  };
  state.phase = 'run';
}

export function continueRun(state: GameState, _action: ContinueRunAction): void {
  const run = state.activeRun;
  if (!run) illegal('No active run');
  const server = state.corp.servers[run.server];

  if (run.phase === 'approach_ice') {
    const currentIce = server.ice[run.icePosition!];
    if (currentIce && currentIce.isRezzed) {
      run.phase = 'encounter_ice';
      addLog(state, 'system', `Encountering rezzed Ice: ${cardDef(currentIce).title}.`);
    } else {
      addLog(state, 'runner', `Passed unrezzed Ice position ${run.icePosition! + 1}.`);
      moveInward(run);
    }
  } else if (run.phase === 'encounter_ice') {
    moveInward(run);
  } else if (run.phase === 'approach_server') {
    run.phase = 'access';
    run.isSuccessful = true;
    addLog(state, 'runner', `Run successful on ${server.name}! Accessing cards.`);
    accessServerRoot(state, server);
    endRun(state);
  }
}

export function jackOut(state: GameState, _action: JackOutAction): void {
  if (!state.activeRun) illegal('No active run');
  addLog(state, 'runner', 'Runner jacked out. Run ended unsuccessfully.');
  endRun(state);
}

/** Pass the current ice and approach the next one inward, or the server. */
function moveInward(run: RunState): void {
  if (run.icePosition! > 0) {
    run.icePosition! -= 1;
    run.phase = 'approach_ice';
  } else {
    run.phase = 'approach_server';
    run.icePosition = null;
  }
}

function endRun(state: GameState): void {
  state.activeRun = null;
  state.phase = 'runner_turn';
}

// Simple access resolution for root cards only.
// NOTE: behavior preserved from the pre-refactor engine, including known bugs
// (splicing while iterating skips cards; centrals don't access HQ/R&D/Archives).
function accessServerRoot(state: GameState, server: ServerState): void {
  for (const card of server.root) {
    const def = cardDef(card);
    if (def.type_code === 'agenda') {
      const idx = server.root.findIndex(c => c.instanceId === card.instanceId);
      server.root.splice(idx, 1);
      card.isRezzed = true;
      state.runner.scoreArea.push(card);
      const pts = def.agenda_points || 0;
      state.runner.score += pts;
      addLog(state, 'runner', `Runner accessed and stole ${def.title} for ${pts} agenda point(s)! Total: ${state.runner.score}`);

      if (state.runner.score >= 7) {
        state.winner = 'runner';
        state.winReason = 'Runner scored 7 agenda points!';
        addLog(state, 'system', 'Victory: Runner reached 7 agenda points!');
      }
    } else {
      addLog(state, 'runner', `Runner accessed ${def.title}.`);
    }
  }
}
