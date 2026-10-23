import React from 'react';
import { RunnerRig } from '../../core/types/state';
import { CardInstance } from '../../core/types/card';
import { CardView } from './CardView';
import { Cpu, HardDrive, Users } from 'lucide-react';

interface RigViewProps {
  rig: RunnerRig;
  onInspectCard?: (card: CardInstance) => void;
  /** The Runner's identity, Stack and Heap, shown beside the rig. */
  aside?: React.ReactNode;
}

/** An installed card, with any cards hosted faceup on it (Bling, Madani, Detente) tucked beneath. */
const RigCard: React.FC<{ card: CardInstance; onInspect?: (card: CardInstance) => void }> = ({ card, onInspect }) => {
  const hosted = card.hostedCards ?? [];
  if (hosted.length === 0) return <CardView card={card} size="fit" onInspect={onInspect} />;
  return (
    <div className="flex items-end gap-0.5 shrink-0" data-testid={`hosted-on-${card.instanceId}`}>
      <CardView card={card} size="fit" onInspect={onInspect} />
      <div className="flex flex-col gap-0.5" title={`Hosted (${hosted.length})`}>
        {hosted.map(h => (
          <CardView key={h.instanceId} card={h} size="fit-sm" notInstalled onInspect={onInspect} />
        ))}
      </div>
    </div>
  );
};

const Row: React.FC<{
  icon: React.ReactNode;
  label: string;
  color: string;
  cards: CardInstance[];
  onInspect?: (card: CardInstance) => void;
  className?: string;
}> = ({ icon, label, color, cards, onInspect, className = '' }) => (
  <div className={`min-w-0 flex flex-col gap-0.5 ${className}`}>
    <div className={`flex items-center gap-1 text-[10px] font-mono font-bold uppercase tracking-wider ${color}`}>
      {icon}
      <span>
        {label} ({cards.length})
      </span>
    </div>
    <div className="flex gap-1.5 p-1 bg-black/40 rounded-xl border border-slate-800/80 overflow-x-auto items-center" style={{ minHeight: 'calc(var(--card-h) + 0.5rem)' }}>
      {cards.length === 0 ? (
        <span className="text-[10px] text-slate-600 italic m-auto">None</span>
      ) : (
        cards.map(card => <RigCard key={card.instanceId} card={card} onInspect={onInspect} />)
      )}
    </div>
  </div>
);

export const RigView: React.FC<RigViewProps> = ({ rig, onInspectCard, aside }) => {
  return (
    // As on the table: programs in the front row (toward the Corp), then hardware and resources
    <div className="flex gap-2 min-w-0">
      {aside && <div className="grid grid-cols-2 gap-1.5 shrink-0 content-start">{aside}</div>}
      <div className="flex flex-col gap-1 flex-1 min-w-0">
        <Row icon={<Cpu className="w-3 h-3" />} label="Programs" color="text-cyber-neonCyan" cards={rig.programs} onInspect={onInspectCard} />
        <div className="flex gap-2 min-w-0">
          <Row icon={<HardDrive className="w-3 h-3" />} label="Hardware" color="text-amber-400" cards={rig.hardware} onInspect={onInspectCard} className="flex-1" />
          <Row icon={<Users className="w-3 h-3" />} label="Resources" color="text-cyber-neonPink" cards={rig.resources} onInspect={onInspectCard} className="flex-[2]" />
        </div>
      </div>
    </div>
  );
};
