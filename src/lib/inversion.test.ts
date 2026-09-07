import { describe, expect, it } from 'vitest';
import { checkEntry, displayClue, getAdjacentEntryCell, getEntryCellAt, getEntryCells, revealEntries } from './crossword';
import { constructCrossword, type Placement } from './construct';
import { buildCrosswordFromPlacements, validatePuzzle } from './generateCrossword';

for (const [language, answerDirection, answer] of [['English', 'ltr', 'HELLO'], ['Arabic', 'rtl', 'سلام']] as const) {
  for (const direction of ['across', 'down'] as const) {
    for (const isInverted of [false, true]) {
      it(`${language} ${direction} ${isInverted ? 'inverted' : 'normal'} preserves canonical spelling throughout gameplay`, () => {
        const n = answer.length;
        const row = direction === 'across' ? 1 : 0;
        const col = direction === 'across' ? (answerDirection === 'rtl' ? n - 1 : 0) : 1;
        const target: Placement = { answer, clue: 'Plain vocabulary clue', row, col, direction, isInverted };
        // Independent expected physical coordinates, not computed by the production helper.
        const expected = Array.from({ length: n }, (_, i) => {
          const offset = isInverted ? n - 1 - i : i;
          return direction === 'down' ? { r: offset, c: col }
            : { r: row, c: answerDirection === 'rtl' ? n - 1 - offset : offset };
        });
        const chars = Array.from({ length: n }, () => Array<string>(n).fill('X'));
        expected.forEach(({ r, c }, i) => { chars[r][c] = answer[i]; });
        const placements: Placement[] = [];
        for (const axis of ['across', 'down'] as const) for (let k = 0; k < n; k++) {
          if (axis === direction && k === 1) { placements.push(target); continue; }
          const letters = axis === 'down' ? chars.map(r => r[k]) : chars[k].slice();
          if (axis === 'across' && answerDirection === 'rtl') letters.reverse();
          placements.push({ direction: axis, row: axis === 'down' ? 0 : k,
            col: axis === 'down' ? k : answerDirection === 'rtl' ? n - 1 : 0,
            answer: letters.join(''), clue: 'Crossing', isInverted: false });
        }
        const cw = buildCrosswordFromPlacements(n, chars.map(r => r.map(() => 1)), placements, answerDirection);
        expect(cw).not.toBeNull();
        const entry = cw!.entries.find(e => e.clue === target.clue)!;
        expect(entry.answer).toBe(answer);
        expect(entry.isInverted).toBe(isInverted);
        expect(getEntryCellAt(entry, 0, answerDirection)).toEqual(expected[0]);
        expect(getEntryCells(entry, answerDirection)).toEqual(expected);
        expected.forEach(({ r, c }, i) => {
          expect(cw!.grid[r][c]).toMatchObject({ type: 'letter', char: answer[i] });
          expect(getAdjacentEntryCell(entry, r, c, 1, answerDirection)).toEqual(expected[i + 1] ?? null);
          expect(getAdjacentEntryCell(entry, r, c, -1, answerDirection)).toEqual(expected[i - 1] ?? null);
        });
        expect(cw!.grid[row][col]).toMatchObject({ number: entry.number });
        expect(validatePuzzle(cw!.grid, cw!.entries, answerDirection).ok).toBe(true);
        const revealed = revealEntries([entry], {}, answerDirection);
        expected.forEach(({ r, c }, i) => expect(revealed[`${r},${c}`]).toBe(answer[i]));
        expect(checkEntry(entry, revealed, answerDirection)).toBe(true);
        expect(checkEntry(entry, {}, answerDirection)).toBe(false);
        expect(checkEntry(entry, { ...revealed, [`${expected[0].r},${expected[0].c}`]: '?' }, answerDirection)).toBe(false);
        const solved = revealEntries(cw!.entries, {}, answerDirection);
        expect(cw!.entries.every(e => checkEntry(e, solved, answerDirection))).toBe(true);
        const renamedEntry = { ...entry, clue: 'Misleading (inverted)' };
        expect(getEntryCells(renamedEntry, answerDirection)).toEqual(expected);
        expect(checkEntry(renamedEntry, revealed, answerDirection)).toBe(true);
        expect(displayClue(entry)).toBe(target.clue + (isInverted ? ' (inverted)' : ''));
      });
    }
  }
}

describe.each(['ltr', 'rtl'] as const)('solver orientations for %s answers', answerDirection => {
  it.each(['greedy', 'backtracking', 'word-centric', 'fill-all'])('%s uses canonical vocabulary with orientation flags', strategy => {
    const answers = answerDirection === 'ltr' ? ['BA', 'CD', 'AC', 'BD'] : ['با', 'تث', 'ات', 'بث'];
    const placements = constructCrossword(2, answers.map(answer => ({ answer, clue: answer })), [[1, 1], [1, 1]], answerDirection, {
      useBacktracking: strategy === 'backtracking', useWordCentric: strategy === 'word-centric',
      useFillAllSlots: strategy === 'fill-all', minWords: 2, targetWords: 4, timeBudgetMs: 1000,
    });
    expect(placements.length).toBeGreaterThanOrEqual(2);
    expect(new Set(placements.map(p => p.answer)).size).toBe(placements.length);
    const cells = new Map<string, string>();
    for (const p of placements) {
      expect(answers).toContain(p.answer);
      expect(p.clue).toBe(p.answer);
      expect(typeof p.isInverted).toBe('boolean');
      for (let i = 0; i < p.answer.length; i++) {
        const { r, c } = getEntryCellAt(p, i, answerDirection);
        const key = `${r},${c}`;
        if (cells.has(key)) expect(cells.get(key)).toBe(p.answer[i]);
        cells.set(key, p.answer[i]);
      }
    }
    if (strategy === 'fill-all') {
      expect(placements).toHaveLength(4);
      expect(placements.some(p => p.isInverted)).toBe(true);
    }
  });
});
