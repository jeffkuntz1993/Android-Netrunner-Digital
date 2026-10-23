import React, { useEffect, useRef, useState } from 'react';
import { LogEntry } from '../../core/types/state';
import { CardInstance } from '../../core/types/card';
import { ALL_CARDS } from '../../data/cards';
import { CardPopout } from './CardPopout';
import { Terminal } from 'lucide-react';

// Every printed title (and its accent-free spelling) mapped to its card code, so
// card names the log already prints can show the card on hover.
const CODE_BY_TITLE = new Map<string, string>();
for (const c of ALL_CARDS) {
  CODE_BY_TITLE.set(c.title, c.code);
  if (c.stripped_title) CODE_BY_TITLE.set(c.stripped_title, c.code);
}
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// Longest first so "Bran 1.0" wins over a shorter title inside it; letters or
// digits on either side mean it's part of another word.
const TITLE_RE = new RegExp(
  `(?<![\\p{L}\\p{N}])(${[...CODE_BY_TITLE.keys()].sort((a, b) => b.length - a.length).map(escape).join('|')})(?![\\p{L}\\p{N}])`,
  'gu',
);

/** Splits a log message into plain text and card names. */
export function splitCardNames(message: string): Array<string | { title: string; code: string }> {
  const parts: Array<string | { title: string; code: string }> = [];
  let last = 0;
  for (const m of message.matchAll(TITLE_RE)) {
    if (m.index > last) parts.push(message.slice(last, m.index));
    parts.push({ title: m[0], code: CODE_BY_TITLE.get(m[0])! });
    last = m.index + m[0].length;
  }
  if (last < message.length) parts.push(message.slice(last));
  return parts;
}

interface LogFeedProps {
  logs: LogEntry[];
  /** Height classes (default h-48). */
  className?: string;
}

export const LogFeed: React.FC<LogFeedProps> = ({ logs, className = 'h-48' }) => {
  const listRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState<{ card: CardInstance; rect: DOMRect } | null>(null);

  // Keep the newest entry in view by scrolling the log box itself.
  // (scrollIntoView would also scroll the whole page down to the log.)
  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTo({ top: list.scrollHeight, behavior: 'smooth' });
  }, [logs.length]);

  const show = (code: string) => (e: React.SyntheticEvent<HTMLElement>) =>
    setHovered({
      // Only the printed card: no counters or install state from the log
      card: { instanceId: `log-${code}`, cardCode: code, isRezzed: true, advancementCounters: 0, tokens: {}, hostedCardIds: [] },
      rect: e.currentTarget.getBoundingClientRect(),
    });
  const hide = () => setHovered(null);

  return (
    <div className={`flex flex-col ${className} bg-black/80 border border-slate-800 chamfer overflow-hidden font-mono text-xs shadow-inner`}>
      <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 border-b border-slate-800 text-[11px] text-slate-400">
        <Terminal className="w-3.5 h-3.5 text-cyber-terminal" />
        <span className="font-bold tracking-wider uppercase text-cyber-terminal">Terminal Log</span>
        <span className="ml-auto text-[10px] text-slate-500">{logs.length} entries</span>
      </div>
      <div ref={listRef} onScroll={hide} className="flex-1 overflow-y-auto p-2.5 space-y-1.5">
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
              <span className="terminal-text">
                {splitCardNames(log.message).map((part, i) =>
                  typeof part === 'string' ? (
                    part
                  ) : (
                    <span
                      key={i}
                      tabIndex={0}
                      data-testid="log-card"
                      className="text-slate-50 underline decoration-dotted decoration-cyber-terminal/70 underline-offset-2 cursor-help hover:text-amber-300 focus:text-amber-300"
                      onMouseEnter={show(part.code)}
                      onMouseLeave={hide}
                      onFocus={show(part.code)}
                      onBlur={hide}
                    >
                      {part.title}
                    </span>
                  ),
                )}
              </span>
            </div>
          );
        })}
        <div className="leading-snug terminal-text" aria-hidden="true">
          &gt; <span className="terminal-cursor" />
        </div>
      </div>
      {hovered && <CardPopout card={hovered.card} targetRect={hovered.rect} />}
    </div>
  );
};
