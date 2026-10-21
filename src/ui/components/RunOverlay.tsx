import React from 'react';
import { GameState } from '../../core/types/state';
import { CardView } from './CardView';
import { AlertTriangle, ArrowRight, LogOut, CheckCircle2 } from 'lucide-react';

interface RunOverlayProps {
  state: GameState;
  onContinueRun: () => void;
  onJackOut: () => void;
}

export const RunOverlay: React.FC<RunOverlayProps> = ({
  state,
  onContinueRun,
  onJackOut,
}) => {
  const { activeRun } = state;
  if (!activeRun) return null;

  const server = state.corp.servers[activeRun.server];
  const currentIce =
    activeRun.icePosition !== null && server ? server.ice[activeRun.icePosition] : null;

  return (
    <div className="fixed inset-x-0 bottom-4 z-40 max-w-2xl mx-auto px-4 pointer-events-auto">
      <div className="bg-slate-950/95 border-2 border-cyber-neonPink rounded-2xl p-4 shadow-2xl backdrop-blur-lg animate-in slide-in-from-bottom duration-300">
        <div className="flex items-center justify-between border-b border-pink-900/50 pb-2 mb-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-cyber-neonPink"></span>
            </span>
            <h3 className="font-cyber font-bold text-cyber-neonPink text-sm tracking-wider">
              RUN IN PROGRESS // {server?.name?.toUpperCase()}
            </h3>
          </div>
          <span className="text-xs font-mono bg-pink-950 text-pink-300 px-2 py-0.5 rounded border border-pink-700">
            PHASE: {activeRun.phase.toUpperCase()}
          </span>
        </div>

        <div className="flex items-center gap-4 my-2">
          {currentIce ? (
            <div className="flex items-center gap-3 bg-black/40 p-2 rounded-xl border border-slate-800 flex-1">
              <CardView card={currentIce} isFaceDown={!currentIce.isRezzed} size="sm" />
              <div>
                <div className="text-xs font-bold text-slate-200">
                  {currentIce.isRezzed ? currentIce.def.title : 'Unrezzed Ice Position'}
                </div>
                <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                  {currentIce.isRezzed
                    ? `Strength: ${currentIce.def.strength || 0} | ${currentIce.def.keywords || ''}`
                    : 'Corp has a rez window before encounter.'}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 bg-emerald-950/30 border border-emerald-800 p-3 rounded-xl flex-1">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <span>Approaching server root! Accessing confidential files next.</span>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-col gap-2">
            <button
              onClick={onContinueRun}
              className="px-4 py-2 bg-cyber-neonPink hover:bg-pink-600 text-white font-mono text-xs font-bold rounded-lg shadow-lg flex items-center justify-center gap-1.5 transition-colors"
            >
              Continue Run <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onJackOut}
              className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-xs font-semibold rounded-lg border border-slate-700 flex items-center justify-center gap-1.5 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" /> Jack Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
