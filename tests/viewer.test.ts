import { describe, expect, it } from 'vitest';
import { executeAction } from '../src/core';
import { actingSide, corpRezWindow } from '../src/ui/viewer';
import { soundFor } from '../src/ui/sound';
import { installCorpForTest, installIceForTest, newGame, newGameAtSetup, run } from './helpers';

const PALISADE = '30072';
const MANEGARM = '30045';

describe('who acts (pass and play)', () => {
  it('follows prompts, then the active player', () => {
    const atSetup = newGameAtSetup();
    expect(actingSide(atSetup, false)).toBe(atSetup.pendingPrompts[0].side);
    const state = newGame();
    expect(actingSide(state, false)).toBe('corp');
    state.winner = 'corp';
    expect(actingSide(state, false)).toBeNull();
  });

  it('opens a Corp rez window on approached unrezzed ice, and the Runner acts once it is passed', () => {
    let state = newGame();
    installIceForTest(state, PALISADE, 'hq', false);
    state = run(state, 'hq');
    const window = corpRezWindow(state, 1);
    expect(window?.cards.map(c => c.cardCode)).toEqual([PALISADE]);
    expect(actingSide(state, true)).toBe('corp');
    expect(actingSide(state, false)).toBe('runner');
    // A different run gets a different key, so a "no rez" answer is not reused
    expect(corpRezWindow(state, 2)?.key).not.toBe(window?.key);
  });

  it('has no rez window for rezzed ice or when the Corp cannot pay', () => {
    let state = newGame();
    installIceForTest(state, PALISADE, 'hq', true);
    expect(corpRezWindow(run(state, 'hq'), 1)).toBeNull();

    state = newGame();
    installIceForTest(state, PALISADE, 'hq', false);
    state.corp.credits = 0;
    expect(corpRezWindow(run(state, 'hq'), 1)).toBeNull();
  });

  it('offers unrezzed root cards when the Runner approaches the server', () => {
    let state = newGame();
    installCorpForTest(state, MANEGARM, 'hq');
    state = run(state, 'hq');
    while (state.activeRun && state.activeRun.phase !== 'approach_server') {
      state = executeAction(state, { type: 'CONTINUE_RUN', player: 'runner' });
    }
    expect(corpRezWindow(state, 1)?.cards.map(c => c.cardCode)).toEqual([MANEGARM]);
  });
});

describe('sound effects', () => {
  const entry = (message: string) => ({ id: 'x', turnNumber: 1, player: 'corp' as const, message });
  it('picks the most important sound from an action', () => {
    expect(soundFor([])).toBeNull();
    expect(soundFor([entry('Corp spent [click] to gain 1 credit.')])).toBe('credit');
    expect(soundFor([entry('Runner initiated a run on HQ!'), entry('Corp spent 3 [credit] to rez Palisade.')])).toBe('run');
    expect(soundFor([entry('Runner accessed and stole Offworld Office for 2 agenda point(s)! Total: 2')])).toBe('steal');
    expect(soundFor([entry('Corp wins: the Runner was flatlined.'), entry('Corp did 3 net damage.')])).toBe('win');
    expect(soundFor([entry('Corp ended turn. Runner turn begins (4 clicks).')])).toBe('click');
  });
});
