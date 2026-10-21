import React, { useState } from 'react';
import { createInitialGameState } from './core/engine/gameState';
import { executeAction } from './core/engine/gameEngine';
import {
  CORP_STARTER_IDENTITY,
  RUNNER_STARTER_IDENTITY,
  getStarterCorpDeck,
  getStarterRunnerDeck,
} from './data/starterDecks';
import { CardInstance } from './core/types/card';
import { CardView } from './ui/components/CardView';
import { ServerColumn } from './ui/components/ServerColumn';
import { RigView } from './ui/components/RigView';
import { RunOverlay } from './ui/components/RunOverlay';
import { LogFeed } from './ui/components/LogFeed';
import {
  Coins,
  Clock,
  Shield,
  Zap,
  RotateCcw,
  Plus,
  Play,
  Layers,
  Award,
} from 'lucide-react';

export default function App() {
  const [gameState, setGameState] = useState(() =>
    createInitialGameState(
      CORP_STARTER_IDENTITY,
      getStarterCorpDeck(),
      RUNNER_STARTER_IDENTITY,
      getStarterRunnerDeck()
    )
  );

  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [perspective, setPerspective] = useState<'both' | 'corp' | 'runner'>('both');

  const handleAction = (action: any) => {
    try {
      const nextState = executeAction(gameState, action);
      setGameState(nextState);
      setSelectedCardId(null);
    } catch (err: any) {
      alert(err.message || 'Illegal action');
    }
  };

  const resetGame = () => {
    setGameState(
      createInitialGameState(
        CORP_STARTER_IDENTITY,
        getStarterCorpDeck(),
        RUNNER_STARTER_IDENTITY,
        getStarterRunnerDeck()
      )
    );
    setSelectedCardId(null);
  };

  const { corp, runner, activePlayer, phase, activeRun, winner, winReason } = gameState;

  return (
    <div className="min-h-screen bg-[#08090d] text-slate-100 flex flex-col font-mono selection:bg-cyber-neonCyan selection:text-black">
      {/* Top Header Bar */}
      <header className="h-14 border-b border-slate-800 bg-slate-950/80 px-6 flex items-center justify-between backdrop-blur-md sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <span className="font-cyber font-black tracking-widest text-lg bg-gradient-to-r from-cyber-neonCyan via-indigo-400 to-cyber-neonPink bg-clip-text text-transparent">
            NETRUNNER // PROTOCOL
          </span>
          <span className="text-xs bg-slate-900 border border-slate-700 px-2 py-0.5 rounded text-slate-400">
            TURN {gameState.turnNumber} • {activePlayer.toUpperCase()}'S TURN
          </span>
        </div>

        {/* Score Board */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-cyan-400">CORP</span>
            <div className="flex items-center bg-cyan-950/40 border border-cyan-800 px-2.5 py-0.5 rounded-full text-xs font-bold text-cyan-300">
              <Award className="w-3.5 h-3.5 mr-1" /> {corp.score} / 7
            </div>
          </div>
          <div className="text-slate-600 font-bold">vs</div>
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-pink-950/40 border border-pink-800 px-2.5 py-0.5 rounded-full text-xs font-bold text-pink-300">
              <Award className="w-3.5 h-3.5 mr-1" /> {runner.score} / 7
            </div>
            <span className="text-xs font-bold text-pink-400">RUNNER</span>
          </div>
        </div>

        {/* Mode controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={resetGame}
            className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded border border-slate-800 transition-colors"
            title="Reset Game"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Tabletop */}
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full flex flex-col gap-6">
        {/* Victory Banner */}
        {winner && (
          <div className="p-4 bg-gradient-to-r from-amber-950/60 to-purple-950/60 border-2 border-amber-500 rounded-2xl flex items-center justify-between shadow-2xl">
            <div>
              <h2 className="text-lg font-cyber font-black text-amber-400">
                GAME OVER // {winner.toUpperCase()} VICTORIOUS
              </h2>
              <p className="text-xs text-slate-300 mt-1">{winReason}</p>
            </div>
            <button
              onClick={resetGame}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-lg text-xs"
            >
              Play Again
            </button>
          </div>
        )}

        {/* CORP SECTOR (TOP HALF) */}
        <section className="bg-slate-950/40 border border-cyan-950/60 rounded-2xl p-5 shadow-lg relative">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-cyan-950">
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#00f0ff]" />
              <h2 className="font-cyber font-bold text-sm tracking-wider text-cyan-400">
                CORP INFRASTRUCTURE
              </h2>
              <span className="text-xs text-slate-400 font-mono">
                {corp.identity.def.title}
              </span>
            </div>

            {/* Corp Stats */}
            <div className="flex items-center gap-4 text-xs font-mono">
              <div className="flex items-center gap-1.5 bg-cyan-950/60 border border-cyan-800 px-3 py-1 rounded-lg text-cyan-300">
                <Coins className="w-4 h-4 text-amber-400" />
                <span className="font-bold">{corp.credits}</span> Credits
              </div>
              <div className="flex items-center gap-1.5 bg-cyan-950/60 border border-cyan-800 px-3 py-1 rounded-lg text-cyan-300">
                <Clock className="w-4 h-4 text-red-400" />
                <span className="font-bold">{corp.clicks}</span> / {corp.maxClicks} Clicks
              </div>
              <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-3 py-1 rounded-lg text-slate-400">
                <Layers className="w-4 h-4 text-slate-500" />
                <span>R&D: {corp.rd.length}</span>
              </div>
            </div>
          </div>

          {/* Servers Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 mb-4 overflow-x-auto">
            {Object.values(corp.servers).map((server) => (
              <ServerColumn
                key={server.id}
                server={server}
                activePlayer={activePlayer}
                onInitiateRun={(sId) =>
                  handleAction({ type: 'INITIATE_RUN', player: 'runner', targetServerId: sId })
                }
                onRezCard={(cId) =>
                  handleAction({ type: 'REZ_CARD', player: 'corp', cardInstanceId: cId })
                }
              />
            ))}
          </div>

          {/* Corp HQ Hand & Actions */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-3 border-t border-slate-900">
            <div>
              <div className="text-[11px] text-cyan-500 font-bold uppercase mb-1.5">
                HQ Hand ({corp.hq.length} / {corp.handSizeLimit})
              </div>
              <div className="flex gap-2 overflow-x-auto py-1">
                {corp.hq.map((card) => (
                  <CardView
                    key={card.instanceId}
                    card={card}
                    size="sm"
                    isSelectable={activePlayer === 'corp'}
                    isSelected={selectedCardId === card.instanceId}
                    onClick={() => setSelectedCardId(card.instanceId)}
                  />
                ))}
              </div>
            </div>

            {/* Corp Turn Actions */}
            {activePlayer === 'corp' && (
              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                <button
                  onClick={() => handleAction({ type: 'GAIN_CREDIT', player: 'corp' })}
                  disabled={corp.clicks < 1}
                  className="px-3 py-1.5 bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-700 text-cyan-200 text-xs font-bold rounded-lg transition-colors flex items-center gap-1 disabled:opacity-40"
                >
                  <Coins className="w-3.5 h-3.5 text-amber-400" /> +1 Credit
                </button>
                <button
                  onClick={() => handleAction({ type: 'DRAW_CARD', player: 'corp' })}
                  disabled={corp.clicks < 1}
                  className="px-3 py-1.5 bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-700 text-cyan-200 text-xs font-bold rounded-lg transition-colors flex items-center gap-1 disabled:opacity-40"
                >
                  <Layers className="w-3.5 h-3.5" /> Draw Card
                </button>
                {selectedCardId && (
                  <button
                    onClick={() => {
                      handleAction({
                        type: 'INSTALL_CARD',
                        player: 'corp',
                        cardInstanceId: selectedCardId,
                        asNewRemote: true,
                      });
                    }}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold rounded-lg transition-colors flex items-center gap-1 shadow-md"
                  >
                    <Plus className="w-3.5 h-3.5" /> Install in New Remote
                  </button>
                )}
                <button
                  onClick={() => handleAction({ type: 'END_TURN', player: 'corp' })}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-lg border border-slate-700 transition-colors"
                >
                  End Turn
                </button>
              </div>
            )}
          </div>
        </section>

        {/* RUNNER SECTOR (BOTTOM HALF) */}
        <section className="bg-slate-950/40 border border-pink-950/60 rounded-2xl p-5 shadow-lg relative">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-pink-950">
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-pink-400 shadow-[0_0_8px_#ff0055]" />
              <h2 className="font-cyber font-bold text-sm tracking-wider text-pink-400">
                RUNNER TERMINAL
              </h2>
              <span className="text-xs text-slate-400 font-mono">
                {runner.identity.def.title}
              </span>
            </div>

            {/* Runner Stats */}
            <div className="flex items-center gap-4 text-xs font-mono">
              <div className="flex items-center gap-1.5 bg-pink-950/60 border border-pink-800 px-3 py-1 rounded-lg text-pink-300">
                <Coins className="w-4 h-4 text-amber-400" />
                <span className="font-bold">{runner.credits}</span> Credits
              </div>
              <div className="flex items-center gap-1.5 bg-pink-950/60 border border-pink-800 px-3 py-1 rounded-lg text-pink-300">
                <Clock className="w-4 h-4 text-red-400" />
                <span className="font-bold">{runner.clicks}</span> / {runner.maxClicks} Clicks
              </div>
              <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-3 py-1 rounded-lg text-slate-400">
                <Zap className="w-4 h-4 text-cyan-400" />
                <span>MU: {runner.memoryUnitsUsed} / {runner.memoryUnitsTotal}</span>
              </div>
            </div>
          </div>

          {/* Runner Rig (Installed Programs, Hardware, Resources) */}
          <div className="mb-4">
            <RigView rig={runner.rig} />
          </div>

          {/* Runner Grip Hand & Actions */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-3 border-t border-slate-900">
            <div>
              <div className="text-[11px] text-pink-500 font-bold uppercase mb-1.5">
                Grip Hand ({runner.grip.length} / {runner.handSizeLimit})
              </div>
              <div className="flex gap-2 overflow-x-auto py-1">
                {runner.grip.map((card) => (
                  <CardView
                    key={card.instanceId}
                    card={card}
                    size="sm"
                    isSelectable={activePlayer === 'runner'}
                    isSelected={selectedCardId === card.instanceId}
                    onClick={() => setSelectedCardId(card.instanceId)}
                  />
                ))}
              </div>
            </div>

            {/* Runner Turn Actions */}
            {activePlayer === 'runner' && (
              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                <button
                  onClick={() => handleAction({ type: 'GAIN_CREDIT', player: 'runner' })}
                  disabled={runner.clicks < 1}
                  className="px-3 py-1.5 bg-pink-950/80 hover:bg-pink-900 border border-pink-700 text-pink-200 text-xs font-bold rounded-lg transition-colors flex items-center gap-1 disabled:opacity-40"
                >
                  <Coins className="w-3.5 h-3.5 text-amber-400" /> +1 Credit
                </button>
                <button
                  onClick={() => handleAction({ type: 'DRAW_CARD', player: 'runner' })}
                  disabled={runner.clicks < 1}
                  className="px-3 py-1.5 bg-pink-950/80 hover:bg-pink-900 border border-pink-700 text-pink-200 text-xs font-bold rounded-lg transition-colors flex items-center gap-1 disabled:opacity-40"
                >
                  <Layers className="w-3.5 h-3.5" /> Draw Card
                </button>
                {selectedCardId && (
                  <button
                    onClick={() => {
                      handleAction({
                        type: 'INSTALL_CARD',
                        player: 'runner',
                        cardInstanceId: selectedCardId,
                      });
                    }}
                    className="px-3 py-1.5 bg-cyber-neonPink hover:bg-pink-600 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1 shadow-md"
                  >
                    <Plus className="w-3.5 h-3.5" /> Install Card
                  </button>
                )}
                <button
                  onClick={() => handleAction({ type: 'END_TURN', player: 'runner' })}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-lg border border-slate-700 transition-colors"
                >
                  End Turn
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Live Action Terminal Log */}
        <section>
          <LogFeed logs={gameState.log} />
        </section>
      </main>

      {/* Active Run Overlay */}
      <RunOverlay
        state={gameState}
        onContinueRun={() => handleAction({ type: 'CONTINUE_RUN', player: 'runner' })}
        onJackOut={() => handleAction({ type: 'JACK_OUT', player: 'runner' })}
      />
    </div>
  );
}
