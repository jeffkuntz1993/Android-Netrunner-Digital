import { ContinueRunAction, InitiateRunAction, JackOutAction } from '../../types/actions';
import { CardInstance } from '../../types/card';
import { GameState, RunState, ServerState } from '../../types/state';
import { cardDef } from '../../cards';
import { nextInt } from '../../rng';
import { addLog } from '../log';
import { checkAgendaVictory, illegal, removeCard, requireActionPhase, requireClicks } from '../helpers';

export function initiateRun(state: GameState, action: InitiateRunAction): void {
  if (action.player !== 'runner') illegal('Only Runner can initiate runs');
  requireActionPhase(state, 'runner');
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
    addLog(state, 'runner', `Run successful on ${server.name}! Accessing cards.`);
    breachServer(state, server);
    endRun(state);
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

/** A card the Runner accesses, plus the zone it currently lives in. */
interface AccessCandidate {
  card: CardInstance;
  zone: CardInstance[];
}

/**
 * Accesses every card the breach reaches: root cards of any server, plus
 * 1 random card from HQ, the top card of R&D, or all of Archives.
 * Candidates are collected before anything moves, so stealing a card can't
 * cause another to be skipped.
 * TODO: trashing accessed cards (needs a Runner choice prompt).
 */
function breachServer(state: GameState, server: ServerState): void {
  const candidates: AccessCandidate[] = server.root.map(card => ({ card, zone: server.root }));

  if (server.id === 'hq' && state.corp.hq.length > 0) {
    const card = state.corp.hq[nextInt(state.rng, state.corp.hq.length)];
    candidates.push({ card, zone: state.corp.hq });
  } else if (server.id === 'rd' && state.corp.rd.length > 0) {
    candidates.push({ card: state.corp.rd[0], zone: state.corp.rd });
  } else if (server.id === 'archives') {
    // Breaching Archives turns all its cards face up.
    state.corp.archives.faceUp.push(...state.corp.archives.faceDown);
    state.corp.archives.faceDown = [];
    for (const card of state.corp.archives.faceUp) {
      candidates.push({ card, zone: state.corp.archives.faceUp });
    }
  }

  for (const { card, zone } of candidates) {
    accessCard(state, card, zone);
    if (state.winner) return;
  }
}

function accessCard(state: GameState, card: CardInstance, zone: CardInstance[]): void {
  const def = cardDef(card);
  if (def.type_code !== 'agenda') {
    addLog(state, 'runner', `Runner accessed ${def.title}.`);
    return;
  }
  removeCard(zone, card);
  card.isRezzed = true;
  card.advancementCounters = 0;
  state.runner.scoreArea.push(card);
  const pts = def.agenda_points || 0;
  state.runner.score += pts;
  addLog(state, 'runner', `Runner accessed and stole ${def.title} for ${pts} agenda point(s)! Total: ${state.runner.score}`);
  checkAgendaVictory(state);
}
