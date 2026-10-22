import { CardInstance, GameAction, GameState, ServerState, activePrompt, cardDef, findCardAnywhere, getLegalActions, isLegalAction } from '../core';
import { iceScript } from '../core/engine/ice';
import { counters, rezCost } from '../core/engine/cardEffects';
import { Agent, ScoredAction } from './agent';
import { evaluate } from './evaluate';
import { answerPrompt, simulate } from './prompts';

const FREE_ACTION_LIMIT = 6;

// Assets worth installing in their own remote and rezzing for money or cards (by code).
const ECON_ASSETS: Record<string, number> = {
  '30071': 4, // Regolith Mining License
  '30037': 3.5, // Nico Campaign
  '30053': 1.5, // Spin Doctor
  '35072': 4, // Anthill Excavation Contract
  '35040': 3.5, // Otto Campaign
  '35062': 2.5, // Public Access Plaza
  '35039': 2, // Humanoid Resources
};
// Upgrades: [value in a scoring remote, value on HQ or R&D]
const UPGRADES: Record<string, [number, number]> = {
  '30042': [2.5, 2], // Manegarm Skunkworks
  '30050': [1.5, 0.8], // Anoetic Void
  '30058': [1.5, 0], // AMAZE Amusements
  '30066': [1.5, 0], // Malapert Data Vault
  '35082': [2, 0.5], // Mahkota Langit Grid
  '35056': [1.5, 1.2], // Mitra Aman
  '35045': [1, 1], // Mercia B4LL4RD
};

const type = (card: CardInstance) => cardDef(card).type_code;
const hasEndTheRun = (ice: CardInstance) => (iceScript(ice)?.subroutines ?? []).some(s => /end the run/i.test(s.label));
const isAgendaOrAsset = (card: CardInstance) => ['agenda', 'asset'].includes(type(card));

/**
 * Rule-based Corp: builds money, ices its centrals, sets up a remote with
 * ice to score agendas from, and rezzes ice when the Runner comes in.
 */
export class HeuristicCorpAI implements Agent {
  readonly side = 'corp' as const;
  private freeActions = 0;
  private freeKey = '';

  chooseAction(state: GameState): GameAction {
    if (activePrompt(state)) return answerPrompt(state, 'corp');
    const legal = getLegalActions(state, 'corp');
    const ranked = this.rankMainActions(state, legal);
    const chosen = ranked[0]?.score > -Infinity ? ranked[0].action : legal.find(a => a.type === 'END_TURN') ?? legal[0];
    this.notePlayed(chosen);
    return chosen;
  }

  /** Counts actions in a row that spent no click (loop guard). */
  notePlayed(action: GameAction) {
    if (action.type !== 'END_TURN') this.freeActions++;
  }

  /** Main-phase actions, best first, with this AI's score for each (the search AI starts from these). */
  rankMainActions(state: GameState, legal = getLegalActions(state, 'corp')): ScoredAction[] {
    const key = `${state.turnNumber}|${state.corp.clicks}`;
    if (key !== this.freeKey) {
      this.freeKey = key;
      this.freeActions = 0;
    }
    const before = evaluate(state, 'corp');
    return legal.map(action => ({ action, score: this.score(state, action, before) })).sort((a, b) => b.score - a.score);
  }

  chooseRez(state: GameState, cards: CardInstance[]): GameAction | null {
    const run = state.activeRun;
    if (!run) return null;
    const server = state.corp.servers[run.server];
    const importance = serverImportance(state, server);
    let best: { card: CardInstance; score: number } | null = null;
    for (const card of cards) {
      const def = cardDef(card);
      const cost = rezCost(state, card);
      if (!isLegalAction(state, { type: 'REZ_CARD', player: 'corp', cardInstanceId: card.instanceId })) continue;
      let score: number;
      if (def.type_code === 'ice') {
        // Ping tags the Runner when rezzed during a run; ice that ends the run protects best
        score = importance + (hasEndTheRun(card) ? 1 : 0) + (card.cardCode === '30055' ? 2 : 0);
        if (state.corp.credits - cost < 2 && importance < 4) score -= 2;
      } else if (def.type_code === 'upgrade') {
        score = card.cardCode === '30042' || card.cardCode === '30050' ? importance : importance - 2;
      } else {
        score = -1; // assets are rezzed on the Corp's own turn
      }
      if (score >= 2 && (!best || score > best.score)) best = { card, score };
    }
    if (best) return { type: 'REZ_CARD', player: 'corp', cardInstanceId: best.card.instanceId };
    return run.phase === 'approach_server' ? this.runStopper(state, importance) : null;
  }

