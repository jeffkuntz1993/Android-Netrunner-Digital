import React, { useMemo, useState } from 'react';
import { getCardDefinition, influenceCost, validateDeck } from '../../core';
import { DECKS, DeckList, deckCodes } from '../../data/decks';
import { getCardImageUrl } from '../../data/cards';
import { CheckCircle2, AlertTriangle, Play } from 'lucide-react';

interface DeckPickerProps {
  initialCorpDeckId: string;
  initialRunnerDeckId: string;
  onStart: (corpDeckId: string, runnerDeckId: string) => void;
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

/** Start screen: choose a Corp deck and a Runner deck. */
export const DeckPicker: React.FC<DeckPickerProps> = ({ initialCorpDeckId, initialRunnerDeckId, onStart }) => {
  const summaries = useMemo(() => DECKS.map(summarize), []);
  const [corpId, setCorpId] = useState(initialCorpDeckId);
  const [runnerId, setRunnerId] = useState(initialRunnerDeckId);

  const column = (side: 'corp' | 'runner', selected: string, select: (id: string) => void) => {
    const accent = side === 'corp' ? 'cyan' : 'pink';
    return (
      <section className="flex-1 min-w-0">
        <h2 className={`font-cyber font-bold text-sm tracking-wider mb-3 ${side === 'corp' ? 'text-cyan-400' : 'text-pink-400'}`}>
          {side === 'corp' ? 'CORP DECK' : 'RUNNER DECK'}
        </h2>
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
                    <div className="text-sm font-bold text-slate-100 truncate">{s.deck.name}</div>
                    <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                      {s.size} cards
                      {side === 'corp' && <> · {s.agendaPoints} agenda points</>}
                      {s.influenceLimit !== null && (
                        <> · {s.influence}/{s.influenceLimit} influence</>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                        {s.deck.source === 'official starter' ? 'Official starter' : 'Gateway build'}
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
      <p className="text-xs text-slate-400 mb-6">Choose a deck for each side. The starter decks are the best place to begin.</p>
      <div className="w-full max-w-5xl flex flex-col md:flex-row gap-6">
        {column('corp', corpId, setCorpId)}
        {column('runner', runnerId, setRunnerId)}
      </div>
      <button
        onClick={() => onStart(corpId, runnerId)}
        className="mt-8 px-8 py-3 bg-gradient-to-r from-cyan-600 to-pink-600 hover:from-cyan-500 hover:to-pink-500 text-white font-bold rounded-2xl shadow-lg flex items-center gap-2"
      >
        <Play className="w-4 h-4" /> Start game
      </button>
    </div>
  );
};
