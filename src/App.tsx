import React, { useEffect, useRef, useState } from 'react';
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
  SideCode,
} from './core';
import { Agent, createAgent } from './ai';
import { DECKS, DEFAULT_CORP_DECK, DEFAULT_RUNNER_DECK, DeckList, deckGameSetup } from './data/decks';
import { loadCustomDecks } from './data/customDecks';
import { DeckPicker } from './ui/components/DeckPicker';
import { CardView } from './ui/components/CardView';
import { ServerColumn } from './ui/components/ServerColumn';
import { RigView } from './ui/components/RigView';
import { RunOverlay } from './ui/components/RunOverlay';
import { LogFeed } from './ui/components/LogFeed';
import { PromptPanel } from './ui/components/PromptPanel';
import { CardZoomModal } from './ui/components/CardZoomModal';
import { AbilityBar } from './ui/components/AbilityBar';
import { ZoneGroup, ZoneViewer } from './ui/components/ZoneViewer';
import { Pile } from './ui/components/Pile';
import { HandoffScreen } from './ui/components/HandoffScreen';
import { GameOverModal } from './ui/components/GameOverModal';
import { ViewMode, Viewer, actingSide, canActAs, canSeeCorpSecrets, canSeeRunnerSecrets, corpRezWindow } from './ui/viewer';
import { playForLog, setSoundEnabled, soundEnabled } from './ui/sound';
import {
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
  Archive,
  Volume2,
  VolumeX,
  Ban,
} from 'lucide-react';
import { CreditIcon } from './ui/components/CreditIcon';

const VIEW_MODE_KEY = 'netrunner.viewMode';
const AI_DELAY_MS = 650;

function savedViewMode(): ViewMode {
  try {
    const v = window.localStorage.getItem(VIEW_MODE_KEY);
    if (v === 'open' || v === 'hotseat' || v === 'corp' || v === 'runner') return v;
  } catch {
    // Storage blocked: use the default
  }
  return 'open';
}

function randomSeed(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0];
}

interface GameConfig {
  seed: number;
  corpDeck: DeckList;
  runnerDeck: DeckList;
  /** The side the computer plays, or null for two people. */
  ai: SideCode | null;
}

/**
 * `?seed=123&corp=<deck id>&runner=<deck id>` starts that exact game (to
 * replay a deal), and `&ai=corp` or `&ai=runner` hands one side to the
 * computer; without a seed the app opens on the deck picker.
 */
function configFromUrl(): GameConfig | null {
  const params = new URLSearchParams(window.location.search);
  const seed = Number(params.get('seed'));
  if (!Number.isInteger(seed) || seed <= 0) return null;
  const decks = [...DECKS, ...loadCustomDecks()];
  const find = (id: string | null, side: 'corp' | 'runner', fallback: string) =>
    decks.find(d => d.id === id && d.side === side) ?? decks.find(d => d.id === fallback)!;
  return {
    seed,
    corpDeck: find(params.get('corp'), 'corp', DEFAULT_CORP_DECK),
    runnerDeck: find(params.get('runner'), 'runner', DEFAULT_RUNNER_DECK),
    ai: params.get('ai') === 'corp' || params.get('ai') === 'runner' ? (params.get('ai') as SideCode) : null,
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
        onStart={(corpDeck, runnerDeck, ai) => {
          setLastDecks({ corp: corpDeck.id, runner: runnerDeck.id });
          setConfig({ seed: randomSeed(), corpDeck, runnerDeck, ai });
        }}
      />
    );
  }
  return (
    <Game
      key={config.seed}
      config={config}
      onNewGame={() => {
        // Drop ?seed=... so a reload doesn't restart the old deal
        if (window.location.search) window.history.replaceState(null, '', window.location.pathname);
        setConfig(null);
      }}
      onRematch={() => {
        if (window.location.search) window.history.replaceState(null, '', window.location.pathname);
        setConfig({ ...config, seed: randomSeed() });
      }}
    />
  );
}

