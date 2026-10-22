import { CardInstance } from '../core/types/card';
import { GameState } from '../core/types/state';

export type FateKind = 'stolen' | 'trashed' | 'scored';

/** Something that just happened to a card, worth showing on the table. */
export interface CardFate {
  kind: FateKind;
  card: CardInstance;
  /** The card went to Archives face down, so only the Corp may see its face. */
  corpSecret: boolean;
}

const ids = (cards: CardInstance[]) => new Set(cards.map(c => c.instanceId));

/** Every installed card, Corp and Runner. */
function installedIds(state: GameState): Set<string> {
  const { corp, runner } = state;
  return ids([
    ...Object.values(corp.servers).flatMap(s => [...s.root, ...s.ice]),
    ...runner.rig.programs,
    ...runner.rig.hardware,
    ...runner.rig.resources,
  ]);
}

/**
 * The cards stolen, scored or trashed between two states. A card counts as
 * trashed when it was installed, or was in HQ or R&D while the Runner was
 * accessing, and is now in Archives or the heap. Discards from hand and played
 * events and operations are not trashes, so they don't show.
 */
export function cardFates(prev: GameState, next: GameState): CardFate[] {
  const fates: CardFate[] = [];

  const stolenBefore = ids(prev.runner.scoreArea);
  for (const card of next.runner.scoreArea) {
    if (!stolenBefore.has(card.instanceId)) fates.push({ kind: 'stolen', card, corpSecret: false });
  }
  const scoredBefore = ids(prev.corp.scoreArea);
  for (const card of next.corp.scoreArea) {
    if (!scoredBefore.has(card.instanceId)) fates.push({ kind: 'scored', card, corpSecret: false });
  }

  const eligible = installedIds(prev);
  if (prev.activeRun?.phase === 'access') {
    for (const card of [...prev.corp.hq, ...prev.corp.rd]) eligible.add(card.instanceId);
  }
  const trashedBefore = ids([...prev.runner.heap, ...prev.corp.archives.faceUp, ...prev.corp.archives.faceDown]);
  const pushTrashed = (cards: CardInstance[], corpSecret: boolean) => {
    for (const card of cards) {
      if (eligible.has(card.instanceId) && !trashedBefore.has(card.instanceId)) {
        fates.push({ kind: 'trashed', card, corpSecret });
      }
    }
  };
  pushTrashed(next.corp.archives.faceUp, false);
  pushTrashed(next.corp.archives.faceDown, true);
  pushTrashed(next.runner.heap, false);
  return fates;
}
