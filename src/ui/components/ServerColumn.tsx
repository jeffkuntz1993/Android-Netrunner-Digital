import React from 'react';
import { ServerState } from '../../core/types/state';
import { CardInstance } from '../../core/types/card';
import { CardView } from './CardView';
import { Database, Crosshair, Zap } from 'lucide-react';

interface ServerColumnProps {
  server: ServerState;
  activePlayer: 'corp' | 'runner';
  perspective?: 'both' | 'corp' | 'runner';
  cardSize?: 'sm' | 'md' | 'lg';
  isRunTarget?: boolean;
  onInitiateRun?: (serverId: string) => void;
  onSelectServer?: (serverId: string) => void;
  onRezCard?: (instanceId: string) => void;
  onInspectCard?: (card: CardInstance) => void;
}

export const ServerColumn: React.FC<ServerColumnProps> = ({
  server,
  activePlayer,
  perspective = 'both',
  cardSize = 'sm',
  isRunTarget = false,
  onInitiateRun,
  onSelectServer,
  onRezCard,
  onInspectCard,
}) => {
  const canCorpPeek = perspective !== 'runner';

  return (
    <div
      onClick={() => onSelectServer && onSelectServer(server.id)}
      className={`flex flex-col items-center bg-slate-900/70 border rounded-2xl p-3 min-w-[170px] sm:min-w-[190px] transition-all duration-200 shadow-lg ${
        isRunTarget
          ? 'border-cyber-neonPink ring-2 ring-cyber-neonPink/50 bg-pink-950/30'
          : 'border-slate-800 hover:border-slate-600'
      }`}
    >
      {/* Server Header */}
      <div className="flex items-center justify-between w-full mb-3 pb-1.5 border-b border-slate-800 text-xs font-mono">
        <span className="font-bold text-cyber-neonCyan flex items-center gap-1.5 truncate">
          <Database className="w-4 h-4 text-cyan-400 shrink-0" />
          <span className="truncate">{server.name}</span>
        </span>
        {activePlayer === 'runner' && onInitiateRun && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onInitiateRun(server.id);
            }}
            className="px-2 py-0.5 text-xs bg-pink-950/60 text-pink-400 hover:bg-cyber-neonPink hover:text-white rounded-md border border-pink-500 transition-colors flex items-center gap-1 font-bold shrink-0 ml-1"
            title="Initiate Run on this server"
          >
            <Crosshair className="w-3 h-3" /> Run
          </button>
        )}
      </div>

      {/* Protecting Ice (outermost ice at the top, innermost ice at the bottom) */}
      <div className="flex flex-col-reverse gap-2.5 my-2 w-full items-center min-h-[140px] border border-dashed border-slate-800/90 rounded-xl p-2 bg-black/40">
        <div className="text-[10px] text-slate-500 font-mono uppercase tracking-wider mb-0.5 font-bold">
          Ice Wall ({server.ice.length})
        </div>
        {server.ice.length === 0 ? (
          <span className="text-xs text-slate-600 italic py-4">No Ice Installed</span>
        ) : (
          server.ice.map((iceCard) => (
            <div key={iceCard.instanceId} className="flex flex-col items-center w-full">
              <CardView
                card={iceCard}
                isFaceDown={!iceCard.isRezzed}
                canPeek={canCorpPeek}
                size={cardSize}
                onInspect={onInspectCard}
              />
              {activePlayer === 'corp' && !iceCard.isRezzed && onRezCard && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRezCard(iceCard.instanceId);
                  }}
                  className="mt-1.5 w-full py-1 bg-cyan-950 hover:bg-cyan-800 text-cyan-300 hover:text-cyan-100 text-xs font-mono font-bold rounded-lg border border-cyan-600 shadow-md flex items-center justify-center gap-1 transition-all"
                  title={`Rez ${iceCard.def.title} for ${iceCard.def.cost || 0} credits`}
                >
                  <Zap className="w-3.5 h-3.5 text-amber-400" /> Rez ({iceCard.def.cost || 0}c)
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {/* Server Root (Agendas, Assets, Upgrades) */}
      <div className="flex flex-col items-center gap-1.5 w-full mt-auto pt-2.5 border-t border-slate-800">
        <div className="text-[10px] text-slate-500 font-mono uppercase tracking-wider font-bold">
          Root ({server.root.length})
        </div>
        <div className="flex gap-2 flex-wrap justify-center min-h-[70px] w-full py-1">
          {server.root.length === 0 ? (
            <span className="text-xs text-slate-600 italic my-auto">Empty</span>
          ) : (
            server.root.map((card) => (
              <div key={card.instanceId} className="flex flex-col items-center">
                <CardView
                  card={card}
                  isFaceDown={!card.isRezzed}
                  canPeek={canCorpPeek}
                  size={cardSize}
                  onInspect={onInspectCard}
                />
                {activePlayer === 'corp' && !card.isRezzed && card.def.type_code !== 'agenda' && onRezCard && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRezCard(card.instanceId);
                    }}
                    className="mt-1 px-2 py-0.5 w-full bg-cyan-950 hover:bg-cyan-800 text-cyan-300 text-[11px] font-mono font-bold rounded border border-cyan-600 shadow flex items-center justify-center gap-1 transition-all"
                  >
                    <Zap className="w-3 h-3 text-amber-400" /> Rez ({card.def.cost || 0}c)
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
