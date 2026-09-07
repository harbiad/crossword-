import { describe, it, expect, vi } from 'vitest';
import { buildCrosswordFromPlacements, generateCrossword, validatePuzzle } from './generateCrossword';
import { getEntryCellAt, type Cell, type Crossword, type Entry } from './crossword';
import * as construction from './construct';
import * as generation from './generateCrossword';
import * as templates from './templates';
import { fixtureFromRows, generateFixture, makePuzzle, runGenerationCases } from './testing/puzzleFixtures';

function letter(puzzle: Crossword, r: number, c: number) {
  const cell = puzzle.grid[r][c];
  if (cell.type !== 'letter') throw new Error(`Expected letter at ${r},${c}`);
  return cell;
}

function errorsAfter(mutate: (puzzle: Crossword) => void, dir: 'ltr' | 'rtl' = 'ltr') {
  const puzzle = makePuzzle(['ABC', 'DEF', 'GHI'], dir);
  mutate(puzzle);
  const result = validatePuzzle(puzzle.grid, puzzle.entries, dir);
  expect(result.ok).toBe(false);
  return result.errors.join('\n');
}

describe('structural validation', () => {
  it.each(['ltr', 'rtl'] as const)('accepts a fully clued %s grid with normal and inverted entries', dir => {
    const puzzle = makePuzzle(dir === 'ltr' ? ['ABC', 'DEF', 'GHI'] : ['ابت', 'ثجح', 'خدذ'], dir);
    expect(validatePuzzle(puzzle.grid, puzzle.entries, dir)).toEqual({ ok: true, errors: [] });
    for (const entry of puzzle.entries) for (let i = 0; i < entry.answer.length; i++) {
      const { r, c } = getEntryCellAt(entry, i, dir);
      expect(letter(puzzle, r, c).char).toBe(entry.answer[i]);
      expect(letter(puzzle, r, c).entries.has(entry.id)).toBe(true);
    }
  });

  it('allows a single-entry puzzle without requiring a crossing', () => {
    const puzzle = makePuzzle(['AB', '##']);
    expect(puzzle.entries).toHaveLength(1);
    expect(validatePuzzle(puzzle.grid, puzzle.entries, 'ltr').ok).toBe(true);
  });

  it('rejects out-of-bounds inverted traversal without throwing', () => {
    expect(errorsAfter(p => { p.entries[0].row = -1; })).toContain('out of bounds');
  });
  it('rejects traversal through a block', () => {
    expect(errorsAfter(p => { p.grid[0][0] = { r: 0, c: 0, type: 'block' }; })).toContain('hits non-letter');
  });
  it('rejects wrong solution characters', () => {
    expect(errorsAfter(p => { letter(p, 0, 0).char = 'Z'; })).toContain('mismatch at 0,0');
  });
  it('rejects a missing entry reference', () => {
    expect(errorsAfter(p => { letter(p, 0, 0).entries.delete(p.entries[0].id); })).toContain('missing in cell entries');
  });
  it('rejects zero references and more than two references', () => {
    expect(errorsAfter(p => { letter(p, 1, 1).entries.clear(); })).toContain('found 0');
    expect(errorsAfter(p => { letter(p, 1, 1).entries.add('fake'); })).toContain('found 3');
  });
  it('rejects unknown ids and references to entries that do not traverse the cell', () => {
    expect(errorsAfter(p => { letter(p, 1, 1).entries = new Set(['fake']); })).toContain('Unknown entry fake');
    expect(errorsAfter(p => { letter(p, 2, 2).entries.add(p.entries[0].id); })).toContain('does not traverse referenced cell');
  });
  it.each(['across', 'down'] as const)('rejects two %s entries overlapping even when the second hides its metadata', direction => {
    expect(errorsAfter(p => {
      const original = p.entries.find(e => e.direction === direction)!;
      p.entries.push({ ...original, id: 'duplicate-slot' });
    })).toContain(`Same-direction ${direction} overlap`);
  });
  it('rejects crossing characters that disagree', () => {
    expect(errorsAfter(p => { p.entries[0].answer = 'ZZZ'; })).toContain('Crossing mismatch');
  });
  it('rejects duplicate ids', () => {
    expect(errorsAfter(p => { p.entries.push({ ...p.entries[0] }); })).toContain('Duplicate entry id');
  });
  it('rejects duplicate clue entries for a geometric run', () => {
    expect(errorsAfter(p => { p.entries.push({ ...p.entries[0], id: 'duplicate-slot' }); })).toContain('must have exactly one clue entry; found 2');
  });
  it.each(['ltr', 'rtl'] as const)('rejects shortened entries at otherwise matching %s anchors', dir => {
    const errors = errorsAfter(p => { p.entries[0].answer = p.entries[0].answer.slice(0, 2); }, dir);
    expect(errors).toContain('length 3 must have exactly one clue entry; found 0');
    expect(errors).toContain('length 2 must match exactly one real grid run; found 0');
  });
  it('rejects missing clues and phantom entries', () => {
    expect(errorsAfter(p => { p.entries.pop(); })).toContain('must have exactly one clue entry; found 0');
    expect(errorsAfter(p => { p.entries[0].col = 1; })).toContain('must match exactly one real grid run; found 0');
  });
  it('rejects isolated entries even when all letter cells are orthogonally connected', () => {
    const errors = errorsAfter(p => {
      p.entries = p.entries.filter(e => e.direction === 'across');
      for (const row of p.grid) for (const cell of row) if (cell.type === 'letter') {
        cell.entries = new Set(p.entries.filter(e => e.row === cell.r).map(e => e.id));
      }
    });
    expect(errors).toContain('has no crossing');
    expect(errors).toContain('Entry intersection graph is disconnected');
    expect(errors).not.toContain('Letters are not fully connected');
  });
  it('rejects disconnected groups even if every entry has a crossing', () => {
    const puzzle = makePuzzle(['ABCD', 'EFGH', 'IJKL', 'MNOP']);
    const across = puzzle.entries.filter(e => e.direction === 'across');
    const down: Entry[] = [];
    for (let c = 0; c < 4; c++) for (const r of [0, 2]) {
      down.push({ id: `down-${r}-${c}`, row: r, col: c, direction: 'down', isInverted: false,
        answer: letter(puzzle, r, c).char + letter(puzzle, r + 1, c).char, clue: 'Split run', number: 1 });
    }
    puzzle.entries = [...across, ...down];
    for (const row of puzzle.grid) for (const cell of row) if (cell.type === 'letter') cell.entries.clear();
    for (const e of puzzle.entries) for (let i = 0; i < e.answer.length; i++) {
      const { r, c } = getEntryCellAt(e, i, 'ltr');
      letter(puzzle, r, c).entries.add(e.id);
    }
    const result = validatePuzzle(puzzle.grid, puzzle.entries, 'ltr');
    expect(result.ok).toBe(false);
    expect(result.errors.join('\n')).toContain('Entry intersection graph is disconnected');
    expect(result.errors.join('\n')).not.toContain('has no crossing');
    expect(result.errors.join('\n')).not.toContain('Letters are not fully connected');
  });
  it.each(['ltr', 'rtl'] as const)('keeps %s numbering at geometric anchors for inverted entries', dir => {
    const puzzle = makePuzzle(['ABC', 'DEF', 'GHI'], dir);
    const starts = [...new Set(puzzle.entries.map(e => `${e.row},${e.col}`))]
      .map(key => key.split(',').map(Number)).sort(([ar, ac], [br, bc]) => ar - br || (dir === 'rtl' ? bc - ac : ac - bc));
    starts.forEach(([r, c], index) => expect(letter(puzzle, r, c).number).toBe(index + 1));
    expect(errorsAfter(p => { delete letter(p, 0, dir === 'rtl' ? 2 : 0).number; }, dir)).toContain('Cell number mismatch');
    expect(errorsAfter(p => { p.entries[0].number = 99; }, dir)).toContain('Entry number mismatch');
    expect(errorsAfter(p => { letter(p, 1, 1).number = 99; }, dir)).toContain('Unexpected number');
  });
  it('rejects malformed, empty and invalid cells without crashing', () => {
    expect(validatePuzzle([], [], 'ltr').ok).toBe(false);
    expect(errorsAfter(p => { p.grid[0].pop(); })).toContain('length mismatch');
    expect(errorsAfter(p => { delete p.grid[0][0]; })).toContain('Empty or invalid cell');
    expect(errorsAfter(p => { p.grid[0][0] = { r: 0, c: 0, type: 'invalid' } as unknown as Cell; })).toContain('invalid cell');
    expect(errorsAfter(p => { letter(p, 0, 0).char = ''; })).toContain('one char');
    expect(errorsAfter(p => { letter(p, 0, 0).char = 'AB'; })).toContain('one char');
    expect(errorsAfter(p => { letter(p, 0, 0).r = 9; })).toContain('coordinates mismatch');
  });
  it('retains block-run and orthogonal connectivity validation', () => {
    expect(errorsAfter(p => { p.grid[1] = p.grid[1].map((_, c) => ({ r: 1, c, type: 'block' })); })).toContain('Block run constraint violated');
    expect(errorsAfter(p => { p.grid[1] = p.grid[1].map((_, c) => ({ r: 1, c, type: 'block' })); })).toContain('Letters are not fully connected');
  });
  it('rejects orphan letters and data stored on blocks', () => {
    expect(errorsAfter(p => { p.entries = []; })).toContain('must be traversed by 1–2 entries; found 0');
    expect(errorsAfter(p => { p.grid[0][0] = { r: 0, c: 0, type: 'block', char: 'A' } as unknown as Cell; })).toContain('Block contains letter data');
  });
});

