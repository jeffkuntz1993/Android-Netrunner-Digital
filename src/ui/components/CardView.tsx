import React, { useState } from 'react';
import { CardInstance } from '../../core/types/card';
import { getCardImageUrl } from '../../data/cards';
import { Shield, Zap, Award, Layers } from 'lucide-react';

interface CardViewProps {
  card: CardInstance;
  isFaceDown?: boolean;
  isSelectable?: boolean;
  isSelected?: boolean;
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg';
}

export const CardView: React.FC<CardViewProps> = ({
  card,
  isFaceDown = false,
  isSelectable = false,
  isSelected = false,
  onClick,
  size = 'md',
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const { def } = card;

  const sizeClasses = {
    sm: 'w-16 h-24 text-[10px]',
    md: 'w-24 h-36 text-xs',
    lg: 'w-36 h-52 text-sm',
  }[size];

  // Face Down representation (Cyberpunk circuit card back)
  if (isFaceDown && !card.isRezzed) {
    return (
      <div
        onClick={isSelectable ? onClick : undefined}
        className={`relative ${sizeClasses} rounded-lg border-2 transition-all duration-200 select-none flex flex-col items-center justify-center p-1 shadow-md ${
          isSelected
            ? 'border-cyber-neonCyan ring-2 ring-cyber-neonCyan scale-105'
            : 'border-slate-700 bg-gradient-to-b from-slate-900 to-slate-950 hover:border-slate-500'
        } ${isSelectable ? 'cursor-pointer hover:scale-105' : ''}`}
      >
        <div className="absolute inset-1 rounded border border-dashed border-slate-800 flex items-center justify-center opacity-70">
          <Layers className="w-5 h-5 text-slate-600 animate-pulse" />
        </div>
        <span className="text-[9px] uppercase tracking-wider text-slate-500 font-mono z-10 font-bold">
          [SECURED]
        </span>

        {/* Counter badges if advanced */}
        {card.advancementCounters > 0 && (
          <div className="absolute -top-2 -right-2 bg-cyber-neonYellow text-black font-bold px-1.5 py-0.5 rounded-full text-[10px] shadow z-20">
            {card.advancementCounters}★
          </div>
        )}
      </div>
    );
  }

  const imageUrl = getCardImageUrl(card.cardCode);

  return (
    <div
      onClick={isSelectable ? onClick : undefined}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      className={`relative ${sizeClasses} rounded-lg border-2 transition-all duration-200 select-none overflow-hidden group shadow-lg ${
        isSelected
          ? 'border-cyber-neonCyan ring-2 ring-cyber-neonCyan scale-105 z-20'
          : def.side_code === 'corp'
          ? 'border-cyan-700 hover:border-cyber-neonCyan bg-slate-900'
          : 'border-pink-700 hover:border-cyber-neonPink bg-slate-900'
      } ${isSelectable ? 'cursor-pointer hover:scale-105' : ''}`}
    >
      {/* Card Art Image */}
      <img
        src={imageUrl}
        alt={def.title}
        className="w-full h-full object-cover rounded"
        loading="lazy"
        onError={(e) => {
          // Fallback if image CDN has hiccup
          (e.target as HTMLElement).style.display = 'none';
        }}
      />

      {/* Fallback Text Badge if image loading */}
      <div className="absolute inset-0 p-1 flex flex-col justify-between pointer-events-none bg-gradient-to-t from-black/80 via-transparent to-black/60">
        <div className="flex justify-between items-start">
          <span className="font-bold font-mono text-[9px] text-white line-clamp-1 bg-black/60 px-1 rounded">
            {def.title}
          </span>
          {def.cost !== null && def.cost !== undefined && (
            <span className="font-mono font-bold text-[9px] bg-amber-500 text-black px-1 rounded-full shadow">
              {def.cost}c
            </span>
          )}
        </div>

        <div className="flex items-center justify-between text-[8px] text-slate-300 font-mono">
          <span className="capitalize">{def.type_code}</span>
          {def.agenda_points && (
            <span className="text-cyan-400 font-bold">{def.agenda_points} pts</span>
          )}
        </div>
      </div>

      {/* Advancement Counter Badge */}
      {card.advancementCounters > 0 && (
        <div className="absolute top-1 right-1 bg-cyber-neonYellow text-black font-bold px-1.5 py-0.5 rounded-full text-[10px] shadow z-20">
          {card.advancementCounters}★
        </div>
      )}

      {/* Hover Card Detail Tooltip */}
      {showTooltip && (
        <div className="fixed z-50 pointer-events-none w-64 p-3 bg-slate-950/95 border border-cyber-neonCyan rounded-lg shadow-2xl backdrop-blur-md text-xs font-mono left-1/2 -translate-x-1/2 bottom-8">
          <div className="flex justify-between items-start border-b border-slate-800 pb-1 mb-1.5">
            <h4 className="font-bold text-cyber-neonCyan">{def.title}</h4>
            <span className="text-[10px] text-slate-400 uppercase">{def.type_code}</span>
          </div>
          <div className="text-[11px] text-slate-400 mb-2 italic">
            {def.keywords || def.faction_code}
          </div>
          <p
            className="text-[11px] text-slate-200 leading-relaxed whitespace-pre-line"
            dangerouslySetInnerHTML={{
              __html: (def.text || '')
                .replace(/\[credit\]/g, ' 🪙 ')
                .replace(/\[click\]/g, ' ⏱️ ')
                .replace(/\[subroutine\]/g, ' ↳ '),
            }}
          />
        </div>
      )}
    </div>
  );
};
