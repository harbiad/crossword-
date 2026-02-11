import type { Crossword, Cell, Entry, Direction } from './crossword';
import { constructCrossword, validateBlockRuns, type ConstructRejectReason } from './construct';
import { findSlots, getTemplates, getNYTTemplate } from './templates';

export type WordClue = { answer: string; clue: string; isRepeatedLetter?: boolean };

type WorkingCell = Cell | null;

type NumberingResult = {
  gridNumbers: Map<string, number>;
  entryNumbers: Map<string, number>;
};

export type GenerationStats = {
  attempts: number;
  templatesTried: number;
  strategy: 'slot_fill' | 'hybrid';
  rejectedByReason: Record<string, number>;
};

function normalizeAnswer(a: string): string {
  return a
    .trim()
    .replace(/\s+/g, '')
    .replace(/[ـ\u064B-\u065F\u0670]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .toUpperCase();
}

function getNow() {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now();
  }
  return Date.now();
}

function makeId(dir: Direction, row: number, col: number) {
  return `${dir}:${row}:${col}`;
}

function getEntryStep(direction: Direction, answerDirection: 'rtl' | 'ltr') {
  if (direction === 'down') return { dr: 1, dc: 0 };
  return { dr: 0, dc: answerDirection === 'rtl' ? -1 : 1 };
}

