import React from 'react';
import { ServerState } from '../../core/types/state';
import { CardInstance } from '../../core/types/card';
import { CardView } from './CardView';
import { cardDef } from '../../data/cards';
import { Database, Crosshair, Zap, ChevronsUp, Award } from 'lucide-react';
import { Credits } from './CreditIcon';

interface ServerColumnProps {
  server: ServerState;
  activePlayer: 'corp' | 'runner';
  perspective?: 'both' | 'corp' | 'runner';
  cardSize?: 'sm' | 'md' | 'lg';
  isRunTarget?: boolean;
  onInitiateRun?: (serverId: string) => void;
  onSelectServer?: (serverId: string) => void;
  onRezCard?: (instanceId: string) => void;
  onAdvanceCard?: (instanceId: string, serverId: string) => void;
  onScoreCard?: (instanceId: string) => void;
  /** Legality checks from the engine; buttons only show when the action is legal. */
  canRez?: (card: CardInstance) => boolean;
  canAdvance?: (card: CardInstance) => boolean;
  canScore?: (card: CardInstance) => boolean;
  onInspectCard?: (card: CardInstance) => void;
  /** A central server's own card, first in its root: HQ's identity, R&D's deck, the Archives pile. */
  anchor?: React.ReactNode;
}

/** Ice is drawn one size down, turned sideways, in a box with the card's height as its width. */
const ICE_SIZE = { sm: 'xs', md: 'sm', lg: 'md' } as const;
const SIDEWAYS_BOX = { sm: 'w-28 h-20', md: 'w-40 h-28', lg: 'w-52 h-36' } as const;

const smallButton =
  'mt-1 px-2 py-0.5 w-full bg-cyan-950 hover:bg-cyan-800 text-cyan-300 text-[11px] font-mono font-bold rounded border border-cyan-600 shadow flex items-center justify-center gap-1 transition-all';

export const ServerColumn: React.FC<ServerColumnProps> = ({
  server,
  activePlayer,
  perspective = 'both',
  cardSize = 'sm',
  isRunTarget = false,
  onInitiateRun,
  onSelectServer,
  onRezCard,
  onAdvanceCard,
  onScoreCard,
  canRez = () => false,
  canAdvance = () => false,
  canScore = () => false,
  onInspectCard,
  anchor,
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

      {/* Server Root on the Corp's side: the central's own card, then assets, agendas and upgrades side by side */}
      <div className="flex flex-col items-center gap-1.5 w-full pb-2.5 mb-2 border-b border-slate-800">
        <div className="text-[10px] text-slate-500 font-mono uppercase tracking-wider font-bold">
          Root ({server.root.length})
        </div>
        <div className="flex gap-2 flex-nowrap justify-center items-start min-h-[70px] w-full py-1">
          {anchor}
          {server.root.length === 0 && !anchor ? (
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
                {canRez(card) && onRezCard && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRezCard(card.instanceId);
                    }}
                    className={smallButton}
                  >
                    <Zap className="w-3 h-3 text-amber-400" /> Rez (<Credits amount={cardDef(card).cost || 0} />)
                  </button>
                )}
                {canAdvance(card) && onAdvanceCard && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onAdvanceCard(card.instanceId, server.id);
                    }}
                    className={smallButton}
                  >
                    <ChevronsUp className="w-3 h-3 text-amber-400" /> Advance ({card.advancementCounters}
                    {cardDef(card).advancement_cost ? `/${cardDef(card).advancement_cost}` : ''})
                  </button>
                )}
                {canScore(card) && onScoreCard && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onScoreCard(card.instanceId);
                    }}
                    className={smallButton}
                  >
                    <Award className="w-3 h-3 text-amber-400" /> Score
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
      {/* Protecting Ice, on the Runner's side of the root: innermost at the top, outermost at the bottom */}
      <div className="flex flex-col gap-2.5 mt-auto mb-1 w-full items-center min-h-[140px] border border-dashed border-slate-800/90 rounded-xl p-2 bg-black/40">
        <div className="text-[10px] text-slate-500 font-mono uppercase tracking-wider mb-0.5 font-bold">
          Ice Wall ({server.ice.length})
        </div>
        {server.ice.length === 0 ? (
          <span className="text-xs text-slate-600 italic py-4">No Ice Installed</span>
        ) : (
          server.ice.map((iceCard) => (
            <div key={iceCard.instanceId} className="flex flex-col items-center w-full">
              {/* Ice lies sideways, as on the table; the hover popout shows it upright */}
              <div className={`relative ${SIDEWAYS_BOX[cardSize]}`}>
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rotate-90">
                  <CardView
                    card={iceCard}
                    isFaceDown={!iceCard.isRezzed}
                    canPeek={canCorpPeek}
                    size={ICE_SIZE[cardSize]}
                    onInspect={onInspectCard}
                  />
                </div>
              </div>
              {canRez(iceCard) && onRezCard && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRezCard(iceCard.instanceId);
                  }}
                  className="mt-1.5 w-full py-1 bg-cyan-950 hover:bg-cyan-800 text-cyan-300 hover:text-cyan-100 text-xs font-mono font-bold rounded-lg border border-cyan-600 shadow-md flex items-center justify-center gap-1 transition-all"
                  title={`Rez ${cardDef(iceCard).title} for ${cardDef(iceCard).cost || 0} credits`}
                >
                  <Zap className="w-3.5 h-3.5 text-amber-400" /> Rez (<Credits amount={cardDef(iceCard).cost || 0} />)
                </button>
              )}
              {canAdvance(iceCard) && onAdvanceCard && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onAdvanceCard(iceCard.instanceId, server.id);
                  }}
                  className={smallButton}
                >
                  <ChevronsUp className="w-3 h-3 text-amber-400" /> Advance ({iceCard.advancementCounters})
                </button>
              )}
            </div>
          ))
        )}
      </div>

    </div>
  );
};
