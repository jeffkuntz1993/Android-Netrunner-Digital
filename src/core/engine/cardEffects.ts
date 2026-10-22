import { CardInstance, SideCode } from '../types/card';
import { GameState } from '../types/state';
import { cardDef } from '../cards';
import { getCardScript } from '../scripts';
import { CounterType } from '../scripts/types';
import { addLog } from './log';
import { drawCards, findInstalledCorpCard, removeCard, trashInstalledCorpCard } from './helpers';
import { activeCards } from './triggers';
import { trashInstalledRunnerCard } from './damage';

/**
 * Shared building blocks for card abilities: turn flags, counters, hosted
 * credits, paying credits, derived stats (hand size, memory), and moving
 * installed cards (trash, derez, remove from game).
 */

// --- Turn flags -------------------------------------------------------------

/** Keys of GameState.turnFlags. All reset when the turn passes. */
export const TurnFlag = {
  programsInstalled: 'programs_installed',
  basicDraws: 'basic_draws',
  accessTrashes: 'access_trashes',
  tagEvents: 'tag_events',
  hqBreaches: 'hq_breaches',
  agendaPointsScored: 'agenda_points_scored',
  cannotScore: 'cannot_score',
} as const;

export function turnFlag(state: GameState, key: string): number {
  return state.turnFlags[key] ?? 0;
}

export function bumpTurnFlag(state: GameState, key: string, by = 1): number {
  state.turnFlags[key] = turnFlag(state, key) + by;
  return state.turnFlags[key];
}

/** For "once per turn" abilities: true (and marks it used) the first time this turn. */
export function useOncePerTurn(state: GameState, key: string): boolean {
  if (turnFlag(state, key) > 0) return false;
  state.turnFlags[key] = 1;
  return true;
}

// --- Counters ---------------------------------------------------------------

export function counters(card: CardInstance, type: CounterType): number {
  return card.tokens[type] ?? 0;
}

export function addCounters(card: CardInstance, type: CounterType, count: number): void {
  card.tokens[type] = counters(card, type) + count;
}

export function removeCounters(card: CardInstance, type: CounterType, count: number): void {
  card.tokens[type] = Math.max(0, counters(card, type) - count);
}

/** "Load X credits onto this card". */
export function loadCredits(state: GameState, card: CardInstance, amount: number): void {
  addCounters(card, 'credit', amount);
  addLog(state, cardDef(card).side_code, `${cardDef(card).title} was loaded with ${amount} [credit].`);
}

/**
 * Moves up to `amount` hosted credits from a card to its controller's pool.
 * If the card is now empty and says "when it is empty, trash it", it is
 * trashed (and onEmptied runs). Returns the credits taken.
 */
export function takeHostedCredits(state: GameState, card: CardInstance, amount: number): number {
  const side = cardDef(card).side_code;
  const taken = Math.min(amount, counters(card, 'credit'));
  removeCounters(card, 'credit', taken);
  state[side].credits += taken;
  addLog(state, side, `${side === 'corp' ? 'Corp' : 'Runner'} took ${taken} [credit] from ${cardDef(card).title}.`);
  const script = getCardScript(card.cardCode);
  if (counters(card, 'credit') === 0 && script?.trashWhenEmpty) {
    trashInstalledCard(state, card);
    addLog(state, side, `${cardDef(card).title} is empty and was trashed.`);
    script.onEmptied?.({ state, card, side });
  }
  return taken;
}

/** Removes every virus counter from every card. */
export function purgeVirusCounters(state: GameState): number {
  let removed = 0;
  for (const card of allInstalledCards(state)) {
    removed += counters(card, 'virus');
    if (card.tokens.virus) card.tokens.virus = 0;
  }
  return removed;
}

// --- Credits ----------------------------------------------------------------

/** Credits a side can spend right now, including run-only credits (Overclock). */
export function availableCredits(state: GameState, side: SideCode): number {
  const bonus = side === 'runner' ? state.activeRun?.bonusCredits ?? 0 : 0;
  return state[side].credits + bonus;
}

/** Pays credits, using run-only credits first. Callers check availableCredits beforehand. */
export function spendCredits(state: GameState, side: SideCode, amount: number): void {
  let remaining = amount;
  const run = state.activeRun;
  if (side === 'runner' && run && run.bonusCredits > 0) {
    const fromBonus = Math.min(run.bonusCredits, remaining);
    run.bonusCredits -= fromBonus;
    remaining -= fromBonus;
  }
  state[side].credits -= remaining;
}