  /** LEO Construction or Proprionegation, when the Runner is about to get into something that matters. */
  private runStopper(state: GameState, importance: number): GameAction | null {
    if (importance < 6) return null;
    const archivesAgenda = state.corp.archives.faceDown.some(c => type(c) === 'agenda');
    for (const action of getLegalActions(state, 'corp')) {
      if (action.type !== 'USE_ABILITY') continue;
      const code = findCardAnywhere(state, action.cardInstanceId)?.cardCode;
      if (code === '35035') return action; // LEO: trash a bioroid, end the run
      if (code === '35048' && !archivesAgenda && state.activeRun?.server !== 'archives') return action; // Proprionegation
    }
    return null;
  }

  private score(state: GameState, action: GameAction, before: number): number {
    const corp = state.corp;
    switch (action.type) {
      case 'END_TURN':
        return -0.5;
      case 'SCORE_AGENDA':
        return 100;
      case 'PURGE_VIRUS': {
        const viruses = [...state.runner.rig.programs, ...state.runner.rig.hardware, ...state.runner.rig.resources].reduce(
          (n, c) => n + counters(c, 'virus'),
          0
        );
        return viruses - 3.5;
      }
      case 'ADVANCE_CARD':
        return this.advanceScore(state, action.cardInstanceId, action.serverId);
      case 'INSTALL_CARD': {
        const card = corp.hq.find(c => c.instanceId === action.cardInstanceId);
        if (!card) return -Infinity;
        const server = action.asNewRemote ? null : corp.servers[action.targetServerId ?? ''] ?? null;
        // BANGUN's faceup agendas hurt the Runner but tell them what is there
        return this.installScore(state, card, server) - (action.faceUp ? 0.5 : 0);
      }
      case 'REZ_CARD': {
        if (state.activeRun) return -Infinity;
        const card = Object.values(corp.servers).flatMap(s => s.root).find(c => c.instanceId === action.cardInstanceId);
        if (!card) return -Infinity; // ice waits for a run
        if (ECON_ASSETS[card.cardCode]) return ECON_ASSETS[card.cardCode] + 1;
        if (card.cardCode === '30061') return 1; // Clearinghouse must be rezzed to fire
        // Elevation cards whose effects need them rezzed
        switch (card.cardCode) {
          case '35051': // Phật Gioan Baotixita: gathers power counters
            return 1.5;
          case '35061': // Idiosyncresis: pays out when the turn begins
            return card.advancementCounters >= 2 ? 2 : -Infinity;
          case '35073': // Plutus: replays transactions from Archives
            return corp.archives.faceUp.concat(corp.archives.faceDown).some(c => /transaction/i.test(cardDef(c).keywords ?? '')) ? 1.2 : -Infinity;
          case '35082': // Mahkota Langit Grid: recurring credits
            return 1.5;
          case '35045': // Mercia B4LL4RD
          case '35056': // Mitra Aman
            return 1;
        }
        return -Infinity;
      }
    }
    if (action.type === 'PLAY_OPERATION_OR_EVENT') {
      const code = corp.hq.find(c => c.instanceId === action.cardInstanceId)?.cardCode;
      const bonus = code ? this.operationBonus(state, code) : 0;
      if (bonus !== 0) {
        const after = simulate(state, action);
        return after ? bonus : -Infinity;
      }
    }
    const after = simulate(state, action);
    if (!after) return -Infinity;
    const spendsClick = after.corp.clicks < corp.clicks;
    if (!spendsClick && this.freeActions >= FREE_ACTION_LIMIT) return -Infinity;
    // Follow our own prompts (Predictive Planogram, Seamless Launch) a few steps.
    let resolved = after;
    for (let i = 0; i < 3 && activePrompt(resolved)?.side === 'corp'; i++) {
      const next = simulate(resolved, answerPrompt(resolved, 'corp'));
      if (!next) break;
      resolved = next;
    }
    const score = evaluate(resolved, 'corp') - before;
    if (!spendsClick && score <= 0.3) return -Infinity;
    return score;
  }

