import React from 'react';
import { ServerState } from '../../core/types/state';
import { CardView } from './CardView';
import { Shield, Database, Crosshair, Plus } from 'lucide-react';

interface ServerColumnProps {
  server: ServerState;
  activePlayer: 'corp' | 'runner';
  isRunTarget?: boolean;
  onInitiateRun?: (serverId: string) => void;
  onSelectServer?: (serverId: string) => void;
  onRezCard?: (instanceId: string) => void;
}

export const ServerColumn: React.FC<ServerColumnProps> = ({
  server,
  activePlayer,
  isRunTarget = false,
  onInitiateRun,
  onSelectServer,
  onRezCard,
}) => {
  return (
    <div
      onClick={() => onSelectServer && onSelectServer(server.id)}
      className={`flex flex-col items-center bg-slate-900/60 border rounded-xl p-3 min-w-[130px] transition-all duration-200 ${
        isRunTarget
          ? 'border-cyber-neonPink ring-2 ring-cyber-neonPink/50 bg-pink-950/20'
          : 'border-slate-800 hover:border-slate-600'
      }`}
    >
      {/* Server Header */}
      <div className="flex items-center justify-between w-full mb-2 pb-1 border-b border-slate-800 text-xs font-mono">
        <span className="font-bold text-cyber-neonCyan flex items-center gap-1">
          <Database className="w-3.5 h-3.5" />
          {server.name}
        </span>
        {activePlayer === 'runner' && onInitiateRun && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onInitiateRun(server.id);
            }}
            className="px-1.5 py-0.5 text-[10px] bg-cyber-runner/20 text-pink-400 hover:bg-cyber-runner hover:text-white rounded border border-pink-500 transition-colors flex items-center gap-0.5"
            title="Initiate Run on this server"
          >
            <Crosshair className="w-2.5 h-2.5" /> Run
          </button>
        )}
      </div>

      {/* Protecting Ice (outermost ice at the top, innermost ice at the bottom) */}
      <div className="flex flex-col-reverse gap-1.5 my-2 w-full items-center min-h-[90px] border border-dashed border-slate-800/80 rounded-lg p-1.5 bg-black/30">
        <div className="text-[9px] text-slate-500 font-mono uppercase tracking-wider mb-0.5">
          Ice ({server.ice.length})
        </div>
        {server.ice.length === 0 ? (
          <span className="text-[10px] text-slate-600 italic py-2">No Ice</span>
        ) : (
          server.ice.map((iceCard, index) => (
            <div key={iceCard.instanceId} className="relative group">
              <CardView
                card={iceCard}
                isFaceDown={!iceCard.isRezzed}
                size="sm"
              />
              {activePlayer === 'corp' && !iceCard.isRezzed && onRezCard && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRezCard(iceCard.instanceId);
                  }}
                  className="absolute inset-0 bg-cyan-900/80 text-white font-mono text-[10px] font-bold rounded opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                >
                  Rez ({iceCard.def.cost || 0}c)
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {/* Server Root (Agendas, Assets, Upgrades) */}
      <div className="flex flex-col items-center gap-1 w-full mt-auto pt-2 border-t border-slate-800">
        <div className="text-[9px] text-slate-500 font-mono uppercase tracking-wider">
          Root ({server.root.length})
        </div>
        <div className="flex gap-1 flex-wrap justify-center min-h-[50px]">
          {server.root.length === 0 ? (
            <span className="text-[10px] text-slate-600 italic">Empty</span>
          ) : (
            server.root.map((card) => (
              <CardView
                key={card.instanceId}
                card={card}
                isFaceDown={!card.isRezzed}
                size="sm"
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
};
