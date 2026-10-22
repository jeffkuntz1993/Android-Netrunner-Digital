import React, { useMemo, useState } from 'react';
import { getCardDefinition, influenceCost, validateDeck } from '../../core';
import { DECKS, DeckList, deckCodes } from '../../data/decks';
import { SYSTEM_GATEWAY_CARDS, getCardImageUrl } from '../../data/cards';
import { loadCustomDecks, newCustomDeckId, saveCustomDecks } from '../../data/customDecks';
import { DeckBuilder } from './DeckBuilder';
import { CheckCircle2, AlertTriangle, Play, Plus, Pencil, Copy, Trash2 } from 'lucide-react';

interface DeckPickerProps {
  initialCorpDeckId: string;
  initialRunnerDeckId: string;
  onStart: (corpDeck: DeckList, runnerDeck: DeckList) => void;
}

interface DeckSummary {
  deck: DeckList;
  identityCode: string;
  size: number;
  agendaPoints: number;
  influence: number;
  influenceLimit: number | null;
  problems: string[];
}

function summarize(deck: DeckList): DeckSummary {
  const codes = deckCodes(deck);
  const identity = getCardDefinition(codes.identity);
  const defs = codes.cards.map(getCardDefinition);
  return {
    deck,
    identityCode: codes.identity,
    size: defs.length,
    agendaPoints: defs.reduce((n, d) => n + (d.agenda_points ?? 0), 0),
    influence: defs.reduce((n, d) => n + influenceCost(identity, d), 0),
    influenceLimit: identity.influence_limit ?? null,
    problems: validateDeck(codes),
  };
}

function emptyDeck(side: 'corp' | 'runner'): DeckList {
  const identity = SYSTEM_GATEWAY_CARDS.find(c => c.side_code === side && c.type_code === 'identity')!;
  return { id: newCustomDeckId(), name: 'New deck', side, identity: identity.title, cards: {}, source: 'custom' };
}

