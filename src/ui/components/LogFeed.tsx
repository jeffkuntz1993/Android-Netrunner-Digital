import React, { useEffect, useRef } from 'react';
import { LogEntry } from '../../core/types/state';
import { Terminal } from 'lucide-react';

interface LogFeedProps {
  logs: LogEntry[];
  /** Height classes (default h-48). */
  className?: string;
}

export const LogFeed: React.FC<LogFeedProps> = ({ logs, className = 'h-48' }) => {
  const listRef = useRef<HTMLDivElement>(null);

  // Keep the newest entry in view by scrolling the log box itself.
  // (scrollIntoView would also scroll the whole page down to the log.)
  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTo({ top: list.scrollHeight, behavior: 'smooth' });
  }, [logs.length]);

  return (
    <div className={`flex flex-col ${className} bg-slate-950/90 border border-slate-800 rounded-xl overflow-hidden font-mono text-xs shadow-inner`}>
      <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 border-b border-slate-800 text-[11px] text-slate-400">
        <Terminal className="w-3.5 h-3.5 text-cyber-neonCyan" />
        <span className="font-bold tracking-wider uppercase text-slate-300">Terminal Log</span>
        <span className="ml-auto text-[10px] text-slate-500">{logs.length} entries</span>
      </div>
      <div ref={listRef} className="flex-1 overflow-y-auto p-2.5 space-y-1.5">
        {logs.map((log) => {
          const colorClass =
            log.player === 'corp'
              ? 'text-cyan-400'
              : log.player === 'runner'
              ? 'text-pink-400'
              : 'text-amber-400';

          return (
            <div key={log.id} className="leading-snug flex items-start gap-1.5">
              <span className={`uppercase font-bold text-[10px] px-1 rounded bg-slate-900 border border-slate-800 ${colorClass}`}>
                {log.player}
              </span>
              <span className="text-slate-300">{log.message}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