  /**
   * Operations whose worth the one-step evaluation misses: extra clicks or
   * advancements that let an agenda be scored this turn. 0: no opinion.
   */
  private operationBonus(state: GameState, code: string): number {
    const corp = state.corp;
    const agendas = Object.values(corp.servers).flatMap(s => s.root).filter(c => type(c) === 'agenda');
    const need = (c: CardInstance) => (cardDef(c).advancement_cost ?? 0) - c.advancementCounters;
    switch (code) {
      case '35043': {
        // Nanomanagement (4 credits): +2 clicks, worth it if they finish an agenda
        const clicksAfter = corp.clicks - 1 + 2;
        const finish = agendas.some(a => need(a) > corp.clicks && need(a) <= clicksAfter && corp.credits - 4 >= need(a));
        return finish ? 42 : -Infinity;
      }
      case '35067': {
        // Touch-ups (2 clicks, 2 credits): 2 advancements, best when they finish an agenda
        const clicksAfter = corp.clicks - 2;
        if (clicksAfter < 0 || corp.credits < 2) return -Infinity;
        const finish = agendas.some(a => need(a) <= 2 + Math.min(clicksAfter, corp.credits - 2) && need(a) > 0);
        return finish ? 41 : 0;
      }
      case '35044': {
        // Top-Down Solutions: 2 cards and up to 2 installs for 1 click
        const installable = corp.hq.filter(c => ['ice', 'asset', 'upgrade', 'agenda'].includes(type(c))).length;
        return corp.credits >= 3 && installable >= 1 && corp.hq.length <= corp.handSizeLimit ? 1.3 : 0;
      }
    }
    return 0;
  }

  private advanceScore(state: GameState, cardId: string, serverId: string): number {
    const corp = state.corp;
    const server = corp.servers[serverId];
    const card = server && [...server.root, ...server.ice].find(c => c.instanceId === cardId);
    if (!card) return -Infinity;
    const def = cardDef(card);
    if (def.type_code === 'agenda') {
      const need = (def.advancement_cost ?? 0) - card.advancementCounters;
      if (need <= 0) return -Infinity;
      if (need <= corp.clicks && need <= corp.credits) return 40 + card.advancementCounters;
      // Can't finish this turn: build counters only behind ice
      return server.ice.length > 0 ? 3 + 0.5 * card.advancementCounters : 0.2;
    }
    if (def.type_code === 'asset') {
      // Traps: advancing makes them look like agendas (Urtica Cipher, Clearinghouse)
      return corp.credits >= 4 && card.advancementCounters < 3 ? 1.2 : -Infinity;
    }
    // Pharos: +5 strength at 3 counters; Syailendra: places counters when encountered at 3
    if (card.cardCode === '35076' && card.advancementCounters < 3 && corp.credits >= 4) return 0.8;
    return card.cardCode === '30063' && card.advancementCounters < 3 && corp.credits >= 8 ? 1 : -Infinity;
  }