describe('generation validation gate', () => {
  it('rejects a construction with an incomplete run', () => {
    const fixture = fixtureFromRows(['ABC', 'DEF', 'GHI'], 'ltr');
    fixture.placements[0] = { ...fixture.placements[0], answer: 'AB', isInverted: false };
    const log = vi.fn();
    expect(buildCrosswordFromPlacements(3, fixture.template, fixture.placements, 'ltr', { enabled: true, log })).toBeNull();
    expect(log).toHaveBeenCalledWith(expect.stringContaining('length 3 must have exactly one clue entry'));
  });
  it('rejects duplicate clue placements after building the entire grid', () => {
    const fixture = fixtureFromRows(['ABC', 'DEF', 'GHI'], 'ltr');
    fixture.placements.push({ ...fixture.placements[0] });
    expect(buildCrosswordFromPlacements(3, fixture.template, fixture.placements, 'ltr')).toBeNull();
  });
  it('generateCrossword rejects structurally invalid solver candidates', () => {
    const fixture = fixtureFromRows(['ABC', 'DEF', 'GHI'], 'ltr');
    fixture.placements[0] = { ...fixture.placements[0], answer: 'AB', isInverted: false };
    const solverSpy = vi.spyOn(construction, 'constructCrossword').mockReturnValue(fixture.placements);
    const templateSpy = vi.spyOn(templates, 'getTemplates').mockReturnValue([fixture.template]);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const puzzle = generateCrossword(3, fixture.wordClues, 'ltr');
      expect(solverSpy).toHaveBeenCalled();
      expect(puzzle.entries).toHaveLength(0);
      expect(puzzle.grid).toHaveLength(0);
    } finally {
      solverSpy.mockRestore();
      templateSpy.mockRestore();
      warn.mockRestore();
    }
  });
  it('stress diagnostics distinguish generation failure from invalid puzzles', () => {
    const empty: Crossword = { size: 7, width: 7, height: 7, grid: [], entries: [], answerDirection: 'ltr' };
    const invalid = makePuzzle(['ABC', 'DEF', 'GHI']);
    letter(invalid, 0, 0).char = '?';
    const generateSpy = vi.spyOn(generation, 'generateCrossword').mockReturnValueOnce(empty).mockReturnValueOnce(invalid);
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const report = runGenerationCases([3], [7]);
      expect(report.attempts).toBe(2);
      expect(report.generated).toBe(1);
      expect(report.generationFailures).toHaveLength(1);
      expect(report.invalidPuzzles).toHaveLength(1);
      expect(error).toHaveBeenCalledTimes(2);
      expect(JSON.parse(report.generationFailures[0])).toMatchObject({ seed: 3, gridSize: 7, answerDirection: 'rtl' });
      expect(JSON.parse(report.invalidPuzzles[0])).toMatchObject({ seed: 3, gridSize: 7, answerDirection: 'ltr',
        reason: expect.arrayContaining([expect.stringContaining('mismatch at 0,0')]),
        entries: expect.arrayContaining([expect.objectContaining({ id: expect.any(String), coordinates: expect.any(Array) })]),
      });
    } finally { generateSpy.mockRestore(); error.mockRestore(); }
  });
  it('explicitly reports empty generation as failure, not a valid puzzle', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const puzzle = generateCrossword(7, [], 'rtl');
      expect(puzzle.entries).toHaveLength(0);
      expect(puzzle.grid).toHaveLength(0);
      expect(validatePuzzle(puzzle.grid, puzzle.entries, 'rtl').ok).toBe(false);
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('generation failed'));
    } finally { warn.mockRestore(); }
  });
  it('normalizes Arabic Alef variants while preserving alef maksura', () => {
    const fixture = fixtureFromRows(['ابى', 'تثج', 'حخد'], 'rtl');
    fixture.wordClues.forEach(w => { w.answer = w.answer.replace(/ا/g, 'أَ'); });
    const puzzle = generateFixture(1, 3, 'rtl', fixture);
    expect(puzzle.entries).toHaveLength(6);
    expect(puzzle.entries.some(e => e.answer.includes('ا'))).toBe(true);
    expect(puzzle.entries.some(e => e.answer.includes('ى'))).toBe(true);
    expect(puzzle.entries.every(e => !e.answer.includes('أ') && !e.answer.includes('َ'))).toBe(true);
    expect(validatePuzzle(puzzle.grid, puzzle.entries, 'rtl').ok).toBe(true);
  });
  it('preserves entry metadata through generation', () => {
    const fixture = fixtureFromRows(['ABC', 'DEF', 'GHI'], 'ltr');
    fixture.wordClues[0].isRepeatedLetter = true;
    const puzzle = generateFixture(1, 3, 'ltr', fixture);
    expect(puzzle.entries).toHaveLength(6);
    expect(puzzle.entries.find(e => e.clue === fixture.wordClues[0].clue)?.isRepeatedLetter).toBe(true);
    expect(puzzle.answerDirection).toBe('ltr');
  });
  it('validates deterministic samples of both languages and every supported grid size', () => {
    const report = runGenerationCases([1, 2], [7, 9, 11, 13]);
    expect(report.generationFailures).toEqual([]);
    expect(report.invalidPuzzles).toEqual([]);
    expect(report.generated).toBe(report.attempts);
    expect(report.attempts).toBe(16);
  });
});
