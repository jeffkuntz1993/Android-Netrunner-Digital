import React from 'react';
import { RunnerRig } from '../../core/types/state';
import { CardInstance } from '../../core/types/card';
import { CardView } from './CardView';
import { Cpu, HardDrive, Users } from 'lucide-react';

interface RigViewProps {
  rig: RunnerRig;
  cardSize?: 'sm' | 'md' | 'lg';
  onInspectCard?: (card: CardInstance) => void;
  /** The Runner's identity, Stack and Heap, shown beside the rig. */
  aside?: React.ReactNode;
}

/** An installed card, with any cards hosted faceup on it (Bling, Madani, Detente) beneath. */
const RigCard: React.FC<{ card: CardInstance; size: 'sm' | 'md' | 'lg'; onInspect?: (card: CardInstance) => void }> = ({ card, size, onInspect }) => {
  const hosted = card.hostedCards ?? [];
  if (hosted.length === 0) return <CardView card={card} size={size} onInspect={onInspect} />;
  return (
    <div className="flex flex-col items-center gap-1 shrink-0" data-testid={`hosted-on-${card.instanceId}`}>
      <CardView card={card} size={size} onInspect={onInspect} />
      <div className="text-[9px] font-mono uppercase tracking-wider text-slate-400">Hosted ({hosted.length})</div>
      <div className="flex gap-1">
        {hosted.map(h => (
          <CardView key={h.instanceId} card={h} size="sm" notInstalled onInspect={onInspect} />
        ))}
      </div>
    </div>
  );
};

export const RigView: React.FC<RigViewProps> = ({
  rig,
  cardSize = 'sm',
  onInspectCard,
  aside,
}) => {
  return (
    // As on the table: programs in the front row (toward the Corp), then hardware, then resources
    <div className="flex flex-col 2xl:flex-row gap-3 p-3 bg-slate-900/60 border border-slate-800 chamfer-sm shadow-lg">
      {aside && <div className="flex flex-row gap-3 shrink-0 items-start">{aside}</div>}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 flex-1 min-w-0">
      {/* Programs (Icebreakers, Viruses) */}
      <div className="w-full min-w-0 xl:col-span-2">
        <div className="flex items-center gap-2 text-xs font-mono font-bold text-cyber-neonCyan mb-1.5">
          <Cpu className="w-4 h-4 text-cyan-400" />
          <span>Programs ({rig.programs.length})</span>
        </div>
        <div className="flex gap-3 min-h-[4rem] p-2 bg-black/40 rounded-xl border border-slate-800/80 overflow-x-auto items-center">
          {rig.programs.length === 0 ? (
            <span className="text-xs text-slate-600 italic m-auto">No programs installed</span>
          ) : (
            rig.programs.map((card) => (
              <RigCard key={card.instanceId} card={card} size={cardSize} onInspect={onInspectCard} />
            ))
          )}
        </div>
      </div>

      {/* Hardware (Consoles, Chips) */}
      <div className="w-full min-w-0">
        <div className="flex items-center gap-2 text-xs font-mono font-bold text-amber-400 mb-1.5">
          <HardDrive className="w-4 h-4 text-amber-400" />
          <span>Hardware ({rig.hardware.length})</span>
        </div>
        <div className="flex gap-3 min-h-[4rem] p-2 bg-black/40 rounded-xl border border-slate-800/80 overflow-x-auto items-center">
          {rig.hardware.length === 0 ? (
            <span className="text-xs text-slate-600 italic m-auto">No hardware installed</span>
          ) : (
            rig.hardware.map((card) => (
              <RigCard key={card.instanceId} card={card} size={cardSize} onInspect={onInspectCard} />
            ))
          )}
        </div>
      </div>

      {/* Resources (Connections, Virtual) */}
      <div className="w-full min-w-0">
        <div className="flex items-center gap-2 text-xs font-mono font-bold text-cyber-neonPink mb-1.5">
          <Users className="w-4 h-4 text-pink-400" />
          <span>Resources ({rig.resources.length})</span>
        </div>
        <div className="flex gap-3 min-h-[4rem] p-2 bg-black/40 rounded-xl border border-slate-800/80 overflow-x-auto items-center">
          {rig.resources.length === 0 ? (
            <span className="text-xs text-slate-600 italic m-auto">No resources installed</span>
          ) : (
            rig.resources.map((card) => (
              <RigCard key={card.instanceId} card={card} size={cardSize} onInspect={onInspectCard} />
            ))
          )}
        </div>
      </div>
      </div>
    </div>
  );
};