// --- Derived stats ----------------------------------------------------------

const BASE_HAND_SIZE = 5;
const BASE_MEMORY = 4;

/** Maximum hand size: 5, plus card modifiers, minus the Runner's core damage. */
export function maxHandSize(state: GameState, side: SideCode): number {
  const bonus = activeCards(state, side).reduce((n, c) => n + (getCardScript(c.cardCode)?.modifiers?.handSize ?? 0), 0);
  return BASE_HAND_SIZE + bonus - (side === 'runner' ? state.runner.coreDamage : 0);
}

/** The Runner's memory units: 4 plus hardware bonuses. */
export function memoryLimit(state: GameState): number {
  return BASE_MEMORY + activeCards(state, 'runner').reduce((n, c) => n + (getCardScript(c.cardCode)?.modifiers?.memory ?? 0), 0);
}

/** Copies derived stats into the state fields the UI reads. Called after every action. */
export function syncDerivedStats(state: GameState): void {
  state.corp.handSizeLimit = maxHandSize(state, 'corp');
  state.runner.handSizeLimit = maxHandSize(state, 'runner');
  state.runner.memoryUnitsTotal = memoryLimit(state);
}

// --- Installed cards --------------------------------------------------------

export function allInstalledCards(state: GameState): CardInstance[] {
  const { programs, hardware, resources } = state.runner.rig;
  const corp = Object.values(state.corp.servers).flatMap(s => [...s.ice, ...s.root]);
  return [...corp, ...programs, ...hardware, ...resources];
}

export function installedIce(state: GameState): CardInstance[] {
  return Object.values(state.corp.servers).flatMap(s => s.ice);
}

/** Trashes any installed card (Corp cards go to Archives, Runner cards to the heap). */
export function trashInstalledCard(state: GameState, card: CardInstance): void {
  const corp = findInstalledCorpCard(state, card.instanceId);
  if (corp) {
    trashInstalledCorpCard(state, corp.server, card);
  } else {
    trashInstalledRunnerCard(state, card);
  }
}

/** Turns a rezzed Corp card facedown (Tranquilizer). */
export function derez(state: GameState, card: CardInstance): void {
  if (!card.isRezzed) return;
  card.isRezzed = false;
  addLog(state, 'runner', `${cardDef(card).title} was derezzed.`);
}

/** Removes an installed card from the game (Spin Doctor). */
export function removeFromGame(state: GameState, card: CardInstance): void {
  const corp = findInstalledCorpCard(state, card.instanceId);
  if (corp) {
    removeCard(corp.server.root, card) || removeCard(corp.server.ice, card);
  } else {
    const { rig } = state.runner;
    removeCard(rig.programs, card) || removeCard(rig.hardware, card) || removeCard(rig.resources, card);
  }
  card.tokens = {};
  card.advancementCounters = 0;
  state.removedFromGame.push(card);
}

/** Draws cards and logs it (for card effects). */
export function drawForEffect(state: GameState, side: SideCode, count: number, sourceTitle: string): void {
  const drawn = drawCards(state, side, count);
  addLog(state, side, `${side === 'corp' ? 'Corp' : 'Runner'} drew ${drawn} card(s) (${sourceTitle}).`);
}

/**
 * "Limit 1 console per player" and unique cards: if a newly active card shares
 * the restriction with an older active card, the older one is trashed.
 */
export function enforceInstallLimits(state: GameState, newCard: CardInstance): void {
  const def = cardDef(newCard);
  const isConsole = (c: CardInstance) => /\bconsole\b/i.test(cardDef(c).keywords ?? '');
  const others = activeCards(state, def.side_code).filter(c => c.instanceId !== newCard.instanceId);
  for (const old of others) {
    const sameUnique = def.uniqueness && cardDef(old).title === def.title;
    const twoConsoles = def.type_code === 'hardware' && isConsole(newCard) && isConsole(old);
    if (sameUnique || twoConsoles) {
      trashInstalledCard(state, old);
      addLog(state, def.side_code, `${cardDef(old).title} was trashed (${sameUnique ? 'unique' : 'limit 1 console'}).`);
    }
  }
}
