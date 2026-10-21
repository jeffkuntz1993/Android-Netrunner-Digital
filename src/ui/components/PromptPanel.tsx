import React, { useState } from 'react';
import { CardInstance, GameState, PromptChoice, activePrompt, cardDef, findCardAnywhere, locateCorpCard } from '../../core';
import { CardView } from './CardView';
import { Check, RefreshCw, Trash2, X } from 'lucide-react';

interface PromptPanelProps {
  state: GameState;
  onAnswer: (choice: PromptChoice) => void;
  onInspectCard?: (card: CardInstance) => void;
}

/**
 * Shows the decision the game is waiting on. Hot-seat for now: whichever
 * side the prompt is for answers it here.
 */
export const PromptPanel: React.FC<PromptPanelProps> = ({ state, onAnswer, onInspectCard }) => {
  const prompt = activePrompt(state);
  const [selected, setSelected] = useState<string[]>([]);
  if (!prompt) return null;

  const isCorp = prompt.side === 'corp';
  const hand = isCorp ? state.corp.hq : state.runner.grip;
  const accent = isCorp ? 'border-cyan-500 shadow-cyan-950/60' : 'border-pink-500 shadow-pink-950/60';
  const toggle = (id: string) =>
    setSelected(sel => (sel.includes(id) ? sel.filter(s => s !== id) : [...sel, id]));
  const answer = (choice: PromptChoice) => {
    setSelected([]);
    onAnswer(choice);
  };

  const button = 'px-4 py-2 text-xs font-bold rounded-xl border flex items-center gap-1.5 transition-colors disabled:opacity-40';

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className={`w-full max-w-4xl bg-slate-950 border-2 rounded-2xl p-5 shadow-2xl font-mono ${accent}`}>
        <div className={`text-xs font-bold uppercase tracking-wider mb-1 ${isCorp ? 'text-cyan-400' : 'text-pink-400'}`}>
          {isCorp ? 'Corp' : 'Runner'} decision
        </div>
        <h3 className="text-sm text-slate-100 font-bold mb-4">{prompt.message}</h3>

        {prompt.kind === 'mulligan' && (
          <>
            <div className="flex gap-2 overflow-x-auto py-2 mb-4">
              {hand.map(card => (
                <CardView key={card.instanceId} card={card} size="sm" onInspect={onInspectCard} />
              ))}
            </div>
            <div className="flex gap-2 justify-end">
              <button className={`${button} bg-slate-800 hover:bg-slate-700 border-slate-600 text-slate-200`} onClick={() => answer({ kind: 'mulligan', mulligan: true })}>
                <RefreshCw className="w-3.5 h-3.5" /> Mulligan
              </button>
              <button className={`${button} bg-emerald-700 hover:bg-emerald-600 border-emerald-500 text-white`} onClick={() => answer({ kind: 'mulligan', mulligan: false })}>
                <Check className="w-3.5 h-3.5" /> Keep hand
              </button>
            </div>
          </>
        )}

        {prompt.kind === 'discard' && (
          <>
            <div className="flex gap-2 overflow-x-auto py-2 mb-4">
              {hand.map(card => (
                <CardView
                  key={card.instanceId}
                  card={card}
                  size="sm"
                  isSelectable
                  isSelected={selected.includes(card.instanceId)}
                  onClick={() => toggle(card.instanceId)}
                  onInspect={onInspectCard}
                />
              ))}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">
                Selected {selected.length} / {prompt.count}
              </span>
              <button
                className={`${button} bg-red-700 hover:bg-red-600 border-red-500 text-white`}
                disabled={selected.length !== prompt.count}
                onClick={() => answer({ kind: 'discard', cardInstanceIds: selected })}
              >
                <Trash2 className="w-3.5 h-3.5" /> Discard selected
              </button>
            </div>
          </>
        )}

        {prompt.kind === 'effect_choice' && (
          <div className="flex gap-2 justify-end flex-wrap">
            {prompt.options.map(option => (
              <button
                key={option.id}
                className={`${button} bg-slate-800 hover:bg-slate-700 border-slate-600 text-slate-100`}
                onClick={() => answer({ kind: 'effect_choice', optionId: option.id })}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}

        {prompt.kind === 'effect_cards' && (
          <>
            <div className="flex gap-2 overflow-x-auto py-2 mb-4">
              {prompt.candidateIds.map(id => {
                const card = findCardAnywhere(state, id);
                return card ? (
                  <CardView
                    key={id}
                    card={card}
                    size="sm"
                    isSelectable
                    isSelected={selected.includes(id)}
                    onClick={() => toggle(id)}
                    onInspect={onInspectCard}
                  />
                ) : null;
              })}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">
                Selected {selected.length} ({prompt.min === prompt.max ? prompt.min : `${prompt.min}-${prompt.max}`})
              </span>
              <button
                className={`${button} bg-emerald-700 hover:bg-emerald-600 border-emerald-500 text-white`}
                disabled={selected.length < prompt.min || selected.length > prompt.max}
                onClick={() => answer({ kind: 'effect_cards', cardInstanceIds: selected })}
              >
                <Check className="w-3.5 h-3.5" /> Confirm
              </button>
            </div>
          </>
        )}

        {prompt.kind === 'access_trash' && (() => {
          const card = locateCorpCard(state, prompt.cardInstanceId)?.card;
          return (
            <>
              <div className="flex items-center gap-4 mb-4">
                {card && <CardView card={card} size="md" onInspect={onInspectCard} />}
                <div className="text-xs text-slate-300">
                  {card && <div className="font-bold text-slate-100 mb-1">{cardDef(card).title}</div>}
                  Trash cost: <span className="text-red-300 font-bold">{prompt.trashCost}c</span> · You have{' '}
                  <span className="text-amber-300 font-bold">{state.runner.credits}c</span>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <button className={`${button} bg-slate-800 hover:bg-slate-700 border-slate-600 text-slate-200`} onClick={() => answer({ kind: 'access_trash', trash: false })}>
                  <X className="w-3.5 h-3.5" /> Leave it
                </button>
                <button className={`${button} bg-red-700 hover:bg-red-600 border-red-500 text-white`} onClick={() => answer({ kind: 'access_trash', trash: true })}>
                  <Trash2 className="w-3.5 h-3.5" /> Trash ({prompt.trashCost}c)
                </button>
              </div>
            </>
          );
        })()}
      </div>
    </div>
  );
};
