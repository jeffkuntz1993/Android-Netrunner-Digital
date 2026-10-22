import { describe, expect, it } from 'vitest';
import cards from '../src/data/system-gateway-cards.json';
import { GLOSSARY, annotateKeywords, cardKeywords, labelKeyword } from '../src/ui/glossary';

describe('keyword glossary', () => {
  it('marks the first mention of each term, preferring the longest match', () => {
    const html = annotateKeywords('Do 2 net damage. Do 2 net damage. Give the Runner 1 tag.');
    expect(html.match(/data-kw="net-damage"/g)).toHaveLength(1);
    expect(html).toContain('<span data-kw="net-damage" class="kw">net damage</span>');
    expect(html).toContain('<span data-kw="tag" class="kw">tag</span>');
  });

  it('leaves symbols, HTML tags and longer words alone', () => {
    const html = annotateKeywords('<strong class="ice">1[credit]:</strong> Break 1 [subroutine]. Runner tagged.');
    expect(html).toContain('<strong class="ice">1[credit]:</strong>');
    expect(html).toContain('[subroutine]');
    expect(html).not.toMatch(/data-kw="run"/);
    expect(html).toContain('<span data-kw="tag" class="kw">tagged</span>');
  });

  it('keeps every card text intact apart from the added spans', () => {
    for (const card of cards as { text?: string }[]) {
      if (!card.text) continue;
      const stripped = annotateKeywords(card.text).replace(/<span data-kw="[^"]+" class="kw">([^<]*)<\/span>/g, '$1');
      expect(stripped).toBe(card.text);
    }
  });

  it('lists the less obvious terms on a card, including rules symbols', () => {
    expect(cardKeywords('+1[mu]\nLimit 1 <strong>console</strong> per player.')).toEqual(['console', 'mu']);
    expect(cardKeywords('Gain 9[credit].')).toEqual([]);
  });

  it('has an entry for each pile label', () => {
    for (const label of ['HQ', 'R&D', 'Archives', 'Stack', 'Heap', 'Grip', 'Scored', 'Stolen']) {
      expect(GLOSSARY[labelKeyword(label)]).toBeDefined();
    }
  });
});