  private installScore(state: GameState, card: CardInstance, server: ServerState | null): number {
    const corp = state.corp;
    const hq = corp.hq;
    const remotes = Object.values(corp.servers).filter(s => s.isRemote);
    const agendasInHand = hq.filter(c => type(c) === 'agenda').length;
    const protectedEmptyRemote = remotes.some(s => s.ice.length > 0 && !s.root.some(isAgendaOrAsset));

    switch (type(card)) {
      case 'ice': {
        const installCost = server ? server.ice.length : 0;
        let need: number;
        if (!server) need = agendasInHand > 0 && !protectedEmptyRemote ? 5 : -1;
        else if (server.isRemote) {
          const holdsAgenda = server.root.some(c => type(c) === 'agenda' || c.advancementCounters > 0);
          const holdsAsset = server.root.some(c => type(c) === 'asset');
          if (holdsAgenda) need = server.ice.length < 2 ? 7 : 3;
          else if (holdsAsset) need = server.ice.length === 0 ? 1.5 : 0.2;
          else need = agendasInHand > 0 ? (server.ice.length < 2 ? 3 : 1) : 0.3;
        } else if (server.id === 'archives') {
          need = server.ice.length === 0 && corp.archives.faceDown.length > 0 ? 1.2 : -0.5;
        } else {
          need = (server.ice.length === 0 ? 4 : server.ice.length === 1 ? 2 : 0.6) + (server.id === 'rd' ? 0.3 : 0);
        }
        const rezCost = cardDef(card).cost ?? 0;
        const strength = cardDef(card).strength ?? 0;
        return (
          need -
          0.8 * installCost +
          (hasEndTheRun(card) ? 1 : 0) +
          0.15 * Math.min(strength, 5) -
          (corp.credits - installCost < rezCost ? 1.5 : 0)
        );
      }
      case 'agenda': {
        if (!server) return agendasInHand >= 3 || hq.length > corp.handSizeLimit ? 1 : -2;
        if (server.root.some(isAgendaOrAsset)) return -Infinity;
        if (server.ice.length === 0) return -2;
        const def = cardDef(card);
        const finishNow = (def.advancement_cost ?? 0) <= corp.clicks - 1 && (def.advancement_cost ?? 0) <= corp.credits;
        return finishNow ? 45 : 8 + Math.min(server.ice.length, 3) * 0.3;
      }
      case 'asset': {
        const econ = ECON_ASSETS[card.cardCode];
        if (econ !== undefined) {
          if (server) return -1;
          const rezCost = cardDef(card).cost ?? 0;
          return econ - (corp.credits < rezCost ? 1.5 : 0) - (remotes.length >= 4 ? 1 : 0);
        }
        // Traps and Clearinghouse: bluff in a new remote, or an empty protected one
        if (!server) return remotes.length >= 4 ? 0.2 : 1.2;
        if (server.root.some(isAgendaOrAsset)) return -Infinity;
        return server.ice.length > 0 && agendasInHand === 0 ? 1.8 : 0.5;
      }
      case 'upgrade': {
        const values = UPGRADES[card.cardCode] ?? [1, 0.5];
        if (!server) return -1;
        if (server.root.some(c => c.cardCode === card.cardCode)) return -Infinity;
        const value = server.isRemote ? (server.ice.length > 0 ? values[0] : -0.5) : server.id === 'archives' ? -1 : values[1];
        return value - (corp.credits < (cardDef(card).cost ?? 0) ? 1 : 0);
      }
    }
    return -Infinity;
  }
}

/** How much the Corp cares about keeping the Runner out of this server (for rez decisions). */
function serverImportance(state: GameState, server: ServerState | undefined): number {
  if (!server) return 0;
  if (server.root.some(c => type(c) === 'agenda')) return 10;
  if (server.id === 'hq') return 3 + state.corp.hq.filter(c => type(c) === 'agenda').length * 2;
  if (server.id === 'rd') return 4;
  if (server.id === 'archives') return state.corp.archives.faceDown.some(c => type(c) === 'agenda') ? 6 : 0.5;
  if (server.root.some(c => c.advancementCounters > 0)) return 1; // a trap: let them in
  if (server.root.some(c => c.isRezzed && ECON_ASSETS[c.cardCode])) return 3;
  return server.root.length > 0 ? 2 : 0.5;
}
