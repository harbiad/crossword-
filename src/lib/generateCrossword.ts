import type { Crossword, Cell, Entry, Direction } from './crossword';
import { constructCrossword, validateBlockRuns } from './construct';
import { getTemplates } from './templates';

export type WordClue = { answer: string; clue: string; isRepeatedLetter?: boolean };

type WorkingCell = Cell | null;

type NumberingResult = {
  gridNumbers: Map<string, number>;
  entryNumbers: Map<string, number>;
};

function normalizeAnswer(a: string): string {
  return a
    .trim()
    .replace(/\s+/g, '')
    .replace(/[ـ\u064B-\u065F\u0670]/g, '') // remove Arabic tatweel + harakat
    // Normalize Alef variants to plain Alef (ا) - these are all the same letter
    .replace(/[أإآٱ]/g, 'ا')
    // NOTE: Do NOT normalize ى (alef maksura) to ي - they are different letters
    .toUpperCase();
}

function makeId(dir: Direction, row: number, col: number) {
  return `${dir}:${row}:${col}`;
}

function getEntryStep(direction: Direction, answerDirection: 'rtl' | 'ltr') {
  if (direction === 'down') return { dr: 1, dc: 0 };
  return { dr: 0, dc: answerDirection === 'rtl' ? -1 : 1 };
}

function computeNumbering(
  grid: Cell[][],
  entries: Entry[],
  answerDirection: 'rtl' | 'ltr'
): NumberingResult {
  const gridNumbers = new Map<string, number>();
  const entryNumbers = new Map<string, number>();

  const startMap = new Map<string, string[]>();
  for (const entry of entries) {
    const key = `${entry.row},${entry.col}`;
    const list = startMap.get(key) ?? [];
    list.push(entry.id);
    startMap.set(key, list);
  }

  const starts = Array.from(startMap.keys()).map((key) => {
    const [r, c] = key.split(',').map(Number);
    return { r, c, key };
  });

  starts.sort((a, b) => {
    if (a.r !== b.r) return a.r - b.r;
    return answerDirection === 'rtl' ? b.c - a.c : a.c - b.c;
  });

  let counter = 1;
  for (const start of starts) {
    gridNumbers.set(start.key, counter);
    const ids = startMap.get(start.key) ?? [];
    for (const id of ids) entryNumbers.set(id, counter);
    counter++;
  }

  return { gridNumbers, entryNumbers };
}

function validatePuzzle(
  grid: Cell[][],
  entries: Entry[],
  answerDirection: 'rtl' | 'ltr'
): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  const size = grid.length;

  for (let r = 0; r < size; r++) {
    if (grid[r].length !== size) {
      errors.push(`Row ${r} length mismatch.`);
      break;
    }
  }

  const letterPositions = new Set<string>();
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const cell = grid[r][c];
      if (!cell) {
        errors.push(`Empty cell at ${r},${c}.`);
        continue;
      }
      if (cell.type === 'letter') {
        letterPositions.add(`${r},${c}`);
        if (!cell.char) errors.push(`Letter cell missing char at ${r},${c}.`);
        if (!cell.entries || cell.entries.size === 0) {
          errors.push(`Letter cell missing entries at ${r},${c}.`);
        }
      }
    }
  }

  for (const entry of entries) {
    const { dr, dc } = getEntryStep(entry.direction, answerDirection);
    for (let i = 0; i < entry.answer.length; i++) {
      const r = entry.row + dr * i;
      const c = entry.col + dc * i;
      if (r < 0 || c < 0 || r >= size || c >= size) {
        errors.push(`Entry ${entry.id} out of bounds at ${r},${c}.`);
        continue;
      }
      const cell = grid[r][c];
      if (!cell || cell.type !== 'letter') {
        errors.push(`Entry ${entry.id} hits non-letter at ${r},${c}.`);
        continue;
      }
      if (cell.char !== entry.answer[i]) {
        errors.push(`Entry ${entry.id} mismatch at ${r},${c}: ${cell.char} != ${entry.answer[i]}.`);
      }
      if (!cell.entries.has(entry.id)) {
        errors.push(`Entry ${entry.id} missing in cell entries at ${r},${c}.`);
      }
    }
  }

  if (letterPositions.size > 0) {
    const [start] = letterPositions;
    const [startR, startC] = start.split(',').map(Number);
    const queue: { r: number; c: number }[] = [{ r: startR, c: startC }];
    const visited = new Set<string>([start]);

    while (queue.length) {
      const { r, c } = queue.shift()!;
      const neighbors = [
        { r: r - 1, c },
        { r: r + 1, c },
        { r, c: c - 1 },
        { r, c: c + 1 },
      ];
      for (const n of neighbors) {
        if (n.r < 0 || n.c < 0 || n.r >= size || n.c >= size) continue;
        const key = `${n.r},${n.c}`;
        if (visited.has(key)) continue;
        if (letterPositions.has(key)) {
          visited.add(key);
          queue.push(n);
        }
      }
    }

    if (visited.size !== letterPositions.size) {
      errors.push('Letters are not fully connected.');
    }
  }

  const internalGrid: (string | null)[][] = grid.map((row) =>
    row.map((cell) => (cell.type === 'block' ? '#' : cell.char))
  );
  if (!validateBlockRuns(internalGrid, size)) {
    errors.push('Block run constraint violated.');
  }

  const numbering = computeNumbering(grid, entries, answerDirection);
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const cell = grid[r][c];
      if (cell.type !== 'letter' || cell.number === undefined) continue;
      const key = `${r},${c}`;
      const expected = numbering.gridNumbers.get(key);
      if (expected === undefined) {
        errors.push(`Unexpected number at ${key}.`);
      } else if (expected !== cell.number) {
        errors.push(`Cell number mismatch at ${key}.`);
      }
    }
  }
  for (const [key, number] of numbering.gridNumbers.entries()) {
    const [r, c] = key.split(',').map(Number);
    const cell = grid[r][c];
    if (cell.type !== 'letter') continue;
    if (cell.number !== number) {
      errors.push(`Cell number mismatch at ${key}.`);
    }
  }
  for (const entry of entries) {
    const expected = numbering.entryNumbers.get(entry.id);
    if (expected !== entry.number) {
      errors.push(`Entry number mismatch for ${entry.id}.`);
    }
  }

  return { ok: errors.length === 0, errors };
}

