import React, { useState } from 'react';
import {
  CardInstance,
  GameAction,
  cardDef,
  createInitialGameState,
  executeAction,
  findCardAnywhere,
  getCardScript,
  getLegalActions,
  isLegalAction,
} from './core';
import { DECKS, DEFAULT_CORP_DECK, DEFAULT_RUNNER_DECK, deckGameSetup } from './data/decks';
import { DeckPicker } from './ui/components/DeckPicker';
import { CardView } from './ui/components/CardView';
import { ServerColumn } from './ui/components/ServerColumn';
import { RigView } from './ui/components/RigView';
import { RunOverlay } from './ui/components/RunOverlay';
import { LogFeed } from './ui/components/LogFeed';
import { PromptPanel } from './ui/components/PromptPanel';
import { CardZoomModal } from './ui/components/CardZoomModal';
import { AbilityBar } from './ui/components/AbilityBar';
import {
  Coins,
  Clock,
  RotateCcw,
  Plus,
  Layers,
  Award,
  Zap,
  ZoomIn,
  Eye,
  ArrowRight,
  Tag,
  Trash2,
  Biohazard,
} from 'lucide-react';

function randomSeed(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0];
}

interface GameConfig {
  seed: number;
  corpDeckId: string;
  runnerDeckId: string;
}

/**
 * `?seed=123&corp=<deck id>&runner=<deck id>` starts that exact game (to
 * replay a deal); without a seed the app opens on the deck picker.
 */
function configFromUrl(): GameConfig | null {
  const params = new URLSearchParams(window.location.search);
  const seed = Number(params.get('seed'));
  if (!Number.isInteger(seed) || seed <= 0) return null;
  const known = (id: string | null, side: 'corp' | 'runner') => DECKS.some(d => d.id === id && d.side === side);
  const corp = params.get('corp');
  const runner = params.get('runner');
  return {
    seed,
    corpDeckId: known(corp, 'corp') ? corp! : DEFAULT_CORP_DECK,
    runnerDeckId: known(runner, 'runner') ? runner! : DEFAULT_RUNNER_DECK,
  };
}

export default function App() {
  const [config, setConfig] = useState<GameConfig | null>(configFromUrl);
  const [lastDecks, setLastDecks] = useState({ corp: DEFAULT_CORP_DECK, runner: DEFAULT_RUNNER_DECK });

  if (!config) {
    return (
      <DeckPicker
        initialCorpDeckId={lastDecks.corp}
        initialRunnerDeckId={lastDecks.runner}
        onStart={(corpDeckId, runnerDeckId) => {
          setLastDecks({ corp: corpDeckId, runner: runnerDeckId });
          setConfig({ seed: randomSeed(), corpDeckId, runnerDeckId });
        }}
      />
    );
  }
  return <Game key={config.seed} config={config} onNewGame={() => setConfig(null)} />;
}

