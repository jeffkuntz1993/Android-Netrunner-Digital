import React from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { SideCode } from '../../core';
import { Trophy, RotateCcw, LayoutGrid, Eye } from 'lucide-react';

interface GameOverModalProps {
  winner: SideCode;
  reason: string | null | undefined;
  corpScore: number;
  runnerScore: number;
  /** Set when one side is the computer: says "You win" or "You lose". */
  humanSide: SideCode | null;
  onRematch: () => void;
  onDeckSelect: () => void;
  /** Hide the box to look over the final board. */
  onViewBoard: () => void;
}

/** Shown over the board when the game ends. */
export const GameOverModal: React.FC<GameOverModalProps> = ({
  winner,
  reason,
  corpScore,
  runnerScore,
  humanSide,
  onRematch,
  onDeckSelect,
  onViewBoard,
}) => {
  const isCorp = winner === 'corp';
  const title = humanSide ? (humanSide === winner ? 'YOU WIN' : 'YOU LOSE') : `${isCorp ? 'CORP' : 'RUNNER'} WINS`;
  return createPortal(
    <div className="fixed inset-0 z-[70] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4" data-testid="game-over">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="game-over-title"
        className={`w-full max-w-md text-center rounded-3xl border-2 p-8 font-mono bg-slate-950 shadow-2xl ${
          isCorp ? 'border-cyan-400 shadow-cyan-900/60' : 'border-pink-400 shadow-pink-900/60'
        }`}
      >
        <Trophy className="w-12 h-12 mx-auto mb-3 text-amber-400" />
        <div className="text-[11px] tracking-[0.3em] text-slate-500 font-bold mb-1">GAME OVER</div>
        <h2
          id="game-over-title"
          className={`font-cyber font-black tracking-widest text-2xl mb-2 ${isCorp ? 'text-cyan-400' : 'text-pink-400'}`}
        >
          {title}
        </h2>
        {humanSide && <p className="text-xs text-slate-400 mb-1">The {isCorp ? 'Corp' : 'Runner'} wins.</p>}
        {reason && <p className="text-sm text-slate-200 mb-4">{reason}</p>}
        <div className="flex items-center justify-center gap-4 text-sm font-bold mb-6">
          <span className="text-cyan-300">Corp {corpScore}</span>
          <span className="text-slate-600">vs</span>
          <span className="text-pink-300">Runner {runnerScore}</span>
        </div>
        <div className="flex flex-col gap-2">
          <button
            onClick={onRematch}
            autoFocus
            data-testid="rematch"
            className="w-full px-5 py-3 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl text-sm flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" /> Play again (same decks)
          </button>
          <button
            onClick={onDeckSelect}
            data-testid="deck-select"
            className="w-full px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold rounded-xl text-sm flex items-center justify-center gap-2"
          >
            <LayoutGrid className="w-4 h-4" /> Back to deck selection
          </button>
          <button
            onClick={onViewBoard}
            data-testid="view-board"
            className="w-full px-5 py-2 text-slate-400 hover:text-white text-xs flex items-center justify-center gap-2"
          >
            <Eye className="w-3.5 h-3.5" /> Look at the final board
          </button>
        </div>
      </motion.div>
    </div>,
    document.body
  );
};