function computeNumbering(
  _grid: Cell[][],
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

  const buildEntryRunKey = (entry: Entry) => {
    const { dr, dc } = getEntryStep(entry.direction, answerDirection);
    const coords: string[] = [];
    for (let i = 0; i < entry.answer.length; i++) {
      const r = entry.row + dr * i;
      const c = entry.col + dc * i;
      coords.push(`${r},${c}`);
    }
    coords.sort();
    return `${entry.direction}:${coords.join('|')}`;
  };

  const entryRunKeys = new Set(entries.map(buildEntryRunKey));
  const seenRunKeys = new Set<string>();

  for (let r = 0; r < size; r++) {
    let c = 0;
    while (c < size) {
      if (grid[r][c].type !== 'letter') {
        c++;
        continue;
      }
      const start = c;
      while (c < size && grid[r][c].type === 'letter') c++;
      const len = c - start;
      if (len >= 2) {
        const coords: string[] = [];
        for (let x = start; x < c; x++) coords.push(`${r},${x}`);
        coords.sort();
        const key = `across:${coords.join('|')}`;
        seenRunKeys.add(key);
        if (!entryRunKeys.has(key)) {
          errors.push(`Across run without clue at row ${r}, cols ${start}-${c - 1}.`);
        }
      }
    }
  }

  for (let c = 0; c < size; c++) {
    let r = 0;
    while (r < size) {
      if (grid[r][c].type !== 'letter') {
        r++;
        continue;
      }
      const start = r;
      while (r < size && grid[r][c].type === 'letter') r++;
      const len = r - start;
      if (len >= 2) {
        const coords: string[] = [];
        for (let x = start; x < r; x++) coords.push(`${x},${c}`);
        coords.sort();
        const key = `down:${coords.join('|')}`;
        seenRunKeys.add(key);
        if (!entryRunKeys.has(key)) {
          errors.push(`Down run without clue at col ${c}, rows ${start}-${r - 1}.`);
        }
      }
    }
  }

  for (const key of entryRunKeys) {
    if (!seenRunKeys.has(key)) {
      errors.push(`Entry does not map to a visible run: ${key}.`);
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

type BuildResult = {
  crossword: Crossword | null;
  rejectReason?: string;
};

function buildCrosswordFromPlacements(
  size: number,
  template: number[][],
  placements: ReturnType<typeof constructCrossword>,
  answerDirection: 'rtl' | 'ltr',
  debug?: { enabled: boolean; log: (msg: string) => void }
): BuildResult {
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

    for (let i = 0; i < answer.length; i++) {
      const rr = row0 + dr * i;
      const cc = col0 + dc * i;
      if (rr < 0 || cc < 0 || rr >= size || cc >= size) {
        return { crossword: null, rejectReason: 'entry_out_of_bounds' };
      }

      const cell = workingGrid[rr][cc];
      if (cell && cell.type === 'block') {
        return { crossword: null, rejectReason: 'entry_hits_block' };
      }
      if (cell && cell.type === 'letter' && cell.char !== answer[i]) {
        return { crossword: null, rejectReason: 'letter_conflict' };
      }

      wordCells.push({ r: rr, c: cc, letter: answer[i] });
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

  let emptyCount = 0;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (!workingGrid[r][c]) emptyCount++;
    }
  }
  if (emptyCount > 0) {
    if (debug?.enabled) debug.log(`unfilled white cells: ${emptyCount}`);
    return { crossword: null, rejectReason: 'unfilled_white_cells' };
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
  if (!validation.ok) {
    if (debug?.enabled) {
      debug.log(`validation failed: ${validation.errors.slice(0, 4).join(' | ')}`);
    }
    return { crossword: null, rejectReason: 'validation_failed' };
  }

  return { crossword: { size, width: size, height: size, grid, entries, answerDirection } };
}

function incrementCounter(map: Record<string, number>, key: string) {
  map[key] = (map[key] ?? 0) + 1;
}

function isDebugEnabled() {
  if (typeof window !== 'undefined' && (window as any).__CW_DEBUG) return true;
  if ((globalThis as any).__CW_DEBUG) return true;
  return false;
}

function isTemplateViable(
  template: number[][],
  buckets: Map<number, WordClue[]>,
  maxShortReuse: number
): boolean {
  const slots = findSlots(template);
  const requiredByLen = new Map<number, number>();
  for (const slot of slots) {
    requiredByLen.set(slot.length, (requiredByLen.get(slot.length) ?? 0) + 1);
  }

  for (const [len, required] of requiredByLen.entries()) {
    const available = buckets.get(len)?.length ?? 0;
    if (available === 0) return false;
    if (len <= 3) {
      const neededDistinct = Math.ceil(required / maxShortReuse);
      if (available < neededDistinct) return false;
    } else if (available < required) {
      return false;
    }
  }

  return true;
}

function getUsefulLengthCap(size: number, slotCount: number, len: number): number {
  const demandWeight = len <= 3 ? 7 : len <= Math.ceil(size * 0.55) ? 10 : 8;
  const dynamic = slotCount * demandWeight;
  const base = size <= 7 ? 120 : size <= 9 ? 300 : size <= 11 ? 460 : 560;
  return Math.max(base, dynamic);
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

  const buckets = new Map<number, WordClue[]>();
  for (const wc of clean) {
    const len = wc.answer.length;
    const bucket = buckets.get(len) ?? [];
    bucket.push(wc);
    buckets.set(len, bucket);
  }

  for (const bucket of buckets.values()) {
    bucket.sort((a, b) => {
      if (a.answer !== b.answer) return a.answer.localeCompare(b.answer);
      return a.clue.localeCompare(b.clue);
    });
  }

  const strategy: 'slot_fill' | 'hybrid' = size <= 9 ? 'slot_fill' : 'hybrid';
  const maxShortReuse = size <= 9 ? 4 : 3;
  const attemptsBudget = size <= 7 ? 14 : size <= 9 ? 22 : 18;
  const timeBudgetMs = size <= 7 ? 3500 : size <= 9 ? 9000 : 11000;

  const rejectedByReason: Record<string, number> = {};
  const recordConstructReject = (reason: ConstructRejectReason) => incrementCounter(rejectedByReason, reason);

  const templates = [
    ...getTemplates(size),
    ...Array.from({ length: 10 }, () => getNYTTemplate(size)),
    ...Array.from({ length: 8 }, () => getTemplates(size)[0]),
  ];
  const viableTemplates = templates
    .map((template) => {
      if (!isTemplateViable(template, buckets, maxShortReuse)) return null;
      const slots = findSlots(template);
      const maxSlots = size <= 7 ? 28 : size <= 9 ? 44 : size <= 11 ? 56 : 72;
      if (slots.length > maxSlots) return null;
      const byLen = new Map<number, number>();
      for (const slot of slots) byLen.set(slot.length, (byLen.get(slot.length) ?? 0) + 1);
      let score = 0;
      for (const [len, count] of byLen.entries()) {
        const pool = buckets.get(len)?.length ?? 0;
        score += Math.min(pool, count * 16);
      }
      score -= slots.length * 12;
      return { template, score };
    })
    .filter((item): item is { template: number[][]; score: number } => Boolean(item))
    .sort((a, b) => b.score - a.score)
    .map((x) => x.template);

  if (!viableTemplates.length) {
    incrementCounter(rejectedByReason, 'template_precheck_failed');
    return {
      size,
      width: size,
      height: size,
      grid: [],
      entries: [],
      answerDirection,
      generationStats: {
        attempts: 0,
        templatesTried: 0,
        strategy,
        rejectedByReason,
      },
    };
  }

  const debugEnabled = isDebugEnabled();
  const deadline = getNow() + timeBudgetMs;
  let attempts = 0;

  for (const template of viableTemplates) {
    if (getNow() > deadline || attempts >= attemptsBudget) break;

    const slots = findSlots(template);
    const slotCountByLen = new Map<number, number>();
    for (const slot of slots) slotCountByLen.set(slot.length, (slotCountByLen.get(slot.length) ?? 0) + 1);

    const attemptWords: WordClue[] = [];
    for (const [len, count] of slotCountByLen.entries()) {
      const bucket = buckets.get(len);
      if (!bucket || !bucket.length) continue;
      const cap = Math.min(bucket.length, getUsefulLengthCap(size, count, len));
      attemptWords.push(...bucket.slice(0, cap));
    }

    attempts++;
    if (debugEnabled) {
      console.log(`[cw-gen size=${size}] attempt=${attempts} strategy=${strategy} words=${attemptWords.length} templateSlots=${slots.length}`);
    }

    const placements = constructCrossword(
      size,
      attemptWords,
      template,
      answerDirection,
      {
        strategy,
        seedPlacements: strategy === 'hybrid' ? 2 : 1,
        maxCandidatesPerSlot: size <= 7 ? 150 : size <= 9 ? 220 : 180,
        maxShortReuse,
        timeBudgetMs: size <= 7 ? 1200 : size <= 9 ? 2200 : 2600,
        onReject: recordConstructReject,
        debug: debugEnabled
          ? {
              enabled: true,
              log: (msg: string) => {
                console.log(`[cw-gen size=${size}] ${msg}`);
              },
            }
          : undefined,
      }
    );

    if (!placements.length) {
      incrementCounter(rejectedByReason, 'no_placements');
      continue;
    }

    const built = buildCrosswordFromPlacements(
      size,
      template,
      placements,
      answerDirection,
      debugEnabled
        ? {
            enabled: true,
            log: (msg: string) => {
              console.log(`[cw-gen size=${size}] ${msg}`);
            },
          }
        : undefined
    );

    if (!built.crossword) {
      incrementCounter(rejectedByReason, built.rejectReason ?? 'build_failed');
      continue;
    }

    built.crossword.generationStats = {
      attempts,
      templatesTried: attempts,
      strategy,
      rejectedByReason,
    };

    return built.crossword;
  }

  if (typeof console !== 'undefined') {
    console.warn(
      `[crossword] generation failed size=${size} attempts=${attempts} candidates=${clean.length} strategy=${strategy}`
    );
  }

  return {
    size,
    width: size,
    height: size,
    grid: [],
    entries: [],
    answerDirection,
    generationStats: {
      attempts,
      templatesTried: attempts,
      strategy,
      rejectedByReason,
    },
  };
}

export { validatePuzzle };