function buildCrosswordFromPlacements(
  size: number,
  template: number[][],
  placements: ReturnType<typeof constructCrossword>,
  answerDirection: 'rtl' | 'ltr'
): Crossword | null {
  const workingGrid: WorkingCell[][] = template.map((row, r) =>
    row.map((cell, c) => (cell === 0 ? ({ r, c, type: 'block' } as Cell) : null))
  );

  const entries: Entry[] = [];

  for (const p of placements) {
    const dir: Direction = p.direction;
    const row0 = p.row;
    const col0 = p.col;
    const id = makeId(dir, row0, col0);
    const answer = String(p.answer);

    const { dr, dc } = getEntryStep(dir, answerDirection);
    const wordCells: { r: number; c: number; letter: string }[] = [];
    let hasConflict = false;

    for (let i = 0; i < answer.length; i++) {
      const rr = row0 + dr * i;
      const cc = col0 + dc * i;
      if (rr < 0 || cc < 0 || rr >= size || cc >= size) {
        hasConflict = true;
        break;
      }

      const cell = workingGrid[rr][cc];
      if (cell && cell.type === 'block') {
        hasConflict = true;
        break;
      }
      if (cell && cell.type === 'letter' && cell.char !== answer[i]) {
        hasConflict = true;
        break;
      }

      wordCells.push({ r: rr, c: cc, letter: answer[i] });
    }

    if (hasConflict || wordCells.length !== answer.length) {
      return null;
    }

    for (const { r, c, letter } of wordCells) {
      const existing = workingGrid[r][c];
      if (existing && existing.type === 'letter') {
        existing.entries.add(id);
      } else {
        workingGrid[r][c] = {
          r,
          c,
          type: 'letter',
          char: letter,
          entries: new Set([id]),
        };
      }
    }

    entries.push({
      id,
      direction: dir,
      row: row0,
      col: col0,
      answer,
      clue: String(p.clue || ''),
      number: 0,
      isRepeatedLetter: p.isRepeatedLetter,
    });
  }

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (!workingGrid[r][c]) {
        workingGrid[r][c] = { r, c, type: 'block' };
      }
    }
  }

  const grid = workingGrid as Cell[][];

  const numbering = computeNumbering(grid, entries, answerDirection);
  for (const [key, number] of numbering.gridNumbers.entries()) {
    const [r, c] = key.split(',').map(Number);
    const cell = grid[r][c];
    if (cell.type === 'letter') cell.number = number;
  }
  for (const entry of entries) {
    entry.number = numbering.entryNumbers.get(entry.id) ?? 0;
  }

  entries.sort((a, b) =>
    a.direction === b.direction ? a.number - b.number : a.direction === 'across' ? -1 : 1
  );

  const validation = validatePuzzle(grid, entries, answerDirection);
  if (!validation.ok) return null;

  return { size, width: size, height: size, grid, entries, answerDirection };
}

export function generateCrossword(
  size: number,
  wordClues: WordClue[],
  answerDirection: 'rtl' | 'ltr' = 'ltr'
): Crossword {
  const clean = wordClues
    .map((wc) => ({
      answer: normalizeAnswer(wc.answer),
      clue: wc.clue.trim(),
      isRepeatedLetter: wc.isRepeatedLetter,
    }))
    .filter((wc) => wc.answer.length >= 2 && wc.answer.length <= size);

  const templates = getTemplates(size);
  const attempts = 400;
  let best: Crossword | null = null;
  let bestScore = -1;

  const optionSets = [
    { minIntersectionPct: size <= 7 ? 70 : size <= 9 ? 75 : 80 },
    { minIntersectionPct: size <= 7 ? 65 : size <= 9 ? 70 : 75 },
  ];

  let attemptsRun = 0;
  for (const template of templates.sort(() => Math.random() - 0.5)) {
    for (const opts of optionSets) {
      for (let i = 0; i < attempts; i++) {
        attemptsRun++;
        const shuffled = clean.slice().sort(() => Math.random() - 0.5);
        const placements = constructCrossword(size, shuffled, template, answerDirection, opts, 50);
        if (!placements.length) continue;

        const cw = buildCrosswordFromPlacements(size, template, placements, answerDirection);
        if (!cw) continue;

        const totalLetters = cw.entries.reduce((sum, e) => sum + e.answer.length, 0);
        const score = totalLetters + cw.entries.length * 2;

        if (score > bestScore) {
          bestScore = score;
          best = cw;
        }
      }
      if (best) break;
    }
    if (best) break;
  }

  if (!best) {
    if (typeof console !== 'undefined') {
      console.warn(`[crossword] generation failed size=${size} attempts=${attemptsRun} candidates=${clean.length}`);
    }
    return { size, width: size, height: size, grid: [], entries: [], answerDirection };
  }

  return best;
}

export { validatePuzzle };