function Game({ config, onNewGame }: { config: GameConfig; onNewGame: () => void }) {
  const [gameState, setGameState] = useState(() =>
    createInitialGameState(deckGameSetup(config.seed, config.corpDeckId, config.runnerDeckId))
  );

  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [perspective, setPerspective] = useState<'both' | 'corp' | 'runner'>('both');
  const [cardScale, setCardScale] = useState<'normal' | 'large' | 'huge'>('large');
  const [inspectedCard, setInspectedCard] = useState<CardInstance | null>(null);

  const handleAction = (action: GameAction) => {
    try {
      const nextState = executeAction(gameState, action);
      setGameState(nextState);
      setSelectedCardId(null);
    } catch (err: any) {
      alert(err.message || 'Illegal action');
    }
  };

  const resetGame = onNewGame;

  const { corp, runner, activePlayer, activeRun, winner, winReason } = gameState;

  const selectedCard = [...corp.hq, ...runner.grip].find(c => c.instanceId === selectedCardId);
  const selectedIsPlayable = selectedCard && ['operation', 'event'].includes(cardDef(selectedCard).type_code);
  const playButton = (side: 'corp' | 'runner') => {
    if (!selectedCard || !selectedIsPlayable || cardDef(selectedCard).side_code !== side) return null;
    const action: GameAction = { type: 'PLAY_OPERATION_OR_EVENT', player: side, cardInstanceId: selectedCard.instanceId };
    const implemented = Boolean(getCardScript(selectedCard.cardCode)?.onPlay);
    return (
      <button
        onClick={() => handleAction(action)}
        disabled={!isLegalAction(gameState, action)}
        title={implemented ? undefined : 'This card\'s effect is not implemented yet'}
        className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-lg disabled:opacity-40 disabled:animate-none animate-pulse"
      >
        <Zap className="w-3.5 h-3.5" /> {implemented ? `Play ${cardDef(selectedCard).title}` : 'Effect not implemented yet'}
      </button>
    );
  };

  const rezAction = (card: CardInstance): GameAction => ({ type: 'REZ_CARD', player: 'corp', cardInstanceId: card.instanceId });
  const approachedIce =
    activeRun && activeRun.phase === 'approach_ice' && activeRun.icePosition !== null
      ? corp.servers[activeRun.server]?.ice[activeRun.icePosition]
      : undefined;

  // Determine size classes according to selected scale
  const handCardSize = cardScale === 'huge' ? 'xl' : cardScale === 'large' ? 'lg' : 'md';
  const boardCardSize = cardScale === 'huge' ? 'lg' : cardScale === 'large' ? 'md' : 'sm';

  return (
    <div className="min-h-screen bg-[#07080c] text-slate-100 flex flex-col font-mono selection:bg-cyber-neonCyan selection:text-black">
      {/* Top Header Bar */}
      <header className="h-16 border-b border-slate-800 bg-slate-950/90 px-4 sm:px-6 flex items-center justify-between backdrop-blur-md sticky top-0 z-30 shadow-lg">
        <div className="flex items-center gap-3">
          <span className="font-cyber font-black tracking-widest text-base sm:text-lg bg-gradient-to-r from-cyber-neonCyan via-indigo-400 to-cyber-neonPink bg-clip-text text-transparent">
            NETRUNNER // PROTOCOL
          </span>
          <div className="flex items-center gap-1.5">
            <span className="text-xs bg-slate-900 border border-slate-700 px-2.5 py-1 rounded text-slate-300 font-bold hidden sm:inline">
              TURN {gameState.turnNumber} • {activePlayer.toUpperCase()}'S TURN
            </span>
            <span
              className="text-[10px] text-slate-500 font-mono hidden md:inline"
              title={`Open the app with ?seed=${gameState.rng.seed}&corp=${config.corpDeckId}&runner=${config.runnerDeckId} to replay this deal`}
            >
              SEED {gameState.rng.seed}
            </span>
            {/* Quick Sticky End Turn Button */}
            <button
              onClick={() => handleAction({ type: 'END_TURN', player: activePlayer })}
              disabled={!isLegalAction(gameState, { type: 'END_TURN', player: activePlayer })}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-all shadow flex items-center gap-1 disabled:opacity-40 ${
                activePlayer === 'corp'
                  ? 'bg-cyan-700 hover:bg-cyan-600 text-white border-cyan-500 shadow-cyan-950'
                  : 'bg-pink-700 hover:bg-pink-600 text-white border-pink-500 shadow-pink-950'
              }`}
              title={`End ${activePlayer.toUpperCase()}'s turn`}
            >
              End Turn <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Score Board */}
        <div className="flex items-center gap-4 sm:gap-6">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-cyan-400">CORP</span>
            <div className="flex items-center bg-cyan-950/60 border border-cyan-800 px-2.5 sm:px-3 py-1 rounded-full text-xs font-bold text-cyan-300">
              <Award className="w-3.5 h-3.5 mr-1 text-cyan-400" /> {corp.score} / 7
            </div>
          </div>
          <div className="text-slate-600 font-bold text-xs sm:text-sm">vs</div>
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-pink-950/60 border border-pink-800 px-2.5 sm:px-3 py-1 rounded-full text-xs font-bold text-pink-300">
              <Award className="w-3.5 h-3.5 mr-1 text-pink-400" /> {runner.score} / 7
            </div>
            <span className="text-xs font-bold text-pink-400">RUNNER</span>
          </div>
        </div>

        {/* Card Zoom & Game Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Card Size Selector */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-xs">
            <span className="px-2 text-[10px] text-slate-500 font-bold uppercase hidden md:inline flex items-center gap-1">
              <ZoomIn className="w-3 h-3" /> Size:
            </span>
            <button
              onClick={() => setCardScale('normal')}
              className={`px-2 py-0.5 rounded text-xs transition-colors ${
                cardScale === 'normal'
                  ? 'bg-slate-700 text-white font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Normal
            </button>
            <button
              onClick={() => setCardScale('large')}
              className={`px-2 py-0.5 rounded text-xs transition-colors ${
                cardScale === 'large'
                  ? 'bg-cyan-600 text-white font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Large
            </button>
            <button
              onClick={() => setCardScale('huge')}
              className={`px-2 py-0.5 rounded text-xs transition-colors ${
                cardScale === 'huge'
                  ? 'bg-cyber-neonPink text-white font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Huge
            </button>
          </div>

          <button
            onClick={resetGame}
            className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg border border-slate-800 transition-colors"
            title="New game (pick decks)"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Tabletop */}
      <main className="flex-1 p-4 sm:p-6 max-w-7xl mx-auto w-full flex flex-col gap-6 overflow-hidden">
        {/* Victory Banner */}
        {winner && (
          <div className="p-5 bg-gradient-to-r from-amber-950/80 to-purple-950/80 border-2 border-amber-500 rounded-2xl flex items-center justify-between shadow-2xl">
            <div>
              <h2 className="text-xl font-cyber font-black text-amber-400">
                GAME OVER // {winner.toUpperCase()} VICTORIOUS
              </h2>
              <p className="text-xs text-slate-300 mt-1">{winReason}</p>
            </div>
            <button
              onClick={resetGame}
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl text-xs shadow-lg transition-colors"
            >
              Play Again
            </button>
          </div>
        )}

        {/* CORP SECTOR (TOP HALF) */}
        <section className="bg-slate-950/60 border border-cyan-950/80 rounded-3xl p-4 sm:p-6 shadow-xl relative backdrop-blur-sm w-full min-w-0">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-5 pb-3 border-b border-cyan-950">
            {/* Identity & Header */}
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_10px_#00f0ff]" />
              <div>
                <h2 className="font-cyber font-bold text-sm tracking-wider text-cyan-400">
                  CORP INFRASTRUCTURE
                </h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-slate-300 font-mono font-bold">
                    {cardDef(corp.identity).title}
                  </span>
                  <button
                    onClick={() => setInspectedCard(corp.identity)}
                    className="text-[10px] text-cyan-400 hover:text-cyan-200 border border-cyan-800/80 bg-cyan-950/40 px-1.5 py-0.5 rounded flex items-center gap-1 transition-colors"
                    title="Inspect Corp Identity card"
                  >
                    <Eye className="w-2.5 h-2.5" /> View ID
                  </button>
                </div>
              </div>
            </div>

            {/* Corp Stats */}
            <div className="flex items-center gap-3 text-xs font-mono flex-wrap">
              <div className="flex items-center gap-1.5 bg-cyan-950/80 border border-cyan-800 px-3 py-1.5 rounded-xl text-cyan-300 shadow">
                <Coins className="w-4 h-4 text-amber-400" />
                <span className="font-bold">{corp.credits}</span> Credits
              </div>
              <div className="flex items-center gap-1.5 bg-cyan-950/80 border border-cyan-800 px-3 py-1.5 rounded-xl text-cyan-300 shadow">
                <Clock className="w-4 h-4 text-red-400" />
                <span className="font-bold">{corp.clicks}</span> / {corp.maxClicks} Clicks
              </div>
              <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl text-slate-400 shadow">
                <Layers className="w-4 h-4 text-slate-500" />
                <span>R&D: {corp.rd.length}</span>
              </div>
            </div>
          </div>

          {/* Servers Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-5 overflow-x-auto pb-2 min-w-0">
            {Object.values(corp.servers).map((server) => (
              <ServerColumn
                key={server.id}
                server={server}
                activePlayer={activePlayer}
                perspective={perspective}
                cardSize={boardCardSize}
                onInitiateRun={(sId) =>
                  handleAction({ type: 'INITIATE_RUN', player: 'runner', targetServerId: sId })
                }
                onRezCard={(cId) =>
                  handleAction({ type: 'REZ_CARD', player: 'corp', cardInstanceId: cId })
                }
                onAdvanceCard={(cId, sId) =>
                  handleAction({ type: 'ADVANCE_CARD', player: 'corp', cardInstanceId: cId, serverId: sId })
                }
                onScoreCard={(cId) =>
                  handleAction({ type: 'SCORE_AGENDA', player: 'corp', cardInstanceId: cId })
                }
                canRez={(card) => isLegalAction(gameState, rezAction(card))}
                canAdvance={(card) =>
                  isLegalAction(gameState, { type: 'ADVANCE_CARD', player: 'corp', cardInstanceId: card.instanceId, serverId: server.id })
                }
                canScore={(card) =>
                  isLegalAction(gameState, { type: 'SCORE_AGENDA', player: 'corp', cardInstanceId: card.instanceId })
                }
                onInspectCard={(card) => setInspectedCard(card)}
              />
            ))}
          </div>

          {/* Dedicated Corp Action Bar (Always fully on-screen) */}
          {activePlayer === 'corp' && (
            <div className="flex items-center justify-between flex-wrap gap-3 p-3 bg-cyan-950/40 border border-cyan-800/80 rounded-2xl mb-4 shadow-inner">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-cyan-400 font-mono uppercase mr-1">
                  Corp Actions ({corp.clicks} Clicks):
                </span>
                <button
                  onClick={() => handleAction({ type: 'GAIN_CREDIT', player: 'corp' })}
                  disabled={corp.clicks < 1}
                  className="px-3.5 py-1.5 bg-cyan-950 hover:bg-cyan-900 border border-cyan-700 text-cyan-200 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 disabled:opacity-40 shadow"
                >
                  <Coins className="w-3.5 h-3.5 text-amber-400" /> +1 Credit
                </button>
                <button
                  onClick={() => handleAction({ type: 'DRAW_CARD', player: 'corp' })}
                  disabled={corp.clicks < 1}
                  className="px-3.5 py-1.5 bg-cyan-950 hover:bg-cyan-900 border border-cyan-700 text-cyan-200 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 disabled:opacity-40 shadow"
                >
                  <Layers className="w-3.5 h-3.5 text-cyan-400" /> Draw Card
                </button>
                <button
                  onClick={() => handleAction({ type: 'PURGE_VIRUS', player: 'corp' })}
                  disabled={!isLegalAction(gameState, { type: 'PURGE_VIRUS', player: 'corp' })}
                  className="px-3.5 py-1.5 bg-cyan-950 hover:bg-cyan-900 border border-cyan-700 text-cyan-200 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 disabled:opacity-40 shadow"
                  title="Spend 3 clicks to remove every virus counter"
                >
                  <Biohazard className="w-3.5 h-3.5 text-lime-400" /> Purge (3 clicks)
                </button>
                {getLegalActions(gameState, 'corp')
                  .filter(a => a.type === 'TRASH_RESOURCE')
                  .map(a => {
                    const res = a.type === 'TRASH_RESOURCE' ? findCardAnywhere(gameState, a.cardInstanceId) : undefined;
                    return (
                      <button
                        key={a.type === 'TRASH_RESOURCE' ? a.cardInstanceId : ''}
                        onClick={() => handleAction(a)}
                        className="px-3.5 py-1.5 bg-red-950 hover:bg-red-900 border border-red-700 text-red-200 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow"
                        title="The Runner is tagged: spend a click and 2 credits to trash this resource"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Trash {res ? cardDef(res).title : 'resource'} (2c)
                      </button>
                    );
                  })}
                {playButton('corp')}
                {selectedCardId && !selectedIsPlayable && (
                  <button
                    onClick={() => {
                      handleAction({
                        type: 'INSTALL_CARD',
                        player: 'corp',
                        cardInstanceId: selectedCardId,
                        asNewRemote: true,
                      });
                    }}
                    className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-lg animate-pulse"
                  >
                    <Plus className="w-3.5 h-3.5" /> Install in New Remote
                  </button>
                )}
              </div>

              {/* End Turn Button - Prominently Anchored */}
              <button
                onClick={() => handleAction({ type: 'END_TURN', player: 'corp' })}
              disabled={!isLegalAction(gameState, { type: 'END_TURN', player: 'corp' })}
                className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-mono text-xs font-bold rounded-xl border border-cyan-400 transition-all shadow-lg shadow-cyan-950 flex items-center gap-1.5 ml-auto hover:scale-105 disabled:opacity-40 disabled:hover:scale-100"
              >
                End Corp Turn <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <AbilityBar state={gameState} side="corp" onAction={handleAction} />

          {/* Corp HQ Hand (Full Width with min-w-0 for safe scrolling) */}
          <div className="w-full min-w-0 pt-3 border-t border-slate-900">
            <div className="text-xs text-cyan-400 font-bold uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>HQ Hand ({corp.hq.length} / {corp.handSizeLimit})</span>
              <span className="text-[10px] text-slate-500 lowercase">hover to preview • double-click to inspect</span>
            </div>
            <div className="flex gap-3 overflow-x-auto min-w-0 py-2 w-full">
              {corp.hq.map((card) => (
                <CardView
                  key={card.instanceId}
                  card={card}
                  size={handCardSize}
                  isSelectable={activePlayer === 'corp'}
                  isSelected={selectedCardId === card.instanceId}
                  onClick={() => setSelectedCardId(card.instanceId)}
                  onInspect={setInspectedCard}
                />
              ))}
            </div>
          </div>
        </section>

        {/* RUNNER SECTOR (BOTTOM HALF) */}
        <section className="bg-slate-950/60 border border-pink-950/80 rounded-3xl p-4 sm:p-6 shadow-xl relative backdrop-blur-sm w-full min-w-0">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-5 pb-3 border-b border-pink-950">
            {/* Identity & Header */}
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full bg-pink-400 shadow-[0_0_10px_#ff0055]" />
              <div>
                <h2 className="font-cyber font-bold text-sm tracking-wider text-pink-400">
                  RUNNER TERMINAL
                </h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-slate-300 font-mono font-bold">
                    {cardDef(runner.identity).title}
                  </span>
                  <button
                    onClick={() => setInspectedCard(runner.identity)}
                    className="text-[10px] text-pink-400 hover:text-pink-200 border border-pink-800/80 bg-pink-950/40 px-1.5 py-0.5 rounded flex items-center gap-1 transition-colors"
                    title="Inspect Runner Identity card"
                  >
                    <Eye className="w-2.5 h-2.5" /> View ID
                  </button>
                </div>
              </div>
            </div>

            {/* Runner Stats */}
            <div className="flex items-center gap-3 text-xs font-mono flex-wrap">
              <div className="flex items-center gap-1.5 bg-pink-950/80 border border-pink-800 px-3 py-1.5 rounded-xl text-pink-300 shadow">
                <Coins className="w-4 h-4 text-amber-400" />
                <span className="font-bold">{runner.credits}</span> Credits
              </div>
              <div className="flex items-center gap-1.5 bg-pink-950/80 border border-pink-800 px-3 py-1.5 rounded-xl text-pink-300 shadow">
                <Clock className="w-4 h-4 text-red-400" />
                <span className="font-bold">{runner.clicks}</span> / {runner.maxClicks} Clicks
              </div>
              <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl text-slate-400 shadow">
                <Zap className="w-4 h-4 text-cyan-400" />
                <span>MU: {runner.memoryUnitsUsed} / {runner.memoryUnitsTotal}</span>
              </div>
              <div
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl shadow border ${
                  runner.tags > 0 ? 'bg-red-950 border-red-700 text-red-300' : 'bg-slate-900 border-slate-800 text-slate-400'
                }`}
                data-testid="runner-tags"
              >
                <Tag className="w-4 h-4" />
                <span className="font-bold">{runner.tags}</span> Tag{runner.tags === 1 ? '' : 's'}
              </div>
              {runner.coreDamage > 0 && (
                <div className="flex items-center gap-1.5 bg-red-950 border border-red-800 px-3 py-1.5 rounded-xl text-red-300 shadow">
                  <span className="font-bold">{runner.coreDamage}</span> Core damage
                </div>
              )}
            </div>
          </div>

          {/* Runner Rig (Installed Programs, Hardware, Resources) */}
          <div className="mb-5 min-w-0">
            <RigView
              rig={runner.rig}
              cardSize={boardCardSize}
              onInspectCard={setInspectedCard}
            />
          </div>

          {/* Dedicated Runner Action Bar (Always fully on-screen) */}
          {activePlayer === 'runner' && (
            <div className="flex items-center justify-between flex-wrap gap-3 p-3 bg-pink-950/40 border border-pink-800/80 rounded-2xl mb-4 shadow-inner">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-pink-400 font-mono uppercase mr-1">
                  Runner Actions ({runner.clicks} Clicks):
                </span>
                <button
                  onClick={() => handleAction({ type: 'GAIN_CREDIT', player: 'runner' })}
                  disabled={runner.clicks < 1}
                  className="px-3.5 py-1.5 bg-pink-950 hover:bg-pink-900 border border-pink-700 text-pink-200 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 disabled:opacity-40 shadow"
                >
                  <Coins className="w-3.5 h-3.5 text-amber-400" /> +1 Credit
                </button>
                <button
                  onClick={() => handleAction({ type: 'DRAW_CARD', player: 'runner' })}
                  disabled={runner.clicks < 1}
                  className="px-3.5 py-1.5 bg-pink-950 hover:bg-pink-900 border border-pink-700 text-pink-200 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 disabled:opacity-40 shadow"
                >
                  <Layers className="w-3.5 h-3.5 text-pink-400" /> Draw Card
                </button>
                {runner.tags > 0 && (
                  <button
                    onClick={() => handleAction({ type: 'REMOVE_TAG', player: 'runner' })}
                    disabled={!isLegalAction(gameState, { type: 'REMOVE_TAG', player: 'runner' })}
                    className="px-3.5 py-1.5 bg-pink-950 hover:bg-pink-900 border border-pink-700 text-pink-200 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 disabled:opacity-40 shadow"
                  >
                    <Tag className="w-3.5 h-3.5 text-red-400" /> Remove Tag (2c)
                  </button>
                )}
                {playButton('runner')}
                {selectedCardId &&
                  !selectedIsPlayable &&
                  selectedCard &&
                  getCardScript(selectedCard.cardCode)?.installsOnIce &&
                  getLegalActions(gameState, 'runner')
                    .filter(a => a.type === 'INSTALL_CARD' && a.cardInstanceId === selectedCardId && a.hostInstanceId)
                    .map(a => {
                      const host = a.type === 'INSTALL_CARD' && a.hostInstanceId ? findCardAnywhere(gameState, a.hostInstanceId) : undefined;
                      const server = host && Object.values(corp.servers).find(s => s.ice.includes(host));
                      return (
                        <button
                          key={a.type === 'INSTALL_CARD' ? a.hostInstanceId : ''}
                          onClick={() => handleAction(a)}
                          className="px-4 py-1.5 bg-cyber-neonPink hover:bg-pink-600 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-lg"
                        >
                          <Plus className="w-3.5 h-3.5" /> Install on {host?.isRezzed ? cardDef(host).title : 'unrezzed ice'} ({server?.name})
                        </button>
                      );
                    })}
                {selectedCardId && !selectedIsPlayable && !(selectedCard && getCardScript(selectedCard.cardCode)?.installsOnIce) && (
                  <button
                    onClick={() => {
                      handleAction({
                        type: 'INSTALL_CARD',
                        player: 'runner',
                        cardInstanceId: selectedCardId,
                      });
                    }}
                    className="px-4 py-1.5 bg-cyber-neonPink hover:bg-pink-600 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-lg animate-pulse"
                  >
                    <Plus className="w-3.5 h-3.5" /> Install Card
                  </button>
                )}
              </div>

              {/* End Turn Button - Prominently Anchored */}
              <button
                onClick={() => handleAction({ type: 'END_TURN', player: 'runner' })}
              disabled={!isLegalAction(gameState, { type: 'END_TURN', player: 'runner' })}
                className="px-5 py-2 bg-cyber-neonPink hover:bg-pink-600 text-white font-mono text-xs font-bold rounded-xl border border-pink-400 transition-all shadow-lg shadow-pink-950 flex items-center gap-1.5 ml-auto hover:scale-105 disabled:opacity-40 disabled:hover:scale-100"
              >
                End Runner Turn <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <AbilityBar state={gameState} side="runner" onAction={handleAction} />

          {/* Runner Grip Hand (Full Width with min-w-0 for safe scrolling) */}
          <div className="w-full min-w-0 pt-3 border-t border-slate-900">
            <div className="text-xs text-pink-400 font-bold uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>Grip Hand ({runner.grip.length} / {runner.handSizeLimit})</span>
              <span className="text-[10px] text-slate-500 lowercase">hover to preview • double-click to inspect</span>
            </div>
            <div className="flex gap-3 overflow-x-auto min-w-0 py-2 w-full">
              {runner.grip.map((card) => (
                <CardView
                  key={card.instanceId}
                  card={card}
                  size={handCardSize}
                  isSelectable={activePlayer === 'runner'}
                  isSelected={selectedCardId === card.instanceId}
                  onClick={() => setSelectedCardId(card.instanceId)}
                  onInspect={setInspectedCard}
                />
              ))}
            </div>
          </div>
        </section>

        {/* Live Action Terminal Log */}
        <section className="min-w-0">
          <LogFeed logs={gameState.log} />
        </section>
      </main>

      {/* Active Run Overlay */}
      <RunOverlay
        state={gameState}
        onContinueRun={() => handleAction({ type: 'CONTINUE_RUN', player: 'runner' })}
        onJackOut={() => handleAction({ type: 'JACK_OUT', player: 'runner' })}
        onRezApproachedIce={
          approachedIce && isLegalAction(gameState, rezAction(approachedIce))
            ? () => handleAction(rezAction(approachedIce))
            : undefined
        }
        onInspectCard={setInspectedCard}
        onAction={handleAction}
      />

      {/* Pending player decision (mulligan, discard, trash on access) */}
      <PromptPanel
        state={gameState}
        onAnswer={(choice) => {
          const prompt = gameState.pendingPrompts[0];
          if (prompt) handleAction({ type: 'RESOLVE_PROMPT', player: prompt.side, promptId: prompt.id, choice });
        }}
        onInspectCard={setInspectedCard}
      />

      {/* Full Card Zoom Modal */}
      <CardZoomModal
        card={inspectedCard}
        onClose={() => setInspectedCard(null)}
      />
    </div>
  );
}
