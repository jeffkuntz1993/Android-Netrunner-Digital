import React from 'react';
import {
  GameAction,
  GameState,
  breakerScript,
  breakerStrength,
  cardDef,
  encounteredIce,
  findCardAnywhere,
  getCardScript,
  getLegalActions,
  iceScript,
  iceStrength,
  installedIcebreakers,
} from '../../core';
import { Scissors, TrendingUp, Clock, Sparkles } from 'lucide-react';
import { Credits } from './CreditIcon';
import { Keyword } from './Keyword';

interface EncounterPanelProps {
  state: GameState;
  onAction: (action: GameAction) => void;
  /** Show the encounter without the Runner's buttons (the Corp is watching). */
  readOnly?: boolean;
}

/**
 * Break window for the ice being encountered: shows each subroutine and offers
 * the BREAK / BOOST / BIOROID_BREAK actions the engine reports as legal.
 */
export const EncounterPanel: React.FC<EncounterPanelProps> = ({ state, onAction, readOnly = false }) => {
  const encounter = state.activeRun?.encounter;
  const ice = encounteredIce(state);
  if (!encounter || !ice) return null;

  const subs = iceScript(ice)?.subroutines ?? [];
  const legal = readOnly ? [] : getLegalActions(state, 'runner');
  const titleOf = (id: string) => {
    const card = state.runner.rig.programs.find(c => c.instanceId === id);
    return card ? cardDef(card).title : id;
  };

  const breakerRows = installedIcebreakers(state).map(breaker => {
    const script = breakerScript(breaker);
    const actions = legal.filter(
      a => (a.type === 'BREAK_SUBROUTINE' || a.type === 'BOOST_BREAKER') && a.breakerInstanceId === breaker.instanceId,
    );
    return { breaker, script, actions };
  });
  const bioroidActions = legal.filter(a => a.type === 'BIOROID_BREAK');
  const abilityActions = legal.filter(a => a.type === 'USE_ABILITY');

  const btn =
    'px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold border transition-colors disabled:opacity-40';

  return (
    <div className="mt-3 border-t border-pink-900/50 pt-3 space-y-3" data-testid="encounter-panel">
      <div className="text-xs font-mono text-slate-300">
        <Keyword id="encounter">Encountering</Keyword> <span className="text-pink-300 font-bold">{cardDef(ice).title}</span> —{' '}
        <Keyword id="strength">strength</Keyword>{' '}
        <span className="text-cyan-300 font-bold">{iceStrength(state, ice)}</span>
        {encounter.resolvingIndex !== null && <span className="text-amber-300"> • <Keyword id="subroutine">subroutines</Keyword> resolving</span>}
      </div>

      <ol className="space-y-1">
        {subs.map((sub, i) => (
          <li
            key={i}
            className={`text-xs font-mono px-2 py-1 rounded-md border ${
              encounter.broken[i]
                ? 'border-emerald-800 bg-emerald-950/40 text-emerald-400 line-through'
                : 'border-slate-700 bg-black/40 text-slate-200'
            }`}
          >
            ↳ {sub.label}
          </li>
        ))}
      </ol>

      {breakerRows.length > 0 && (
        <div className="space-y-1.5">
          {breakerRows.map(({ breaker, script, actions }) => (
            <div key={breaker.instanceId} className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-mono text-slate-400 w-40 truncate">
                {cardDef(breaker).title} (str {breakerStrength(state, breaker)})
              </span>
              {actions.length === 0 && <span className="text-[11px] font-mono text-slate-600">no legal use</span>}
              {actions.map((a, k) =>
                a.type === 'BOOST_BREAKER' ? (
                  <button
                    key={k}
                    onClick={() => onAction(a)}
                    className={`${btn} bg-cyan-950 border-cyan-700 text-cyan-200 hover:bg-cyan-900`}
                  >
                    <TrendingUp className="inline w-3 h-3 mr-1" />
                    Boost (<Credits amount={script?.boostCost ?? 0} />)
                  </button>
                ) : a.type === 'BREAK_SUBROUTINE' ? (
                  <button
                    key={k}
                    onClick={() => onAction(a)}
                    className={`${btn} bg-pink-950 border-pink-700 text-pink-200 hover:bg-pink-900`}
                    title={`Break with ${titleOf(a.breakerInstanceId)}`}
                  >
                    <Scissors className="inline w-3 h-3 mr-1" />
                    Break {a.subroutineIndices.map(i => i + 1).join('+')} (<Credits amount={script?.breakCost(state, breaker) ?? 0} />)
                  </button>
                ) : null,
              )}
            </div>
          ))}
        </div>
      )}

      {abilityActions.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-mono text-slate-400 w-40">Card abilities</span>
          {abilityActions.map((a, k) => {
            if (a.type !== 'USE_ABILITY') return null;
            const card = findCardAnywhere(state, a.cardInstanceId);
            const ability = card && getCardScript(card.cardCode)?.abilities?.[a.abilityIndex];
            if (!card || !ability) return null;
            return (
              <button key={k} onClick={() => onAction(a)} className={`${btn} bg-lime-950 border-lime-700 text-lime-200 hover:bg-lime-900`} title={ability.label}>
                <Sparkles className="inline w-3 h-3 mr-1" />
                {cardDef(card).title}
              </button>
            );
          })}
        </div>
      )}

      {bioroidActions.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-mono text-slate-400 w-40">Bioroid: spend a click</span>
          {bioroidActions.map((a, k) =>
            a.type === 'BIOROID_BREAK' ? (
              <button
                key={k}
                onClick={() => onAction(a)}
                className={`${btn} bg-amber-950 border-amber-700 text-amber-200 hover:bg-amber-900`}
              >
                <Clock className="inline w-3 h-3 mr-1" />
                Break {a.subroutineIndex + 1}
              </button>
            ) : null,
          )}
        </div>
      )}
    </div>
  );
};
