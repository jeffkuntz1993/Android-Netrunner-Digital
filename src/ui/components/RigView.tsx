import React from 'react';
import { RunnerRig } from '../../core/types/state';
import { CardInstance } from '../../core/types/card';
import { CardView } from './CardView';
import { Bug, Cpu, HardDrive, Users } from 'lucide-react';
import { clearHostLink, lightHostLink, useHostLinkLit } from '../hostLinks';

interface RigViewProps {
  rig: RunnerRig;
  onInspectCard?: (card: CardInstance) => void;
  /** The Runner's identity, Stack and Heap, shown beside the rig. */
  aside?: React.ReactNode;
  /** Where a card installed on Corp ice (Botulus, Tranquilizer) sits, e.g. "R&D · Ice Wall". */
  hostLabel?: (card: CardInstance) => string | undefined;
}

/** An installed card, with any cards hosted faceup on it (Bling, Madani, Detente) tucked beneath. */
const RigCard: React.FC<{ card: CardInstance; onInspect?: (card: CardInstance) => void; hostLabel?: string }> = ({
  card,
  onInspect,
  hostLabel,
}) => {
  const hosted = card.hostedCards ?? [];
  const lit = useHostLinkLit(card.instanceId);
  // A trojan on Corp ice: say which ice, and outline it while hovered
  const face = card.hostedOnId ? (
    <div
      className={`relative rounded-xl ${lit ? 'host-link-lit' : ''}`}
      onMouseEnter={() => lightHostLink([card.instanceId, card.hostedOnId!])}
      onMouseLeave={clearHostLink}
      data-testid={`on-ice-${card.instanceId}`}
    >
      <CardView card={card} size="fit" onInspect={onInspect} />
      <div
        className="absolute inset-x-0.5 top-0.5 z-20 flex items-center gap-0.5 rounded bg-pink-950/95 border border-pink-500 px-0.5 text-[8px] leading-3 font-bold text-pink-100 pointer-events-none"
        title={`Installed on ${hostLabel ?? 'Corp ice'}`}
      >
        <Bug className="w-2.5 h-2.5 shrink-0" />
        <span className="truncate">{hostLabel ?? 'On ice'}</span>
      </div>
    </div>
  ) : (
    <CardView card={card} size="fit" onInspect={onInspect} />
  );
  if (hosted.length === 0) return face;
  return (
    <div className="flex items-end gap-0.5 shrink-0" data-testid={`hosted-on-${card.instanceId}`}>
      {face}
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
  hostLabel?: (card: CardInstance) => string | undefined;
  className?: string;
}> = ({ icon, label, color, cards, onInspect, hostLabel, className = '' }) => (
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
        cards.map(card => <RigCard key={card.instanceId} card={card} onInspect={onInspect} hostLabel={hostLabel?.(card)} />)
      )}
    </div>
  </div>
);

export const RigView: React.FC<RigViewProps> = ({ rig, onInspectCard, aside, hostLabel }) => {
  return (
    // As on the table: programs in the front row (toward the Corp), then hardware and resources
    <div className="flex gap-2 min-w-0">
      {aside && <div className="grid grid-cols-2 gap-1.5 shrink-0 content-start">{aside}</div>}
      <div className="flex flex-col gap-1 flex-1 min-w-0">
        <Row icon={<Cpu className="w-3 h-3" />} label="Programs" color="text-cyber-neonCyan" cards={rig.programs} onInspect={onInspectCard} hostLabel={hostLabel} />
        <div className="flex gap-2 min-w-0">
          <Row icon={<HardDrive className="w-3 h-3" />} label="Hardware" color="text-amber-400" cards={rig.hardware} onInspect={onInspectCard} hostLabel={hostLabel} className="flex-1" />
          <Row icon={<Users className="w-3 h-3" />} label="Resources" color="text-cyber-neonPink" cards={rig.resources} onInspect={onInspectCard} hostLabel={hostLabel} className="flex-[2]" />
        </div>
      </div>
    </div>
  );
};
