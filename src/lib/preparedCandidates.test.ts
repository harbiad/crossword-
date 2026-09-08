import { describe, expect, it } from 'vitest';
import { indexCandidates, lookupCandidates, prepareCandidates } from './preparedCandidates';
import { getEntryCellAt } from './crossword';
import { prepareTemplate } from './preparedTemplate';

it('normalizes once, preserves canonical identity and both Arabic yeh forms', () => {
  const prepared = prepareCandidates([
    { answer: ' h ello ', clue: ' greeting ' }, { answer: 'إِلـى', clue: 'to' },
    { answer: 'علي', clue: 'Ali' }, { answer: 'X', clue: 'short' },
  ], 7, () => 0.5);
  expect(prepared.words.map(w => w.answer).sort()).toEqual(['HELLO', 'الى', 'علي'].sort());
  expect(prepared.words.find(w => w.answer === 'HELLO')?.clue).toBe('greeting');
  const variants = [...lookupCandidates(prepared, Array(5).fill(null), new Set())];
  expect(variants.map(w => [w.answer, w.isInverted])).toEqual([['HELLO', false], ['HELLO', true]]);
  expect([...lookupCandidates(prepared, Array(5).fill(null), new Set(['HELLO']))]).toEqual([]);
});

for (const [language, answerDirection, answer] of [['English', 'ltr', 'HELLO'], ['Arabic', 'rtl', 'سلام']] as const) {
  for (const direction of ['across', 'down'] as const) for (const isInverted of [false, true]) {
    it(`indexed ${language} ${direction} ${isInverted ? 'inverted' : 'normal'} matches canonical grid characters`, () => {
      const n = answer.length;
      const entry = { row: 0, col: direction === 'across' && answerDirection === 'rtl' ? n - 1 : 0,
        direction, answer, isInverted };
      const grid = new Map<string, string>();
      for (let i = 0; i < n; i++) {
        const { r, c } = getEntryCellAt(entry, i, answerDirection);
        grid.set(`${r},${c}`, answer[i]);
      }
      const pattern = Array.from({ length: n }, (_, i) => {
        const { r, c } = getEntryCellAt({ ...entry, isInverted: false }, i, answerDirection);
        return grid.get(`${r},${c}`)!;
      });
      const prepared = indexCandidates([{ answer, clue: 'Misleading (inverted)' }]);
      expect([...lookupCandidates(prepared, pattern, new Set())]).toEqual([{ answer, clue: 'Misleading (inverted)', isInverted }]);
      expect([...lookupCandidates(prepared, pattern, new Set([answer]))]).toEqual([]);
    });
  }
}

it('starts with the smallest posting and filters only that subset', () => {
  const words = Array.from({ length: 100 }, (_, i) => ({ answer: `A${String(i).padStart(3, '0')}E`, clue: '' }));
  words.push({ answer: 'AXXXZ', clue: 'rare' });
  const prepared = indexCandidates(words);
  const stats = { examined: 0 };
  expect([...lookupCandidates(prepared, ['A', null, null, null, 'Z'], new Set(), undefined, stats)])
    .toEqual([{ answer: 'AXXXZ', clue: 'rare', isInverted: false }]);
  expect(stats.examined).toBe(1);
});

it('preserves full-scan order and results for all patterns, windows and used identities', () => {
  const words = ['ABBA', 'ABCA', 'CBAB', 'DEAD', 'ACDC', 'BABA', 'ABBA'].map((answer, i) => ({ answer, clue: String(i) }));
  const prepared = indexCandidates(words);
  for (let mask = 0; mask < 16; mask++) for (let offset = 0; offset < words.length; offset++) for (const count of [1, 3, words.length]) {
    const pattern = [...'ABBA'].map((char, i) => mask & (1 << i) ? char : null);
    const used = mask % 2 ? new Set(['ABBA']) : new Set<string>();
    const expected = Array.from({ length: count }, (_, i) => words[(offset + i) % words.length])
      .flatMap(word => [false, true].map(isInverted => ({ ...word, isInverted })))
      .filter(word => !used.has(word.answer) && pattern.every((char, i) => !char || char === word.answer[word.isInverted ? 3 - i : i]));
    expect([...lookupCandidates(prepared, pattern, used, { offset, count })]).toEqual(expected);
  }
});

it('shares cached orientation records and supports early-exit forward checking', () => {
  const prepared = indexCandidates([{ answer: 'ABCD', clue: '' }, { answer: 'ABCE', clue: '' }]);
  const first = lookupCandidates(prepared, ['A', null, null, null], new Set()).next().value;
  expect(first).toBe(prepared.byLength.get(4)!.normal[0]);
  expect(lookupCandidates(prepared, ['X', null, null, null], new Set()).next().done).toBe(true);
  expect(lookupCandidates(prepared, ['A', null, null, null], new Set(['ABCD', 'ABCE'])).next().done).toBe(true);
});

describe('cached template geometry', () => {
  it('reuses identical layouts but separates language direction and changed layouts', () => {
    const template = [[1, 1, 1], [1, 0, 1], [1, 1, 1]];
    const ltr = prepareTemplate(template, 'ltr');
    expect(prepareTemplate(template.map(r => r.slice()), 'ltr')).toBe(ltr);
    const rtl = prepareTemplate(template, 'rtl');
    expect(rtl).not.toBe(ltr);
    expect(ltr.cells.get(ltr.slots[0])![0]).toEqual({ r: 0, c: 0 });
    expect(rtl.cells.get(rtl.slots[0])![0]).toEqual({ r: 0, c: 2 });
    expect(ltr.neighbors.get(ltr.slots[0])).toHaveLength(2);
    template[1][1] = 1;
    expect(prepareTemplate(template, 'ltr')).not.toBe(ltr);
  });
});
