import { ContinueRunAction, InitiateRunAction, JackOutAction } from '../../types/actions';
import { CardInstance } from '../../types/card';
import { GameState, RunState, ServerState } from '../../types/state';
import { cardDef } from '../../cards';
import { nextInt } from '../../rng';
import { addLog } from '../log';
import { checkAgendaVictory, illegal, locateCorpCard, removeCard, requireActionPhase, requireClicks } from '../helpers';
import { pushPrompt } from '../prompts';

export function initiateRun(state: GameState, action: InitiateRunAction): void {
  if (action.player !== 'runner') illegal('Only Runner can initiate runs');
  requireActionPhase(state, 'runner');
  requireClicks(state, 'runner');
  const targetServer = state.corp.servers[action.targetServerId];
  if (!targetServer) illegal('Invalid target server');

  state.runner.clicks -= 1;
  const iceCount = targetServer.ice.length;

  addLog(state, 'runner', `Runner initiated a run on ${targetServer.name}!`);

  state.runsThisTurn.push({ server: targetServer.id, successful: false });
  state.activeRun = {
    server: targetServer.id,
    phase: iceCount > 0 ? 'approach_ice' : 'approach_server',
    icePosition: iceCount > 0 ? iceCount - 1 : null,
    isSuccessful: false,
    isJackedOut: false,
    cannotJackOut: false,
    subroutinesToResolve: [],
    accessQueue: [],
  };
  state.phase = 'run';
}

export function continueRun(state: GameState, action: ContinueRunAction): void {
  if (action.player !== 'runner') illegal('Only the Runner can continue a run');
  const run = state.activeRun;
  if (!run) illegal('No active run');
  const server = state.corp.servers[run.server];

  if (run.phase === 'approach_ice') {
    // The Corp's rez window for this ice is before the Runner continues.
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
    state.runsThisTurn[state.runsThisTurn.length - 1].successful = true;
    addLog(state, 'runner', `Run successful on ${server.name}! Accessing cards.`);
    breachServer(state, server);
  }
}

export function jackOut(state: GameState, action: JackOutAction): void {
  if (action.player !== 'runner') illegal('Only the Runner can jack out');
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

/**
 * Queues every card the breach reaches: root cards of any server, plus
 * 1 random card from HQ, the top card of R&D, or all of Archives.
 * Candidates are fixed before anything moves, so stealing a card can't
 * cause another to be skipped. Accessing may pause on a trash prompt;
 * resolving it resumes the queue.
 */
function breachServer(state: GameState, server: ServerState): void {
  const ids = server.root.map(card => card.instanceId);

  if (server.id === 'hq' && state.corp.hq.length > 0) {
    ids.push(state.corp.hq[nextInt(state.rng, state.corp.hq.length)].instanceId);
  } else if (server.id === 'rd' && state.corp.rd.length > 0) {
    ids.push(state.corp.rd[0].instanceId);
  } else if (server.id === 'archives') {
    // Breaching Archives turns all its cards face up.
    state.corp.archives.faceUp.push(...state.corp.archives.faceDown);
    state.corp.archives.faceDown = [];
    ids.push(...state.corp.archives.faceUp.map(card => card.instanceId));
  }

  state.activeRun!.accessQueue = ids;
  continueAccess(state);
}

/** Accesses queued cards until one needs a Runner decision, then ends the run. */
export function continueAccess(state: GameState): void {
  const run = state.activeRun!;
  while (run.accessQueue.length > 0) {
    const found = locateCorpCard(state, run.accessQueue.shift()!);
    if (!found) continue;
    if (accessCard(state, found.card, found.zone, found.inArchives)) return;
    if (state.winner) return;
  }
  endRun(state);
}

/** Resolves one access. Returns true if it is waiting on a trash decision. */
function accessCard(state: GameState, card: CardInstance, zone: CardInstance[], inArchives: boolean): boolean {
  const def = cardDef(card);
  if (def.type_code !== 'agenda') {
    addLog(state, 'runner', `Runner accessed ${def.title}.`);
    const trashCost = def.trash_cost;
    if (!inArchives && trashCost !== null && trashCost !== undefined && state.runner.credits >= trashCost) {
      pushPrompt(state, {
        kind: 'access_trash',
        side: 'runner',
        cardInstanceId: card.instanceId,
        trashCost,
        message: `Runner: pay ${trashCost} [credit] to trash ${def.title}?`,
      });
      return true;
    }
    return false;
  }
  removeCard(zone, card);
  card.isRezzed = true;
  card.advancementCounters = 0;
  state.runner.scoreArea.push(card);
  const pts = def.agenda_points || 0;
  state.runner.score += pts;
  addLog(state, 'runner', `Runner accessed and stole ${def.title} for ${pts} agenda point(s)! Total: ${state.runner.score}`);
  checkAgendaVictory(state);
  return false;
}
