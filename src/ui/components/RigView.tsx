import React from 'react';
import { RunnerRig } from '../../core/types/state';
import { CardView } from './CardView';
import { Cpu, HardDrive, Users } from 'lucide-react';

interface RigViewProps {
  rig: RunnerRig;
}

export const RigView: React.FC<RigViewProps> = ({ rig }) => {
  return (
    <div className="flex gap-4 p-3 bg-slate-900/50 border border-slate-800 rounded-xl overflow-x-auto">
      {/* Programs (Icebreakers, Viruses) */}
      <div className="flex-1 min-w-[180px]">
        <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-cyber-neonCyan mb-2">
          <Cpu className="w-4 h-4 text-cyan-400" />
          <span>Programs ({rig.programs.length})</span>
        </div>
        <div className="flex gap-2 min-h-[90px] p-2 bg-black/40 rounded-lg border border-slate-800/60 overflow-x-auto">
          {rig.programs.length === 0 ? (
            <span className="text-xs text-slate-600 italic m-auto">No programs installed</span>
          ) : (
            rig.programs.map((card) => (
              <CardView key={card.instanceId} card={card} size="sm" />
            ))
          )}
        </div>
      </div>

      {/* Hardware */}
      <div className="flex-1 min-w-[180px]">
        <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-cyber-neonYellow mb-2">
          <HardDrive className="w-4 h-4 text-amber-400" />
          <span>Hardware ({rig.hardware.length})</span>
        </div>
        <div className="flex gap-2 min-h-[90px] p-2 bg-black/40 rounded-lg border border-slate-800/60 overflow-x-auto">
          {rig.hardware.length === 0 ? (
            <span className="text-xs text-slate-600 italic m-auto">No hardware installed</span>
          ) : (
            rig.hardware.map((card) => (
              <CardView key={card.instanceId} card={card} size="sm" />
            ))
          )}
        </div>
      </div>

      {/* Resources */}
      <div className="flex-1 min-w-[180px]">
        <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-cyber-neonPink mb-2">
          <Users className="w-4 h-4 text-pink-400" />
          <span>Resources ({rig.resources.length})</span>
        </div>
        <div className="flex gap-2 min-h-[90px] p-2 bg-black/40 rounded-lg border border-slate-800/60 overflow-x-auto">
          {rig.resources.length === 0 ? (
            <span className="text-xs text-slate-600 italic m-auto">No resources installed</span>
          ) : (
            rig.resources.map((card) => (
              <CardView key={card.instanceId} card={card} size="sm" />
            ))
          )}
        </div>
      </div>
    </div>
  );
};
