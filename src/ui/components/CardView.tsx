import React, { useRef, useState } from 'react';
import { CardInstance } from '../../core/types/card';
import { getCardImageUrl, getCardBackUrl } from '../../data/cards';
import { Layers, Lock, Eye, AlertCircle } from 'lucide-react';
import { CardPopout } from './CardPopout';

export interface CardViewProps {
  card: CardInstance;
  isFaceDown?: boolean;
  canPeek?: boolean;
  isSelectable?: boolean;
  isSelected?: boolean;
  onClick?: () => void;
  onInspect?: (card: CardInstance) => void;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

export const CardView: React.FC<CardViewProps> = ({
  card,
  isFaceDown = false,
  canPeek = true,
  isSelectable = false,
  isSelected = false,
  onClick,
  onInspect,
  size = 'md',
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [imageError, setImageError] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const { def } = card;

  // Sizing definitions: Much larger than original 64x96!
  // sm: 112x160 (75% larger than original sm)
  // md: 144x208 (2.25x larger)
  // lg: 176x256 (3x larger)
  // xl: 224x320 (4x larger)
  const sizeClasses = {
    xs: 'w-20 h-28 text-[10px]',
    sm: 'w-28 h-40 text-xs',
    md: 'w-36 h-52 text-xs',
    lg: 'w-44 h-64 text-sm',
    xl: 'w-56 h-80 text-base',
  }[size];

  const handleMouseEnter = () => setShowTooltip(true);
  const handleMouseLeave = () => setShowTooltip(false);

  // When face-down and viewer cannot peek (e.g. Runner looking at Corp ICE/Root)
  if (isFaceDown && !canPeek) {
    return (
      <div
        ref={cardRef}
        onClick={isSelectable ? onClick : undefined}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`relative ${sizeClasses} rounded-xl border-2 transition-all duration-200 select-none flex flex-col items-center justify-center p-2 shadow-lg ${
          isSelected
            ? 'border-cyber-neonCyan ring-2 ring-cyber-neonCyan scale-105'
            : 'border-slate-800 bg-gradient-to-b from-slate-900 to-black hover:border-slate-600'
        } ${isSelectable ? 'cursor-pointer hover:scale-105' : ''}`}
      >
        <img
          src={getCardBackUrl(def.side_code || 'corp')}
          alt="Secured card back"
          className="w-full h-full object-cover rounded-lg shadow-inner"
          onError={(e) => {
            (e.currentTarget as HTMLElement).style.display = 'none';
          }}
        />

        {/* Fallback circuit badge if image is hidden */}
        <div className="absolute inset-1.5 rounded-lg border border-dashed border-slate-800/80 flex flex-col items-center justify-center opacity-70 pointer-events-none -z-0">
          <Lock className="w-6 h-6 text-slate-500 mb-1" />
          <span className="text-[10px] uppercase tracking-widest text-slate-500 font-mono font-bold">
            SECURED
          </span>
        </div>

        {/* Counter badges if advanced */}
        {card.advancementCounters > 0 && (
          <div className="absolute -top-2 -right-2 bg-amber-400 text-black font-bold px-2 py-0.5 rounded-full text-xs shadow-md z-20">
            ★ {card.advancementCounters}
          </div>
        )}

        {showTooltip && (
          <CardPopout
            card={card}
            targetRect={cardRef.current?.getBoundingClientRect() || null}
            isFaceDown={true}
            canPeek={false}
          />
        )}
      </div>
    );
  }

  // Card is visible (or Corp is peeking at their own unrezzed card!)
  const isCorp = def.side_code === 'corp';
  const isUnrezzed = isFaceDown || !card.isRezzed;
  const imageUrl = getCardImageUrl(card.cardCode);

  return (
    <div
      ref={cardRef}
      onClick={isSelectable ? onClick : undefined}
      onDoubleClick={() => onInspect && onInspect(card)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`relative ${sizeClasses} rounded-xl border-2 transition-all duration-200 select-none overflow-hidden group shadow-md ${
        isSelected
          ? 'border-cyber-neonCyan ring-4 ring-cyber-neonCyan/50 scale-105 z-20 shadow-cyan-500/30'
          : isUnrezzed
          ? 'border-cyan-700/80 bg-slate-950 hover:border-cyan-400 hover:shadow-cyan-500/20'
          : isCorp
          ? 'border-cyan-800 hover:border-cyan-400 bg-slate-950 hover:shadow-cyan-500/20'
          : 'border-pink-800 hover:border-pink-400 bg-slate-950 hover:shadow-pink-500/20'
      } ${isSelectable ? 'cursor-pointer hover:scale-105' : ''}`}
    >
      {/* High-Resolution Card Image */}
      {!imageError ? (
        <img
          src={imageUrl}
          alt={def.title}
          className={`w-full h-full object-cover object-center rounded-lg transition-opacity duration-200 ${
            isUnrezzed ? 'opacity-85 brightness-95' : 'opacity-100'
          }`}
          loading="lazy"
          onError={(e) => {
            // Fallback from local path to NetrunnerDB CDN URL
            const target = e.currentTarget;
            if (!target.src.includes('netrunnerdb.com')) {
              target.src = `https://card-images.netrunnerdb.com/v2/large/${card.cardCode}.jpg`;
            } else {
              setImageError(true);
            }
          }}
        />
      ) : (
        /* Fallback graphic placeholder if image completely fails */
        <div className="w-full h-full flex flex-col justify-between p-2 bg-slate-900 font-mono text-center">
          <div className="text-[10px] font-bold text-cyan-400 line-clamp-2">{def.title}</div>
          <div className="text-[9px] text-slate-500">{def.type_code}</div>
          <div className="text-[9px] text-amber-400">{def.cost !== null ? `${def.cost}c` : ''}</div>
        </div>
      )}

      {/* Unrezzed Blueprint Indicator for Corp */}
      {isUnrezzed && (
        <div className="absolute top-1 left-1 bg-cyan-950/90 text-cyan-300 border border-cyan-700/80 px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider uppercase shadow z-10 flex items-center gap-1 backdrop-blur-sm">
          <Eye className="w-2.5 h-2.5 text-cyan-400" />
          <span>Unrezzed</span>
        </div>
      )}

      {/* Advancement Counter Badge */}
      {card.advancementCounters > 0 && (
        <div className="absolute top-1 right-1 bg-amber-400 text-black font-extrabold px-1.5 py-0.5 rounded-full text-[10px] shadow-lg z-20 border border-amber-200">
          ★ {card.advancementCounters}
        </div>
      )}

      {/* Quick Inspect Button on Hover (Clicking opens large Modal) */}
      {onInspect && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onInspect(card);
          }}
          className="absolute bottom-1 right-1 bg-black/80 hover:bg-slate-800 text-slate-300 hover:text-white p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity z-20 border border-slate-700"
          title="Inspect full card details"
        >
          <Eye className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Hover Card Detail Popout (Rendered via Portal to Document Body) */}
      {showTooltip && (
        <CardPopout
          card={card}
          targetRect={cardRef.current?.getBoundingClientRect() || null}
          isFaceDown={isUnrezzed}
          canPeek={canPeek}
        />
      )}
    </div>
  );
};
