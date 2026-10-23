import { describe, expect, it } from 'vitest';
import { splitCardNames } from '../src/ui/components/CardNameText';
import { ALL_CARDS } from '../src/data/cards';

const code = (title: string) => ALL_CARDS.find(c => c.title === title)!.code;

describe('log card names', () => {
  it('picks out card titles, including accented ones and titles ending in punctuation', () => {
    const karuna = ALL_CARDS.find(c => c.stripped_title === 'Karuna')!;
    expect(splitCardNames(`Corp spent 4 [credit] to rez ${karuna.title}.`)).toEqual([
      'Corp spent 4 [credit] to rez ',
      { title: karuna.title, code: karuna.code },
      '.',
    ]);
    expect(splitCardNames('Runner played Byte!.')).toEqual(['Runner played ', { title: 'Byte!', code: code('Byte!') }, '.']);
  });

  it('leaves plain text alone and ignores titles inside other words', () => {
    expect(splitCardNames('Corp ended turn. Runner turn begins (4 clicks).')).toEqual([
      'Corp ended turn. Runner turn begins (4 clicks).',
    ]);
    expect(splitCardNames('Pinging the server')).toEqual(['Pinging the server']);
  });
});
