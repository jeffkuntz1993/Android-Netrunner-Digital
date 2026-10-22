export type SideCode = 'corp' | 'runner';

export type FactionCode =
  // Corp
  | 'haas-bioroid'
  | 'jinteki'
  | 'nbn'
  | 'weyland-consortium'
  | 'neutral-corp'
  // Runner
  | 'anarch'
  | 'criminal'
  | 'shaper'
  | 'neutral-runner';

export type CardTypeCode =
  // Shared / Identity
  | 'identity'
  // Corp
  | 'agenda'
  | 'asset'
  | 'upgrade'
  | 'operation'
  | 'ice'
  // Runner
  | 'event'
  | 'hardware'
  | 'resource'
  | 'program';

export interface CardDefinition {
  code: string;
  title: string;
  pack_code: string;
  side_code: SideCode;
  faction_code: FactionCode;
  type_code: CardTypeCode;
  keywords?: string;
  text?: string;
  cost?: number | null;
  faction_cost?: number;
  deck_limit?: number;
  agenda_points?: number;
  advancement_cost?: number;
  trash_cost?: number | null;
  strength?: number | null;
  memory_cost?: number | null;
  base_link?: number | null;
  minimum_deck_size?: number | null;
  influence_limit?: number | null;
  flavor?: string;
  illustrator?: string;
  stripped_text?: string;
  stripped_title?: string;
  uniqueness?: boolean;
}

export interface CardInstance {
  instanceId: string;
  cardCode: string;
  isRezzed: boolean;
  advancementCounters: number;
  tokens: Record<string, number>;
  hostedCardIds: string[];
  hostedOnId?: string;
  /** Turn key (see turnKey()) when this card was installed, for "this turn" checks. */
  installedTurn?: string;
}
