import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { GLOSSARY } from '../glossary';

/** Marks UI text as a rules term; hovering it shows the glossary tooltip. */
export const Keyword: React.FC<{ id: string; children: React.ReactNode; className?: string }> = ({ id, children, className = '' }) =>
  GLOSSARY[id] ? (
    <span data-kw={id} className={`kw-label ${className}`}>
      {children}
    </span>
  ) : (
    <span className={className}>{children}</span>
  );

const WIDTH = 280;

/**
 * One tooltip for the whole app. Any element with data-kw="<glossary id>", including
 * spans inside card text set with dangerouslySetInnerHTML, shows that term's definition on hover.
 */
export const KeywordTooltip: React.FC = () => {
  const [tip, setTip] = useState<{ id: string; rect: DOMRect } | null>(null);

  useEffect(() => {
    let current: Element | null = null;
    const over = (e: MouseEvent) => {
      const el = (e.target as Element | null)?.closest?.('[data-kw]') ?? null;
      if (el === current) return;
      current = el;
      const id = el?.getAttribute('data-kw');
      setTip(el && id && GLOSSARY[id] ? { id, rect: el.getBoundingClientRect() } : null);
    };
    const hide = () => {
      current = null;
      setTip(null);
    };
    // Follow the term when the page scrolls under the pointer
    const follow = () => {
      const id = current?.getAttribute('data-kw');
      if (current && id) setTip(current.isConnected ? { id, rect: current.getBoundingClientRect() } : null);
    };
    document.addEventListener('mouseover', over);
    document.addEventListener('scroll', follow, true);
    document.addEventListener('mousedown', hide);
    return () => {
      document.removeEventListener('mouseover', over);
      document.removeEventListener('scroll', follow, true);
      document.removeEventListener('mousedown', hide);
    };
  }, []);

  if (!tip) return null;
  const entry = GLOSSARY[tip.id];
  const pad = 8;
  const left = Math.max(pad, Math.min(window.innerWidth - WIDTH - pad, tip.rect.left + tip.rect.width / 2 - WIDTH / 2));
  // Above the term when there is room, otherwise below it
  const above = tip.rect.top > 140;
  const style: React.CSSProperties = above
    ? { left, bottom: window.innerHeight - tip.rect.top + 6 }
    : { left, top: tip.rect.bottom + 6 };

  return createPortal(
    <div
      role="tooltip"
      data-testid="keyword-tooltip"
      style={{ position: 'fixed', width: WIDTH, zIndex: 10050, ...style }}
      className="pointer-events-none rounded-lg border border-amber-500/70 bg-slate-950/95 px-3 py-2 font-mono text-xs leading-snug text-slate-200 shadow-2xl backdrop-blur"
    >
      <div className="mb-0.5 font-bold text-amber-300">{entry.term}</div>
      {entry.text}
    </div>,
    document.body
  );
};
