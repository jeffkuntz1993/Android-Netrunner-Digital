import React from 'react';
import { createPortal } from 'react-dom';
import { CardInstance } from '../../core/types/card';
import { getCardImageUrl } from '../../data/cards';
import { X, Shield, Zap, Award, Trash2, Coins, AlertCircle } from 'lucide-react';

interface CardZoomModalProps {
  card: CardInstance | null;
  onClose: () => void;
  canPeek?: boolean;
}

export const CardZoomModal: React.FC<CardZoomModalProps> = ({
  card,
  onClose,
  canPeek = true,
}) => {
  if (!card) return null;
  const { def } = card;
  const isCorp = def.side_code === 'corp';

  return createPortal(
    <div
      onClick={onClose}
      className="fixed inset-0 z-[10000] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`relative max-w-2xl w-full bg-slate-950 border-2 rounded-2xl p-6 shadow-2xl flex flex-col md:flex-row gap-6 font-mono text-slate-100 ${
          isCorp ? 'border-cyan-500 shadow-cyan-950/50' : 'border-pink-500 shadow-pink-950/50'
        }`}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 bg-slate-900 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white border border-slate-800 transition-colors z-20"
          title="Close (Esc)"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Large Crisp Card Image */}
        <div className="w-full md:w-72 shrink-0 flex items-center justify-center">
          <img
            src={getCardImageUrl(card.cardCode)}
            alt={def.title}
            className="w-full h-auto max-h-[460px] object-contain rounded-xl shadow-2xl border border-slate-800"
            onError={(e) => {
              (e.target as HTMLImageElement).src = `https://card-images.netrunnerdb.com/v2/large/${card.cardCode}.jpg`;
            }}
          />
        </div>

        {/* Details & Rules Panel */}
        <div className="flex-1 flex flex-col justify-between overflow-y-auto max-h-[460px]">
          <div>
            {/* Header info */}
            <div className="flex items-center gap-2 mb-2 text-xs font-bold uppercase tracking-wider">
              <span
                className={`px-2 py-0.5 rounded border ${
                  isCorp
                    ? 'bg-cyan-950 border-cyan-700 text-cyan-300'
                    : 'bg-pink-950 border-pink-700 text-pink-300'
                }`}
              >
                {def.side_code} // {def.type_code}
              </span>
              {!card.isRezzed && (
                <span className="px-2 py-0.5 rounded border bg-amber-950 border-amber-600 text-amber-300 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> Unrezzed
                </span>
              )}
            </div>

            <h2 className={`text-2xl font-cyber font-black ${isCorp ? 'text-cyan-300' : 'text-pink-300'}`}>
              {def.title}
            </h2>
            <p className="text-sm text-slate-400 italic mb-4">
              {def.keywords || def.faction_code.replace('-', ' ').toUpperCase()}
            </p>

            {/* Stats row */}
            <div className="flex flex-wrap gap-2 mb-4 text-xs">
              {def.cost !== null && def.cost !== undefined && (
                <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg">
                  <Coins className="w-4 h-4 text-amber-400" />
                  <span className="text-slate-400">Cost:</span>
                  <span className="font-bold text-amber-300">{def.cost} Credits</span>
                </div>
              )}
              {def.strength !== null && def.strength !== undefined && (
                <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg">
                  <Shield className="w-4 h-4 text-cyan-400" />
                  <span className="text-slate-400">Strength:</span>
                  <span className="font-bold text-cyan-300">{def.strength}</span>
                </div>
              )}
              {def.agenda_points !== undefined && (
                <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg">
                  <Award className="w-4 h-4 text-cyan-400" />
                  <span className="text-slate-400">Agenda Points:</span>
                  <span className="font-bold text-cyan-300">
                    {def.agenda_points} (Req: {def.advancement_cost || 0})
                  </span>
                </div>
              )}
              {def.memory_cost !== null && def.memory_cost !== undefined && (
                <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg">
                  <Zap className="w-4 h-4 text-pink-400" />
                  <span className="text-slate-400">Memory:</span>
                  <span className="font-bold text-pink-300">{def.memory_cost} MU</span>
                </div>
              )}
              {def.trash_cost !== null && def.trash_cost !== undefined && (
                <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg">
                  <Trash2 className="w-4 h-4 text-red-400" />
                  <span className="text-slate-400">Trash:</span>
                  <span className="font-bold text-red-300">{def.trash_cost} Credits</span>
                </div>
              )}
            </div>

            {/* Rules Text */}
            {def.text && (
              <div className="bg-slate-900/80 rounded-xl p-4 border border-slate-800 text-sm leading-relaxed mb-4">
                <div
                  dangerouslySetInnerHTML={{
                    __html: def.text
                      .replace(/\[credit\]/g, ' 🪙 ')
                      .replace(/\[click\]/g, ' ⏱️ ')
                      .replace(/\[subroutine\]/g, '<span class="text-cyan-400 font-bold block mt-1">↳ Subroutine: </span>')
                      .replace(/\[trash\]/g, ' 🗑️ ')
                      .replace(/\[recurring-credit\]/g, ' 🔄🪙 ')
                      .replace(/\[link\]/g, ' 🔗 ')
                      .replace(/\n/g, '<br />'),
                  }}
                />
              </div>
            )}
          </div>

          {/* Flavor Text */}
          {def.flavor && (
            <div className="text-xs text-slate-400 italic border-t border-slate-900 pt-3">
              "{def.flavor}"
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
