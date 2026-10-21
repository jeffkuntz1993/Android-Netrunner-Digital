import React from 'react';
import { GameState } from '../../core/types/state';
import { CardInstance } from '../../core/types/card';
import { CardView } from './CardView';
import { cardDef } from '../../data/cards';
import { ArrowRight, LogOut, CheckCircle2, ShieldAlert } from 'lucide-react';

interface RunOverlayProps {
  state: GameState;
  onContinueRun: () => void;
  onJackOut: () => void;
  /** Present when the Corp may rez the approached ice (hot-seat rez window). */
  onRezApproachedIce?: () => void;
  onInspectCard?: (card: CardInstance) => void;
}

export const RunOverlay: React.FC<RunOverlayProps> = ({
  state,
  onContinueRun,
  onJackOut,
  onRezApproachedIce,
  onInspectCard,
}) => {
  const { activeRun } = state;
  if (!activeRun) return null;

  const server = state.corp.servers[activeRun.server];
  const currentIce =
    activeRun.icePosition !== null && server ? server.ice[activeRun.icePosition] : null;

  return (
    <div className="fixed inset-x-0 bottom-6 z-40 max-w-3xl mx-auto px-4 pointer-events-auto">
      <div className="bg-slate-950/95 border-2 border-cyber-neonPink rounded-2xl p-5 shadow-2xl backdrop-blur-xl animate-in slide-in-from-bottom duration-300">
        <div className="flex items-center justify-between border-b border-pink-900/50 pb-2.5 mb-3">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-cyber-neonPink"></span>
            </span>
            <h3 className="font-cyber font-bold text-cyber-neonPink text-sm tracking-wider">
              RUN IN PROGRESS // {server?.name?.toUpperCase()}
            </h3>
          </div>
          <span className="text-xs font-mono bg-pink-950 text-pink-300 px-2.5 py-1 rounded-lg border border-pink-700 font-bold">
            PHASE: {activeRun.phase.toUpperCase()}
          </span>
        </div>

        <div className="flex items-center gap-5 my-2">
          {currentIce ? (
            <div className="flex items-center gap-4 bg-black/60 p-3 rounded-2xl border border-slate-800 flex-1">
              <CardView
                card={currentIce}
                isFaceDown={!currentIce.isRezzed}
                canPeek={true}
                size="md"
                onInspect={onInspectCard}
              />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <ShieldAlert className="w-4 h-4 text-pink-400" />
                  <span className="text-sm font-bold text-slate-100 font-cyber">
                    {currentIce.isRezzed ? cardDef(currentIce).title : 'Unrezzed Ice Encounter'}
                  </span>
                </div>
                <div className="text-xs text-slate-400 font-mono leading-relaxed">
                  {currentIce.isRezzed ? (
                    <>
                      <div className="text-cyan-300 font-bold">
                        Strength: {cardDef(currentIce).strength ?? 0} • {cardDef(currentIce).keywords}
                      </div>
                      <div className="text-[11px] text-slate-300 mt-1 line-clamp-2">
                        {cardDef(currentIce).text}
                      </div>
                    </>
                  ) : (
                    'Ice is unrezzed. Corporation has a rez window before the Runner encounters subroutines.'
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 text-sm font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-800 p-4 rounded-2xl flex-1">
              <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
              <span>Breached Ice defense! Approaching server root to access files.</span>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-col gap-2 shrink-0">
            {currentIce && onRezApproachedIce && (
              <button
                onClick={onRezApproachedIce}
                className="px-5 py-2 bg-cyan-700 hover:bg-cyan-600 text-white font-mono text-xs font-bold rounded-xl border border-cyan-400 flex items-center justify-center gap-1.5 transition-colors"
                title="Corp rez window: rez this ice before the Runner continues"
              >
                <ShieldAlert className="w-4 h-4" /> Corp: Rez ({cardDef(currentIce).cost || 0}c)
              </button>
            )}
            <button
              onClick={onContinueRun}
              className="px-5 py-2.5 bg-cyber-neonPink hover:bg-pink-600 text-white font-mono text-xs font-bold rounded-xl shadow-lg flex items-center justify-center gap-1.5 transition-all hover:scale-105"
            >
              Continue Run <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={onJackOut}
              className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-xs font-semibold rounded-xl border border-slate-700 flex items-center justify-center gap-1.5 transition-colors"
            >
              <LogOut className="w-4 h-4" /> Jack Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
