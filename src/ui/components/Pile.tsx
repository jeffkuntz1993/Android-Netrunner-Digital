import React from 'react';
import { CardInstance, SideCode } from '../../core';
import { getCardBackUrl } from '../../data/cards';
import { CardView } from './CardView';

const SIZE = { sm: 'w-28 h-40', md: 'w-36 h-52', lg: 'w-44 h-64' } as const;

interface PileProps {
  label: string;
  count: number;
  side: SideCode;
  /** Face-up top card (Archives, Heap); without it the pile shows a card back, or an empty slot. */
  topCard?: CardInstance;
  size?: keyof typeof SIZE;
  onClick?: () => void;
  onInspect?: (card: CardInstance) => void;
  testId?: string;
}

/** A deck or discard pile drawn as a card on the table, with its count. */
export const Pile: React.FC<PileProps> = ({ label, count, side, topCard, size = 'sm', onClick, onInspect, testId }) => (
  <div className="flex flex-col items-center gap-1 shrink-0">
    <button
      type="button"
      onClick={e => {
        e.stopPropagation();
        onClick?.();
      }}
      disabled={!onClick}
      data-testid={testId}
      title={onClick ? `Browse ${label}` : label}
      className={`relative ${SIZE[size]} rounded-xl ${onClick ? 'cursor-pointer hover:scale-105' : 'cursor-default'} transition-transform`}
    >
      {count === 0 ? (
        <div className="w-full h-full rounded-xl border-2 border-dashed border-slate-700 flex items-center justify-center text-[10px] text-slate-600 uppercase tracking-wider">
          Empty
        </div>
      ) : topCard ? (
        <div className="pointer-events-none">
          <CardView card={topCard} size={size} notInstalled onInspect={onInspect} />
        </div>
      ) : (
        <img
          src={getCardBackUrl(side)}
          alt={`${label} (face down)`}
          className="w-full h-full object-cover rounded-xl border-2 border-slate-700 shadow-[3px_3px_0_#1e293b,6px_6px_0_#0f172a]"
        />
      )}
      {count > 0 && (
        <span className="absolute -top-2 -right-2 min-w-[1.75rem] h-7 px-1.5 rounded-full bg-black/90 border border-slate-500 text-xs font-bold text-slate-100 flex items-center justify-center z-20">
          {count}
        </span>
      )}
    </button>
    <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">{label}</span>
  </div>
);