function Game({ config, onNewGame, onRematch }: { config: GameConfig; onNewGame: () => void; onRematch: () => void }) {
  const [gameOverHidden, setGameOverHidden] = useState(false);
  const [gameState, setGameState] = useState(() =>
    createInitialGameState(deckGameSetup(config.seed, config.corpDeck, config.runnerDeck))
  );

  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [cardScale, setCardScale] = useState<'normal' | 'large' | 'huge'>('normal');
  const [inspectedCard, setInspectedCard] = useState<CardInstance | null>(null);
  const [zone, setZone] = useState<'archives' | 'heap' | 'corp-score' | 'runner-score' | 'removed' | null>(null);
  const [sound, setSound] = useState(soundEnabled);

  // Who is looking. Pass and play shows one side at a time and hands over
  // (behind a cover screen) whenever the other side has to act.
  const [viewMode, setViewMode] = useState<ViewMode>(savedViewMode);
  const [hotseatSide, setHotseatSide] = useState<'corp' | 'runner'>('corp');
  // Runs started so far, and the Corp rez windows already passed, so each window asks once
  const [runSerial, setRunSerial] = useState(0);
  const [passedRezWindows, setPassedRezWindows] = useState<string[]>([]);
  // Cards the Runner accessed in the latest run, shown until dismissed or the next run
  const [accessed, setAccessed] = useState<string[]>([]);

  // Against the computer: the AI plays one side and the person sees their own
  // side (or everything, with Open table).
  const aiSide = config.ai;
  const humanSide: SideCode | null = aiSide === 'corp' ? 'runner' : aiSide === 'runner' ? 'corp' : null;
  const agentRef = useRef<Agent | null>(aiSide ? createAgent(aiSide) : null);

  // The Corp gets rez windows during runs in pass and play, and whenever the computer plays a side
  const rezWindowsOn = viewMode === 'hotseat' || aiSide !== null;
  const rezWindow = corpRezWindow(gameState, runSerial);
  const rezWindowOpen = rezWindowsOn && rezWindow !== null && !passedRezWindows.includes(rezWindow.key);
  const acting = actingSide(gameState, rezWindowOpen);
  const viewer: Viewer = humanSide
    ? viewMode === 'open' || gameState.winner
      ? 'both'
      : humanSide
    : viewMode === 'open'
      ? 'both'
      : viewMode === 'hotseat'
        ? gameState.winner
          ? 'both'
          : hotseatSide
        : viewMode;
  const handoffTo = !aiSide && viewMode === 'hotseat' && acting && acting !== hotseatSide ? acting : null;
  const corpCanAct = canActAs(viewer, 'corp') && aiSide !== 'corp';
  const runnerCanAct = canActAs(viewer, 'runner') && aiSide !== 'runner' && !rezWindowOpen;
  const aiThinking = aiSide !== null && acting === aiSide;

  useEffect(() => {
    if (aiSide) return; // the AI game's view choice doesn't replace the two-player default
    try {
      window.localStorage.setItem(VIEW_MODE_KEY, viewMode);
    } catch {
      // Not saved; the choice still applies to this game
    }
  }, [viewMode, aiSide]);

  const handleAction = (action: GameAction) => {
    try {
      const nextState = executeAction(gameState, action);
      if (!gameState.activeRun && nextState.activeRun) setRunSerial(n => n + 1);
      const newEntries = nextState.log.slice(gameState.log.length);
      playForLog(newEntries);
      const newlyAccessed = newEntries
        .filter(e => e.cardCode && e.message.startsWith('Runner accessed '))
        .map(e => e.cardCode!);
      const runStarted = !gameState.activeRun && nextState.activeRun;
      if (runStarted || newlyAccessed.length > 0) setAccessed(prev => [...(runStarted ? [] : prev), ...newlyAccessed]);
      setGameState(nextState);
      setSelectedCardId(null);
    } catch (err: any) {
      alert(err.message || 'Illegal action');
    }
  };

  // The computer moves on its own, after a short pause so its moves can be followed
  useEffect(() => {
    const agent = agentRef.current;
    if (!agent || !aiSide || gameState.winner || acting !== aiSide) return;
    const timer = window.setTimeout(() => {
      try {
        if (aiSide === 'corp' && rezWindowOpen && rezWindow) {
          const rez = agent.chooseRez?.(gameState, rezWindow.cards) ?? null;
          if (rez) handleAction(rez);
          else setPassedRezWindows(keys => [...keys, rezWindow.key]);
          return;
        }
        handleAction(agent.chooseAction(gameState));
      } catch (err) {
        console.error('AI failed to move', err);
      }
    }, AI_DELAY_MS);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState, acting, rezWindowOpen]);

  const zoneView: { title: string; groups: ZoneGroup[] } | null =
    zone === 'archives'
      ? {
          title: 'ARCHIVES',
          groups: [
            { label: 'Face up', cards: gameState.corp.archives.faceUp },
            { label: 'Face down', cards: gameState.corp.archives.faceDown, faceDown: true },
          ],
        }
      : zone === 'heap'
        ? { title: 'HEAP', groups: [{ label: 'Heap', cards: gameState.runner.heap }] }
        : zone === 'corp-score'
          ? { title: 'CORP SCORE AREA', groups: [{ label: 'Scored agendas', cards: gameState.corp.scoreArea }] }
          : zone === 'runner-score'
            ? { title: 'RUNNER SCORE AREA', groups: [{ label: 'Stolen agendas', cards: gameState.runner.scoreArea }] }
            : zone === 'removed'
              ? { title: 'REMOVED FROM GAME', groups: [{ label: 'Removed', cards: gameState.removedFromGame }] }
              : null;
  const zoneButton = (id: NonNullable<typeof zone>, label: string, count: number, icon: React.ReactNode) => (
    <button
      onClick={() => setZone(id)}
      data-testid={`zone-${id}`}
      className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-600 px-3 py-1.5 rounded-xl text-slate-300 shadow transition-colors"
      title={`Browse ${label}`}
    >
      {icon}
      <span>
        {label}: {count}
      </span>
    </button>
  );

  const resetGame = onNewGame;
  // Back to the deck picker; a game still in progress is lost, so ask first
  const leaveGame = () => {
    if (!gameState.winner && !window.confirm('Leave this game and go back to deck selection? The game in progress will be lost.')) return;
    onNewGame();
  };

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
  const handCardSize = cardScale === 'huge' ? 'lg' : cardScale === 'large' ? 'md' : 'sm';
  const boardCardSize = cardScale === 'huge' ? 'lg' : cardScale === 'large' ? 'md' : 'sm';

  return (
    <div className="min-h-screen bg-[#07080c] text-slate-100 flex flex-col font-mono selection:bg-cyber-neonCyan selection:text-black">
      {/* Top Header Bar */}
      <header className="h-16 border-b border-slate-800 bg-slate-950/90 px-4 sm:px-6 flex items-center justify-between backdrop-blur-md sticky top-0 z-30 shadow-lg">
        <div className="flex items-center gap-3">
          <button
            onClick={leaveGame}
            data-testid="home-logo"
            title="Back to deck selection"
            className="font-cyber font-black tracking-widest text-base sm:text-lg bg-gradient-to-r from-cyber-neonCyan via-indigo-400 to-cyber-neonPink bg-clip-text text-transparent hover:brightness-125 transition"
          >
            NETRUNNER // PROTOCOL
          </button>
          <div className="flex items-center gap-1.5">
            <span className="text-xs bg-slate-900 border border-slate-700 px-2.5 py-1 rounded text-slate-300 font-bold hidden sm:inline">
              TURN {gameState.turnNumber} • {activePlayer.toUpperCase()}'S TURN
            </span>
            <span
              className="text-[10px] text-slate-500 font-mono hidden md:inline"
              title={`Open the app with ?seed=${gameState.rng.seed}&corp=${config.corpDeck.id}&runner=${config.runnerDeck.id}${aiSide ? `&ai=${aiSide}` : ''} to replay this deal`}
            >
              SEED {gameState.rng.seed}
            </span>
            {aiSide && (
              <span
                data-testid="ai-status"
                className={`text-[10px] px-2 py-0.5 rounded border font-bold ${
                  aiThinking ? 'border-amber-500 text-amber-300 animate-pulse' : 'border-slate-700 text-slate-500'
                }`}
                title={`The computer plays the ${aiSide === 'corp' ? 'Corp' : 'Runner'}`}
              >
                {aiThinking ? 'AI THINKING…' : `AI: ${aiSide.toUpperCase()}`}
              </span>
            )}
            {/* Quick Sticky End Turn Button */}
            <button
              onClick={() => handleAction({ type: 'END_TURN', player: activePlayer })}
              disabled={
                !(activePlayer === 'corp' ? corpCanAct : runnerCanAct) ||
                !isLegalAction(gameState, { type: 'END_TURN', player: activePlayer })
              }
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

          {humanSide ? (
            <select
              value={viewMode === 'open' ? 'open' : humanSide}
              onChange={(e) => setViewMode(e.target.value as ViewMode)}
              aria-label="View"
              data-testid="view-mode"
              className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs text-slate-300"
              title="Open table also shows the computer's hand"
            >
              <option value={humanSide}>My view ({humanSide === 'corp' ? 'Corp' : 'Runner'})</option>
              <option value="open">Open table</option>
            </select>
          ) : (
            <select
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value as ViewMode)}
              aria-label="View"
              data-testid="view-mode"
              className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs text-slate-300"
              title="Who is looking at the screen"
            >
              <option value="open">Open table</option>
              <option value="hotseat">Pass and play</option>
              <option value="corp">Corp view</option>
              <option value="runner">Runner view</option>
            </select>
          )}
          <button
            onClick={() => {
              setSoundEnabled(!sound);
              setSound(!sound);
            }}
            className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg border border-slate-800 transition-colors"
            title={sound ? 'Mute sound' : 'Turn sound on'}
            data-testid="sound-toggle"
          >
            {sound ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
          <button
            onClick={leaveGame}
            className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg border border-slate-800 transition-colors"
            title="New game (pick decks)"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Tabletop */}
      <div className="flex-1 w-full flex flex-col xl:flex-row gap-3 p-3">
      <main className="flex-1 min-w-0 flex flex-col gap-3 overflow-hidden">
        {/* Victory Banner */}
        {winner && (
          <div className="p-5 bg-gradient-to-r from-amber-950/80 to-purple-950/80 border-2 border-amber-500 rounded-2xl flex items-center justify-between shadow-2xl">
            <div>
              <h2 className="text-xl font-cyber font-black text-amber-400">
                GAME OVER // {winner.toUpperCase()} VICTORIOUS
              </h2>
              <p className="text-xs text-slate-300 mt-1">{winReason}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setGameOverHidden(false)}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold rounded-xl text-xs shadow-lg transition-colors"
              >
                Show result
              </button>
              <button
                onClick={resetGame}
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl text-xs shadow-lg transition-colors"
              >
                Play Again
              </button>
            </div>
          </div>
        )}

        {/* CORP SECTOR (TOP HALF) */}
        <section id="corp-board" className="bg-slate-950/60 border border-cyan-950/80 rounded-3xl p-3 sm:p-4 shadow-xl relative backdrop-blur-sm w-full min-w-0">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-2 pb-2 border-b border-cyan-950">
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
                <CreditIcon className="w-4 h-4 text-amber-400" />
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
              {zoneButton(
                'archives',
                'Archives',
                corp.archives.faceUp.length + corp.archives.faceDown.length,
                <Archive className="w-4 h-4 text-slate-500" />
              )}
              {zoneButton('corp-score', 'Scored', corp.scoreArea.length, <Award className="w-4 h-4 text-cyan-400" />)}
              {gameState.removedFromGame.length > 0 &&
                zoneButton('removed', 'Removed', gameState.removedFromGame.length, <Ban className="w-4 h-4 text-slate-500" />)}
            </div>
          </div>

          {/* Dedicated Corp Action Bar (Always fully on-screen) */}
          {activePlayer === 'corp' && corpCanAct && (
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
                  <CreditIcon className="w-3.5 h-3.5 text-amber-400" /> +1 Credit
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
                {selectedCard && !selectedIsPlayable && cardDef(selectedCard).side_code === 'corp' && (
                  <CorpInstallOptions state={gameState} card={selectedCard} onAction={handleAction} />
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

          {corpCanAct && <AbilityBar state={gameState} side="corp" onAction={handleAction} />}

          <div className="flex flex-col xl:flex-row gap-3 mt-3 min-w-0">
          {/* Servers Grid */}
          <div className="flex flex-wrap items-start gap-3 flex-1 min-w-0">
            {Object.values(corp.servers).map((server) => (
              <ServerColumn
                key={server.id}
                server={server}
                activePlayer={activePlayer}
                perspective={viewer}
                cardSize={boardCardSize}
                onInitiateRun={
                  runnerCanAct
                    ? (sId) => handleAction({ type: 'INITIATE_RUN', player: 'runner', targetServerId: sId })
                    : undefined
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
                canRez={(card) => corpCanAct && isLegalAction(gameState, rezAction(card))}
                canAdvance={(card) =>
                  corpCanAct &&
                  isLegalAction(gameState, { type: 'ADVANCE_CARD', player: 'corp', cardInstanceId: card.instanceId, serverId: server.id })
                }
                canScore={(card) =>
                  corpCanAct && isLegalAction(gameState, { type: 'SCORE_AGENDA', player: 'corp', cardInstanceId: card.instanceId })
                }
                onInspectCard={(card) => setInspectedCard(card)}
                anchor={
                  server.id === 'hq' ? (
                    <div className="flex flex-col items-center gap-1 shrink-0">
                      <CardView card={corp.identity} size={boardCardSize} notInstalled onInspect={setInspectedCard} />
                      <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                        Identity · {corp.hq.length} in HQ
                      </span>
                    </div>
                  ) : server.id === 'rd' ? (
                    <Pile label="R&D" count={corp.rd.length} side="corp" size={boardCardSize} testId="pile-rd" />
                  ) : server.id === 'archives' ? (
                    <Pile
                      label="Archives"
                      count={corp.archives.faceUp.length + corp.archives.faceDown.length}
                      side="corp"
                      topCard={corp.archives.faceUp[corp.archives.faceUp.length - 1]}
                      size={boardCardSize}
                      onClick={() => setZone('archives')}
                      testId="pile-archives"
                    />
                  ) : undefined
                }
              />
            ))}
          </div>
          {/* Corp HQ Hand: beside the servers on wide screens */}
          <div className="w-full min-w-0 xl:w-[24rem] 2xl:w-[26rem] xl:shrink-0">
            <div className="text-xs text-cyan-400 font-bold uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>HQ Hand ({corp.hq.length} / {corp.handSizeLimit})</span>
              <span className="text-[10px] text-slate-500 lowercase">hover to preview</span>
            </div>
            <div className="flex gap-2 xl:gap-x-0 overflow-x-auto xl:overflow-x-visible xl:flex-wrap min-w-0 py-1 xl:pl-1 w-full">
              {corp.hq.map((card) => (
                <div key={card.instanceId} className="relative shrink-0 hover:z-10 xl:[&:not(:first-child)]:-ml-10">
                <CardView
                  card={card}
                  size={handCardSize}
                  notInstalled
                  isFaceDown={!canSeeCorpSecrets(viewer)}
                  canPeek={canSeeCorpSecrets(viewer)}
                  isSelectable={activePlayer === 'corp' && corpCanAct}
                  isSelected={selectedCardId === card.instanceId}
                  onClick={() => setSelectedCardId(card.instanceId)}
                  onInspect={canSeeCorpSecrets(viewer) ? setInspectedCard : undefined}
                />
                </div>
              ))}
            </div>
          </div>
          </div>
        </section>

        {/* RUNNER SECTOR (BOTTOM HALF) */}
        <section id="runner-board" className="bg-slate-950/60 border border-pink-950/80 rounded-3xl p-3 sm:p-4 shadow-xl relative backdrop-blur-sm w-full min-w-0">
          <div className="flex flex-col xl:flex-row gap-3 mb-3 min-w-0">
          {/* Runner Rig (Installed Programs, Hardware, Resources) */}
          <div className="flex-1 min-w-0">
            <RigView
              rig={runner.rig}
              cardSize={boardCardSize}
              onInspectCard={setInspectedCard}
              aside={
                <>
                  <div className="flex flex-col items-center gap-1 shrink-0">
                    <CardView card={runner.identity} size={boardCardSize} notInstalled onInspect={setInspectedCard} />
                    <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Identity</span>
                  </div>
                  <Pile label="Stack" count={runner.stack.length} side="runner" size={boardCardSize} testId="pile-stack" />
                  <Pile
                    label="Heap"
                    count={runner.heap.length}
                    side="runner"
                    topCard={runner.heap[runner.heap.length - 1]}
                    size={boardCardSize}
                    onClick={() => setZone('heap')}
                    testId="pile-heap"
                  />
                </>
              }
            />
          </div>
          {/* Runner Grip Hand: beside the rig on wide screens */}
          <div className="w-full min-w-0 xl:w-[24rem] 2xl:w-[26rem] xl:shrink-0">
            <div className="text-xs text-pink-400 font-bold uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>Grip Hand ({runner.grip.length} / {runner.handSizeLimit})</span>
              <span className="text-[10px] text-slate-500 lowercase">hover to preview</span>
            </div>
            <div className="flex gap-2 xl:gap-x-0 overflow-x-auto xl:overflow-x-visible xl:flex-wrap min-w-0 py-1 xl:pl-1 w-full">
              {runner.grip.map((card) => (
                <div key={card.instanceId} className="relative shrink-0 hover:z-10 xl:[&:not(:first-child)]:-ml-10">
                <CardView
                  card={card}
                  size={handCardSize}
                  notInstalled
                  isFaceDown={!canSeeRunnerSecrets(viewer)}
                  canPeek={canSeeRunnerSecrets(viewer)}
                  isSelectable={activePlayer === 'runner' && runnerCanAct}
                  isSelected={selectedCardId === card.instanceId}
                  onClick={() => setSelectedCardId(card.instanceId)}
                  onInspect={canSeeRunnerSecrets(viewer) ? setInspectedCard : undefined}
                />
                </div>
              ))}
            </div>
          </div>
          </div>

          {/* Dedicated Runner Action Bar (Always fully on-screen) */}
          {activePlayer === 'runner' && runnerCanAct && (
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
                  <CreditIcon className="w-3.5 h-3.5 text-amber-400" /> +1 Credit
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

          {runnerCanAct && <AbilityBar state={gameState} side="runner" onAction={handleAction} />}

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mt-2 pt-2 border-t border-pink-950">
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
                <CreditIcon className="w-4 h-4 text-amber-400" />
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
              <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl text-slate-400 shadow">
                <Layers className="w-4 h-4 text-slate-500" />
                <span>Stack: {runner.stack.length}</span>
              </div>
              {zoneButton('heap', 'Heap', runner.heap.length, <Trash2 className="w-4 h-4 text-slate-500" />)}
              {zoneButton('runner-score', 'Stolen', runner.scoreArea.length, <Award className="w-4 h-4 text-pink-400" />)}
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

        </section>

      </main>

      {/* Log in a side bar on wide screens, below the board otherwise */}
      <aside className="xl:w-80 2xl:w-96 shrink-0 xl:sticky xl:top-[4.75rem] xl:self-start xl:h-[calc(100vh-5.5rem)]">
        <LogFeed logs={gameState.log} className="h-56 xl:h-full" />
      </aside>
      </div>

      {/* Active Run Overlay */}
      <RunOverlay
        state={gameState}
        onContinueRun={() => handleAction({ type: 'CONTINUE_RUN', player: 'runner' })}
        onJackOut={() => handleAction({ type: 'JACK_OUT', player: 'runner' })}
        rezCards={
          rezWindowsOn
            ? rezWindowOpen
              ? rezWindow!.cards
              : []
            : approachedIce && isLegalAction(gameState, rezAction(approachedIce))
              ? [approachedIce]
              : []
        }
        onRez={corpCanAct ? (card) => handleAction(rezAction(card)) : undefined}
        onDoneRezzing={rezWindowOpen && corpCanAct ? () => setPassedRezWindows(keys => [...keys, rezWindow!.key]) : undefined}
        runnerControls={runnerCanAct}
        canPeekCorp={canSeeCorpSecrets(viewer)}
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
        canAnswer={
          !gameState.pendingPrompts[0] ||
          (canActAs(viewer, gameState.pendingPrompts[0].side) && gameState.pendingPrompts[0].side !== aiSide)
        }
      />

      {accessed.length > 0 && !handoffTo && (
        <AccessedPanel codes={accessed} onInspect={setInspectedCard} onClose={() => setAccessed([])} />
      )}

      {zoneView && (
        <ZoneViewer
          title={zoneView.title}
          groups={zoneView.groups}
          canPeek={canSeeCorpSecrets(viewer)}
          onClose={() => setZone(null)}
          onInspect={setInspectedCard}
        />
      )}

      {handoffTo && (
        <HandoffScreen
          to={handoffTo}
          reason={
            gameState.pendingPrompts[0]
              ? 'decision'
              : rezWindowOpen
                ? 'rez'
                : 'turn'
          }
          onReady={() => {
            setHotseatSide(handoffTo);
            // Show the incoming player their own board and hand
            // (window.scrollTo, not scrollIntoView, which would also scroll the overflow-hidden <main>)
            requestAnimationFrame(() => {
              const board = document.getElementById(`${handoffTo}-board`);
              if (board) window.scrollTo({ top: board.getBoundingClientRect().top + window.scrollY - 80, behavior: 'smooth' });
            });
          }}
        />
      )}

      {winner && !gameOverHidden && (
        <GameOverModal
          winner={winner}
          reason={winReason}
          corpScore={corp.score}
          runnerScore={runner.score}
          humanSide={humanSide}
          onRematch={onRematch}
          onDeckSelect={onNewGame}
          onViewBoard={() => setGameOverHidden(true)}
        />
      )}

      {/* Full Card Zoom Modal */}
      <CardZoomModal
        card={inspectedCard}
        onClose={() => setInspectedCard(null)}
      />
    </div>
  );
}

/**
 * Where the selected HQ card can go: a new remote, or any server the engine
 * allows (ice on any server, upgrades in centrals, a replacement in a remote).
 */
function CorpInstallOptions({
  state,
  card,
  onAction,
}: {
  state: ReturnType<typeof createInitialGameState>;
  card: CardInstance;
  onAction: (action: GameAction) => void;
}) {
  const def = cardDef(card);
  const options = getLegalActions(state, 'corp').filter(
    (a): a is Extract<GameAction, { type: 'INSTALL_CARD' }> => a.type === 'INSTALL_CARD' && a.cardInstanceId === card.instanceId
  );
  if (options.length === 0) {
    return <span className="text-xs text-slate-400">{def.title} cannot be installed right now.</span>;
  }
  return (
    <div className="flex items-center gap-1.5 flex-wrap" data-testid="install-options">
      <span className="text-xs text-amber-300 font-bold">Install {def.title}:</span>
      {options.map(a => {
        const server = a.targetServerId ? state.corp.servers[a.targetServerId] : null;
        const iceCost = def.type_code === 'ice' && server ? server.ice.length : 0;
        const replaced =
          server && ['agenda', 'asset'].includes(def.type_code)
            ? server.root.find(c => ['agenda', 'asset'].includes(cardDef(c).type_code))
            : undefined;
        return (
          <button
            key={a.targetServerId ?? 'new'}
            onClick={() => onAction(a)}
            data-testid={`install-${a.targetServerId ?? 'new'}`}
            title={replaced ? `Trashes ${cardDef(replaced).title} to make room` : undefined}
            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold rounded-xl transition-all flex items-center gap-1 shadow-lg"
          >
            <Plus className="w-3.5 h-3.5" /> {server ? server.name : 'New remote'}
            {iceCost > 0 && ` (${iceCost}c)`}
            {replaced && ' (replace)'}
          </button>
        );
      })}
    </div>
  );
}

/** The cards the Runner accessed in the latest run, so accesses with nothing to decide are still seen. */
function AccessedPanel({
  codes,
  onInspect,
  onClose,
}: {
  codes: string[];
  onInspect: (card: CardInstance) => void;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed left-4 bottom-6 z-40 w-72 max-w-[calc(100vw-2rem)] bg-slate-950/95 border-2 border-pink-700 rounded-2xl p-3 shadow-2xl font-mono"
      data-testid="accessed-panel"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold text-pink-300 uppercase tracking-wider">Accessed this run ({codes.length})</span>
        <button onClick={onClose} className="text-slate-400 hover:text-white text-xs px-1.5" aria-label="Dismiss accessed cards">
          ✕
        </button>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {codes.map((code, i) => (
          <CardView
            key={`${code}-${i}`}
            card={{ instanceId: `accessed-${i}`, cardCode: code, isRezzed: true, advancementCounters: 0, tokens: {}, hostedCardIds: [] }}
            size="xs"
            notInstalled
            onInspect={onInspect}
          />
        ))}
      </div>
      <p className="text-[10px] text-slate-500 mt-1.5">Cards without a trash cost (ice, operations) can't be trashed.</p>
    </div>
  );
}