/** Start screen: choose a Corp deck and a Runner deck, or build your own. */
export const DeckPicker: React.FC<DeckPickerProps> = ({ initialCorpDeckId, initialRunnerDeckId, onStart }) => {
  const [customDecks, setCustomDecks] = useState<DeckList[]>(loadCustomDecks);
  const [storageFailed, setStorageFailed] = useState(false);
  const [editing, setEditing] = useState<DeckList | null>(null);
  const summaries = useMemo(() => [...DECKS, ...customDecks].map(summarize), [customDecks]);
  const [corpId, setCorpId] = useState(initialCorpDeckId);
  const [runnerId, setRunnerId] = useState(initialRunnerDeckId);

  const storeDecks = (decks: DeckList[]) => {
    setCustomDecks(decks);
    setStorageFailed(!saveCustomDecks(decks));
  };
  const selectFor = (side: 'corp' | 'runner') => (side === 'corp' ? setCorpId : setRunnerId);

  const saveDeck = (deck: DeckList) => {
    const exists = customDecks.some(d => d.id === deck.id);
    storeDecks(exists ? customDecks.map(d => (d.id === deck.id ? deck : d)) : [...customDecks, deck]);
    selectFor(deck.side)(deck.id);
    setEditing(null);
  };
  const deleteDeck = (deck: DeckList) => {
    if (!window.confirm(`Delete "${deck.name}"? This cannot be undone.`)) return;
    storeDecks(customDecks.filter(d => d.id !== deck.id));
    const fallback = DECKS.find(d => d.side === deck.side)!.id;
    if ((deck.side === 'corp' ? corpId : runnerId) === deck.id) selectFor(deck.side)(fallback);
  };
  const copyDeck = (deck: DeckList) =>
    setEditing({ ...deck, id: newCustomDeckId(), name: `${deck.name} (copy)`, cards: { ...deck.cards }, source: 'custom' });

  if (editing) {
    return <DeckBuilder key={editing.id} initial={editing} onSave={saveDeck} onCancel={() => setEditing(null)} />;
  }

  const selectedProblems = [corpId, runnerId].flatMap(id => summaries.find(s => s.deck.id === id)?.problems ?? ['missing']);
  const iconButton = (label: string, icon: React.ReactNode, onClick: () => void, testId: string) => (
    <span
      role="button"
      tabIndex={0}
      title={label}
      aria-label={label}
      data-testid={testId}
      onClick={e => {
        e.stopPropagation();
        onClick();
      }}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          e.stopPropagation();
          onClick();
        }
      }}
      className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
    >
      {icon}
    </span>
  );

  const column = (side: 'corp' | 'runner', selected: string, select: (id: string) => void) => {
    const accent = side === 'corp' ? 'cyan' : 'pink';
    return (
      <section className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-3">
          <h2 className={`font-cyber font-bold text-sm tracking-wider ${side === 'corp' ? 'text-cyan-400' : 'text-pink-400'}`}>
            {side === 'corp' ? 'CORP DECK' : 'RUNNER DECK'}
          </h2>
          <button
            onClick={() => setEditing(emptyDeck(side))}
            data-testid={`new-${side}-deck`}
            className="px-2.5 py-1 rounded-lg border border-slate-700 hover:border-slate-500 text-xs flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" /> New deck
          </button>
        </div>
        <div className="flex flex-col gap-2">
          {summaries
            .filter(s => s.deck.side === side)
            .map(s => {
              const isSelected = s.deck.id === selected;
              return (
                <button
                  key={s.deck.id}
                  onClick={() => select(s.deck.id)}
                  data-testid={`deck-${s.deck.id}`}
                  className={`flex items-center gap-3 p-2.5 rounded-2xl border text-left transition-all ${
                    isSelected
                      ? accent === 'cyan'
                        ? 'border-cyan-400 bg-cyan-950/60 shadow-[0_0_12px_rgba(34,211,238,0.35)]'
                        : 'border-pink-400 bg-pink-950/60 shadow-[0_0_12px_rgba(255,0,85,0.35)]'
                      : 'border-slate-800 bg-slate-950/70 hover:border-slate-600'
                  }`}
                >
                  <img
                    src={getCardImageUrl(s.identityCode)}
                    alt={s.deck.identity}
                    className="w-14 h-20 object-cover rounded-md border border-slate-700 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start gap-1">
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-bold text-slate-100 truncate">{s.deck.name}</div>
                        {s.deck.name !== s.deck.identity && (
                          <div className="text-[11px] text-slate-400 truncate">{s.deck.identity}</div>
                        )}
                      </div>
                      <div className="flex shrink-0">
                        {s.deck.source === 'custom' &&
                          iconButton('Edit deck', <Pencil className="w-3.5 h-3.5" />, () => setEditing(s.deck), `edit-${s.deck.id}`)}
                        {iconButton('Copy into a new deck', <Copy className="w-3.5 h-3.5" />, () => copyDeck(s.deck), `copy-${s.deck.id}`)}
                        {s.deck.source === 'custom' &&
                          iconButton('Delete deck', <Trash2 className="w-3.5 h-3.5" />, () => deleteDeck(s.deck), `delete-${s.deck.id}`)}
                      </div>
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                      {s.size} cards
                      {side === 'corp' && <> · {s.agendaPoints} agenda points</>}
                      {s.influenceLimit !== null && (
                        <> · {s.influence}/{s.influenceLimit} influence</>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                        {s.deck.source === 'official starter' ? 'Official starter' : s.deck.source === 'official sample' ? 'Official sample' : 'Custom'}
                      </span>
                      {s.problems.length === 0 ? (
                        <span className="text-[11px] text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Legal
                        </span>
                      ) : (
                        <span className="text-[11px] text-amber-400 flex items-center gap-1" title={s.problems.join('\n')}>
                          <AlertTriangle className="w-3 h-3" /> {s.problems.length} problem(s)
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
        </div>
      </section>
    );
  };

  return (
    <div className="min-h-screen bg-[#07080c] text-slate-100 font-mono flex flex-col items-center px-4 py-8">
      <h1 className="font-cyber font-black tracking-widest text-xl sm:text-2xl bg-gradient-to-r from-cyber-neonCyan via-indigo-400 to-cyber-neonPink bg-clip-text text-transparent mb-1">
        NETRUNNER // PROTOCOL
      </h1>
      <p className="text-xs text-slate-400 mb-6 text-center">
        Choose a deck for each side. The starter decks are the best place to begin. Build your own with New deck, or copy any deck to tweak it.
      </p>
      {storageFailed && (
        <p className="text-xs text-amber-400 mb-4">This browser would not save your decks, so they will be lost when the page closes.</p>
      )}
      <div className="w-full max-w-5xl flex flex-col md:flex-row gap-6">
        {column('corp', corpId, setCorpId)}
        {column('runner', runnerId, setRunnerId)}
      </div>
      {selectedProblems.length > 0 && (
        <p className="mt-6 text-xs text-amber-400">A selected deck is not legal yet. Fix it in the deckbuilder to play it.</p>
      )}
      <button
        onClick={() => {
          const deck = (id: string) => summaries.find(s => s.deck.id === id)!.deck;
          onStart(deck(corpId), deck(runnerId));
        }}
        disabled={selectedProblems.length > 0}
        data-testid="start-game"
        className="disabled:opacity-40 disabled:cursor-not-allowed mt-8 px-8 py-3 bg-gradient-to-r from-cyan-600 to-pink-600 hover:from-cyan-500 hover:to-pink-500 text-white font-bold rounded-2xl shadow-lg flex items-center gap-2"
      >
        <Play className="w-4 h-4" /> Start game
      </button>
    </div>
  );
};
