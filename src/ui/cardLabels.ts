import { CardDefinition, FactionCode } from '../core/types/card';

export const FACTION_LABEL: Record<FactionCode, string> = {
  'haas-bioroid': 'Haas-Bioroid', jinteki: 'Jinteki', nbn: 'NBN', 'weyland-consortium': 'Weyland',
  'neutral-corp': 'Neutral', anarch: 'Anarch', criminal: 'Criminal', shaper: 'Shaper', 'neutral-runner': 'Neutral',
};

export const FACTION_COLOR: Record<FactionCode, string> = {
  'haas-bioroid': 'text-violet-400', jinteki: 'text-red-400', nbn: 'text-amber-300', 'weyland-consortium': 'text-emerald-400',
  'neutral-corp': 'text-slate-400', anarch: 'text-orange-400', criminal: 'text-blue-400', shaper: 'text-lime-400',
  'neutral-runner': 'text-slate-400',
};

/** The printed type line, e.g. "Ice: Barrier", or just "Upgrade" for a card with no subtypes. */
export function typeLine(def: CardDefinition): string {
  const type = def.type_code === 'ice' ? 'Ice' : def.type_code[0].toUpperCase() + def.type_code.slice(1);
  return def.keywords ? `${type}: ${def.keywords}` : type;
}
