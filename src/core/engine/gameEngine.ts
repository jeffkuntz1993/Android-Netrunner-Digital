import { GameAction } from '../types/actions';
import { GameState, LogEntry, ServerState } from '../types/state';

export function addLog(state: GameState, player: 'corp' | 'runner' | 'system', message: string, cardCode?: string): void {
  state.log.push({
    id: `log-${state.log.length}`,
    timestamp: Date.now(),
    player,
    message,
    cardCode,
  });
}

export function executeAction(prevState: GameState, action: GameAction): GameState {
  // Deep clone state to maintain immutability
  const state: GameState = JSON.parse(JSON.stringify(prevState));

  if (state.winner) {
    throw new Error('Game is already over.');
  }

  const { activePlayer } = state;

  switch (action.type) {
    case 'GAIN_CREDIT': {
      if (action.player === 'corp') {
        if (state.corp.clicks < 1) throw new Error('Not enough clicks');
        state.corp.clicks -= 1;
        state.corp.credits += 1;
        addLog(state, 'corp', 'Corp spent [click] to gain 1 credit.');
      } else {
        if (state.runner.clicks < 1) throw new Error('Not enough clicks');
        state.runner.clicks -= 1;
        state.runner.credits += 1;
        addLog(state, 'runner', 'Runner spent [click] to gain 1 credit.');
      }
      break;
    }

    case 'DRAW_CARD': {
      if (action.player === 'corp') {
        if (state.corp.clicks < 1) throw new Error('Not enough clicks');
        if (state.corp.rd.length === 0) {
          state.winner = 'runner';
          state.winReason = 'Corp decked out (R&D is empty)';
          addLog(state, 'system', 'Runner wins: Corp attempted to draw from an empty R&D.');
          return state;
        }
        state.corp.clicks -= 1;
        const drawn = state.corp.rd.shift()!;
        state.corp.hq.push(drawn);
        addLog(state, 'corp', 'Corp spent [click] to draw 1 card.');
      } else {
        if (state.runner.clicks < 1) throw new Error('Not enough clicks');
        if (state.runner.stack.length === 0) {
          addLog(state, 'runner', 'Runner attempted to draw, but Stack is empty.');
          state.runner.clicks -= 1;
          return state;
        }
        state.runner.clicks -= 1;
        const drawn = state.runner.stack.shift()!;
        state.runner.grip.push(drawn);
        addLog(state, 'runner', `Runner spent [click] to draw 1 card (${drawn.def.title}).`);
      }
      break;
    }

    case 'INSTALL_CARD': {
      if (action.player === 'corp') {
        if (state.corp.clicks < 1) throw new Error('Not enough clicks');
        const cardIndex = state.corp.hq.findIndex(c => c.instanceId === action.cardInstanceId);
        if (cardIndex === -1) throw new Error('Card not in HQ');

        const card = state.corp.hq.splice(cardIndex, 1)[0];
        state.corp.clicks -= 1;

        if (card.def.type_code === 'ice') {
          // Install as Ice protecting a server
          let serverId = action.targetServerId;
          if (action.asNewRemote || !serverId) {
            state.corp.remoteCounter += 1;
            serverId = `remote-${state.corp.remoteCounter}`;
            state.corp.servers[serverId] = {
              id: serverId,
              name: `Remote Server ${state.corp.remoteCounter}`,
              isRemote: true,
              ice: [],
              root: [],
            };
          }

          const server = state.corp.servers[serverId];
          // Install cost calculation: 1 credit per existing ice on this server
          const installCost = server.ice.length;
          if (state.corp.credits < installCost) {
            throw new Error(`Need ${installCost} credits to install ice on this server`);
          }
          state.corp.credits -= installCost;
          // Outer ice is placed at the end of the array
          server.ice.push(card);
          addLog(state, 'corp', `Corp installed Ice protecting ${server.name} (cost: ${installCost} [credit]).`);
        } else {
          // Asset, Agenda, or Upgrade in server root
          let serverId = action.targetServerId;
          if (action.asNewRemote || !serverId) {
            state.corp.remoteCounter += 1;
            serverId = `remote-${state.corp.remoteCounter}`;
            state.corp.servers[serverId] = {
              id: serverId,
              name: `Remote Server ${state.corp.remoteCounter}`,
              isRemote: true,
              ice: [],
              root: [],
            };
          }
          const server = state.corp.servers[serverId];
          server.root.push(card);
          addLog(state, 'corp', `Corp installed a card into ${server.name}.`);
        }
      } else {
        // Runner installs program, hardware, or resource
        if (state.runner.clicks < 1) throw new Error('Not enough clicks');
        const cardIndex = state.runner.grip.findIndex(c => c.instanceId === action.cardInstanceId);
        if (cardIndex === -1) throw new Error('Card not in Grip');

        const card = state.runner.grip[cardIndex];
        const installCost = card.def.cost || 0;
        if (state.runner.credits < installCost) throw new Error('Not enough credits to install');

        state.runner.grip.splice(cardIndex, 1);
        state.runner.clicks -= 1;
        state.runner.credits -= installCost;
        card.isRezzed = true; // Runner cards enter the game active / face up

        if (card.def.type_code === 'program') {
          const mem = card.def.memory_cost || 0;
          state.runner.memoryUnitsUsed += mem;
          state.runner.rig.programs.push(card);
        } else if (card.def.type_code === 'hardware') {
          state.runner.rig.hardware.push(card);
        } else if (card.def.type_code === 'resource') {
          state.runner.rig.resources.push(card);
        }

        addLog(state, 'runner', `Runner spent [click] and ${installCost} [credit] to install ${card.def.title}.`);
      }
      break;
    }

    case 'ADVANCE_CARD': {
      if (action.player !== 'corp') throw new Error('Only Corp can advance');
      if (state.corp.clicks < 1) throw new Error('Not enough clicks');
      if (state.corp.credits < 1) throw new Error('Not enough credits to advance');

      const server = state.corp.servers[action.serverId];
      if (!server) throw new Error('Server not found');

      const card = server.root.find(c => c.instanceId === action.cardInstanceId);
      if (!card) throw new Error('Card not found in server root');

      state.corp.clicks -= 1;
      state.corp.credits -= 1;
      card.advancementCounters += 1;

      addLog(state, 'corp', `Corp spent [click] and 1 [credit] to advance a card in ${server.name} (now ${card.advancementCounters} counters).`);

      // Check if it's an Agenda ready to score
      if (card.def.type_code === 'agenda' && card.def.advancement_cost && card.advancementCounters >= card.def.advancement_cost) {
        // Score Agenda!
        const cardIdx = server.root.findIndex(c => c.instanceId === card.instanceId);
        server.root.splice(cardIdx, 1);
        card.isRezzed = true;
        state.corp.scoreArea.push(card);
        const pts = card.def.agenda_points || 0;
        state.corp.score += pts;
        addLog(state, 'corp', `Corp scored ${card.def.title} for ${pts} agenda point(s)! Total: ${state.corp.score}`);

        if (state.corp.score >= 7) {
          state.winner = 'corp';
          state.winReason = 'Corp scored 7 agenda points!';
          addLog(state, 'system', 'Victory: Corp has reached 7 agenda points!');
        }
      }
      break;
    }

    case 'REZ_CARD': {
      if (action.player !== 'corp') throw new Error('Only Corp can rez cards');
      // Search servers for this card
      let foundCard = null;
      for (const s of Object.values(state.corp.servers)) {
        const ice = s.ice.find(c => c.instanceId === action.cardInstanceId);
        if (ice) { foundCard = ice; break; }
        const rootCard = s.root.find(c => c.instanceId === action.cardInstanceId);
        if (rootCard) { foundCard = rootCard; break; }
      }

      if (!foundCard) throw new Error('Card to rez not found');
      if (foundCard.isRezzed) throw new Error('Card already rezzed');

      const rezCost = foundCard.def.cost || 0;
      if (state.corp.credits < rezCost) throw new Error('Not enough credits to rez');

      state.corp.credits -= rezCost;
      foundCard.isRezzed = true;
      addLog(state, 'corp', `Corp spent ${rezCost} [credit] to rez ${foundCard.def.title}.`);
      break;
    }

    case 'INITIATE_RUN': {
      if (action.player !== 'runner') throw new Error('Only Runner can initiate runs');
      if (state.runner.clicks < 1) throw new Error('Not enough clicks');
      const targetServer = state.corp.servers[action.targetServerId];
      if (!targetServer) throw new Error('Invalid target server');

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
      break;
    }

    case 'CONTINUE_RUN': {
      if (!state.activeRun) throw new Error('No active run');
      const server = state.corp.servers[state.activeRun.server];

      if (state.activeRun.phase === 'approach_ice') {
        const currentIce = server.ice[state.activeRun.icePosition!];
        if (currentIce && currentIce.isRezzed) {
          // Encounter ice
          state.activeRun.phase = 'encounter_ice';
          addLog(state, 'system', `Encountering rezzed Ice: ${currentIce.def.title}.`);
        } else {
          // Pass unrezzed ice
          addLog(state, 'runner', `Passed unrezzed Ice position ${state.activeRun.icePosition! + 1}.`);
          if (state.activeRun.icePosition! > 0) {
            state.activeRun.icePosition! -= 1;
            state.activeRun.phase = 'approach_ice';
          } else {
            state.activeRun.phase = 'approach_server';
            state.activeRun.icePosition = null;
          }
        }
      } else if (state.activeRun.phase === 'encounter_ice') {
        // Pass ice after encounter
        if (state.activeRun.icePosition! > 0) {
          state.activeRun.icePosition! -= 1;
          state.activeRun.phase = 'approach_ice';
        } else {
          state.activeRun.phase = 'approach_server';
          state.activeRun.icePosition = null;
        }
      } else if (state.activeRun.phase === 'approach_server') {
        // Breach server & access cards
        state.activeRun.phase = 'access';
        state.activeRun.isSuccessful = true;
        addLog(state, 'runner', `Run successful on ${server.name}! Accessing cards.`);

        // Simple access resolution for root cards
        for (const card of server.root) {
          if (card.def.type_code === 'agenda') {
            // Steal agenda!
            const idx = server.root.findIndex(c => c.instanceId === card.instanceId);
            server.root.splice(idx, 1);
            card.isRezzed = true;
            state.runner.scoreArea.push(card);
            const pts = card.def.agenda_points || 0;
            state.runner.score += pts;
            addLog(state, 'runner', `Runner accessed and stole ${card.def.title} for ${pts} agenda point(s)! Total: ${state.runner.score}`);

            if (state.runner.score >= 7) {
              state.winner = 'runner';
              state.winReason = 'Runner scored 7 agenda points!';
              addLog(state, 'system', 'Victory: Runner reached 7 agenda points!');
            }
          } else {
            addLog(state, 'runner', `Runner accessed ${card.def.title}.`);
          }
        }

        // Close run
        state.activeRun = null;
        state.phase = 'runner_turn';
      }
      break;
    }

    case 'JACK_OUT': {
      if (!state.activeRun) throw new Error('No active run');
      addLog(state, 'runner', 'Runner jacked out. Run ended unsuccessfully.');
      state.activeRun = null;
      state.phase = 'runner_turn';
      break;
    }

    case 'END_TURN': {
      if (action.player === 'corp') {
        // Hand off to runner
        state.activePlayer = 'runner';
        state.phase = 'runner_turn';
        state.runner.clicks = state.runner.maxClicks;
        addLog(state, 'corp', 'Corp ended turn. Runner turn begins (4 clicks).');
      } else {
        // Hand off to corp
        state.turnNumber += 1;
        state.activePlayer = 'corp';
        state.phase = 'corp_turn';
        state.corp.clicks = state.corp.maxClicks;

        // Mandatory Corp Draw at start of turn
        if (state.corp.rd.length === 0) {
          state.winner = 'runner';
          state.winReason = 'Corp decked out (R&D empty during mandatory draw)';
          addLog(state, 'system', 'Runner wins: Corp cannot perform mandatory draw from empty R&D.');
          return state;
        }

        const drawn = state.corp.rd.shift()!;
        state.corp.hq.push(drawn);
        addLog(state, 'system', `--- Turn ${state.turnNumber} ---`);
        addLog(state, 'corp', 'Corp drew 1 card (Mandatory Draw) and gained 3 clicks.');
      }
      break;
    }

    default:
      console.warn('Unhandled action:', (action as any).type);
  }

  return state;
}
