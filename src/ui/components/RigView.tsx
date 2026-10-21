import React from 'react';
import { RunnerRig } from '../../core/types/state';
import { CardInstance } from '../../core/types/card';
import { CardView } from './CardView';
import { Cpu, HardDrive, Users } from 'lucide-react';

interface RigViewProps {
  rig: RunnerRig;
  cardSize?: 'sm' | 'md' | 'lg';
  onInspectCard?: (card: CardInstance) => void;
}

export const RigView: React.FC<RigViewProps> = ({
  rig,
  cardSize = 'sm',
  onInspectCard,
}) => {
  return (
    <div className="flex flex-col md:flex-row gap-4 p-4 bg-slate-900/60 border border-slate-800 rounded-2xl overflow-x-auto shadow-lg">
      {/* Programs (Icebreakers, Viruses) */}
      <div className="flex-1 min-w-[220px]">
        <div className="flex items-center gap-2 text-xs font-mono font-bold text-cyber-neonCyan mb-2.5">
          <Cpu className="w-4 h-4 text-cyan-400" />
          <span>Programs ({rig.programs.length})</span>
        </div>
        <div className="flex gap-3 min-h-[160px] p-2.5 bg-black/40 rounded-xl border border-slate-800/80 overflow-x-auto items-center">
          {rig.programs.length === 0 ? (
            <span className="text-xs text-slate-600 italic m-auto">No programs installed</span>
          ) : (
            rig.programs.map((card) => (
              <CardView
                key={card.instanceId}
                card={card}
                size={cardSize}
                onInspect={onInspectCard}
              />
            ))
          )}
        </div>
      </div>

      {/* Hardware (Consoles, Chips) */}
      <div className="flex-1 min-w-[220px]">
        <div className="flex items-center gap-2 text-xs font-mono font-bold text-amber-400 mb-2.5">
          <HardDrive className="w-4 h-4 text-amber-400" />
          <span>Hardware ({rig.hardware.length})</span>
        </div>
        <div className="flex gap-3 min-h-[160px] p-2.5 bg-black/40 rounded-xl border border-slate-800/80 overflow-x-auto items-center">
          {rig.hardware.length === 0 ? (
            <span className="text-xs text-slate-600 italic m-auto">No hardware installed</span>
          ) : (
            rig.hardware.map((card) => (
              <CardView
                key={card.instanceId}
                card={card}
                size={cardSize}
                onInspect={onInspectCard}
              />
            ))
          )}
        </div>
      </div>

      {/* Resources (Connections, Virtual) */}
      <div className="flex-1 min-w-[220px]">
        <div className="flex items-center gap-2 text-xs font-mono font-bold text-cyber-neonPink mb-2.5">
          <Users className="w-4 h-4 text-pink-400" />
          <span>Resources ({rig.resources.length})</span>
        </div>
        <div className="flex gap-3 min-h-[160px] p-2.5 bg-black/40 rounded-xl border border-slate-800/80 overflow-x-auto items-center">
          {rig.resources.length === 0 ? (
            <span className="text-xs text-slate-600 italic m-auto">No resources installed</span>
          ) : (
            rig.resources.map((card) => (
              <CardView
                key={card.instanceId}
                card={card}
                size={cardSize}
                onInspect={onInspectCard}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
};
