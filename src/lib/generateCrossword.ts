import { getEntryCellAt } from './crossword';
import type { Crossword, Cell, Entry, Direction } from './crossword';
import { constructCrossword, validateBlockRuns } from './construct';
import { getTemplates } from './templates';
import { prepareCandidates, type CandidateWindow } from './preparedCandidates';
import { prepareTemplate } from './preparedTemplate';

export type WordClue = { answer: string; clue: string; isRepeatedLetter?: boolean };

type WorkingCell = Cell | null;

type NumberingResult = {
  gridNumbers: Map<string, number>;
  entryNumbers: Map<string, number>;
};

type GridRun = { direction: Direction; row: number; col: number; length: number };

function getNow() {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now();
  }
  return Date.now();
}

function makeId(dir: Direction, row: number, col: number) {
  return `${dir}:${row}:${col}`;
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

function getGridRuns(grid: Cell[][], answerDirection: 'rtl' | 'ltr'): GridRun[] {
  const size = grid.length;
  const runs: GridRun[] = [];

  for (let r = 0; r < size; r++) {
    let c = 0;
    while (c < size) {
      while (c < size && grid[r][c].type === 'block') c++;
      const start = c;
      while (c < size && grid[r][c].type === 'letter') c++;
      const end = c - 1;
      const len = end - start + 1;
      if (len >= 2) {
        const col = answerDirection === 'rtl' ? end : start;
        runs.push({ direction: 'across', row: r, col, length: len });
      }
    }
  }

  for (let c = 0; c < size; c++) {
    let r = 0;
    while (r < size) {
      while (r < size && grid[r][c].type === 'block') r++;
      const start = r;
      while (r < size && grid[r][c].type === 'letter') r++;
      const end = r - 1;
      const len = end - start + 1;
      if (len >= 2) {
        runs.push({ direction: 'down', row: start, col: c, length: len });
      }
    }
  }

  return runs;
}

function validatePuzzle(
  grid: Cell[][],
  entries: Entry[],
  answerDirection: 'rtl' | 'ltr'
): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  const size = grid.length;

  // Reject malformed grids before any traversal so validation reports errors,
  // rather than throwing or hanging while scanning incomplete rows.
  if (size === 0) errors.push('Grid is empty.');
  for (let r = 0; r < size; r++) {
    if (!Array.isArray(grid[r]) || grid[r].length !== size) {
      errors.push(`Row ${r} length mismatch.`);
      continue;
    }
    for (let c = 0; c < size; c++) {
      const cell = grid[r][c];
      if (!cell || (cell.type !== 'letter' && cell.type !== 'block')) {
        errors.push(`Empty or invalid cell at ${r},${c}.`);
      } else if (cell.type === 'letter' && !(cell.entries instanceof Set)) {
        errors.push(`Letter cell missing entries set at ${r},${c}.`);
      }
    }
  }
  if (errors.length) return { ok: false, errors };

  const entriesById = new Map<string, Entry>();
  for (const entry of entries) {
    if (entriesById.has(entry.id)) errors.push(`Duplicate entry id ${entry.id} at ${entry.row},${entry.col}.`);
    entriesById.set(entry.id, entry);
    if (!Number.isInteger(entry.row) || !Number.isInteger(entry.col)
      || !['across', 'down'].includes(entry.direction)
      || typeof entry.answer !== 'string' || entry.answer.length < 2
      || typeof entry.isInverted !== 'boolean') {
      errors.push(`Invalid entry ${entry.id} at ${entry.row},${entry.col}.`);
    }
  }
  if (errors.length) return { ok: false, errors };

  const letterPositions = new Set<string>();
  type Owner = { entry: Entry; node: number; char: string; index: number };
  const owners = new Map<string, Owner[]>();
  const graph = entries.map(() => new Set<number>());

  // Derive ownership from canonical answer coordinates, independently of the
  // cell's entry-id metadata. Check both directions of that relationship below.
  entries.forEach((entry, node) => {
    for (let i = 0; i < entry.answer.length; i++) {
      const { r, c } = getEntryCellAt(entry, i, answerDirection);
      if (r < 0 || c < 0 || r >= size || c >= size) {
        errors.push(`Entry ${entry.id} index ${i} out of bounds at ${r},${c}.`);
        continue;
      }
      const cell = grid[r][c];
      if (cell.type !== 'letter') {
        errors.push(`Entry ${entry.id} index ${i} hits non-letter at ${r},${c}.`);
        continue;
      }
      const key = `${r},${c}`;
      const list = owners.get(key) ?? [];
      list.push({ entry, node, char: entry.answer[i], index: i });
      owners.set(key, list);
      if (cell.char !== entry.answer[i]) {
        errors.push(`Entry ${entry.id} index ${i} mismatch at ${key}: ${cell.char} != ${entry.answer[i]}.`);
      }
      if (!cell.entries.has(entry.id)) {
        errors.push(`Entry ${entry.id} index ${i} missing in cell entries at ${key}.`);
      }
    }
  });

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const cell = grid[r][c];
      const key = `${r},${c}`;
      if (cell.r !== r || cell.c !== c) errors.push(`Cell coordinates mismatch at ${key}.`);
      if (cell.type === 'block') {
        if ('char' in cell || 'entries' in cell) errors.push(`Block contains letter data at ${key}.`);
        continue;
      }
      letterPositions.add(key);
      if (typeof cell.char !== 'string' || cell.char.length !== 1) errors.push(`Letter cell must contain one char at ${key}.`);
      if (cell.entries.size < 1 || cell.entries.size > 2) {
        errors.push(`Letter cell at ${key} must reference 1–2 entries; found ${cell.entries.size}.`);
      }
      const list = owners.get(key) ?? [];
      if (list.length < 1 || list.length > 2) {
        errors.push(`Letter cell at ${key} must be traversed by 1–2 entries; found ${list.length}.`);
      }
      for (const id of cell.entries) {
        if (!entriesById.has(id)) errors.push(`Unknown entry ${id} referenced at ${key}.`);
        else if (!list.some(owner => owner.entry.id === id)) errors.push(`Entry ${id} does not traverse referenced cell at ${key}.`);
      }
      for (let i = 0; i < list.length; i++) {
        for (let j = i + 1; j < list.length; j++) {
          const left = list[i];
          const right = list[j];
          if (left.entry.direction === right.entry.direction) {
            errors.push(`Same-direction ${left.entry.direction} overlap: entries ${left.entry.id} and ${right.entry.id} at ${key}.`);
          }
          if (left.char !== right.char) {
            errors.push(`Crossing mismatch at ${key}: entry ${left.entry.id}[${left.index}]=${left.char}, entry ${right.entry.id}[${right.index}]=${right.char}.`);
          }
          graph[left.node].add(right.node);
          graph[right.node].add(left.node);
        }
      }
    }
  }
  if (letterPositions.size === 0) errors.push('Grid has no letter cells.');

  if (entries.length > 1) {
    graph.forEach((neighbors, node) => {
      const entry = entries[node];
      if (neighbors.size === 0) errors.push(`Entry ${entry.id} at ${entry.row},${entry.col} has no crossing.`);
    });
    const visited = new Set<number>([0]);
    const queue = [0];
    for (let i = 0; i < queue.length; i++) {
      for (const neighbor of graph[queue[i]]) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push(neighbor);
        }
      }
    }
    if (visited.size !== entries.length) {
      const disconnected = entries.filter((_, i) => !visited.has(i));
      errors.push(`Entry intersection graph is disconnected: ${disconnected.map(e => `${e.id} at ${e.row},${e.col}`).join('; ')}.`);
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

  const gridRuns = getGridRuns(grid, answerDirection);
  const runKey = (direction: Direction, row: number, col: number, length: number) => `${direction}:${row}:${col}:${length}`;
  const entriesByRun = new Map<string, Entry[]>();
  for (const entry of entries) {
    const key = runKey(entry.direction, entry.row, entry.col, entry.answer.length);
    const list = entriesByRun.get(key) ?? [];
    list.push(entry);
    entriesByRun.set(key, list);
  }
  for (const run of gridRuns) {
    const matches = entriesByRun.get(runKey(run.direction, run.row, run.col, run.length)) ?? [];
    if (matches.length !== 1) {
      errors.push(`Grid run ${run.direction} at ${run.row},${run.col} length ${run.length} must have exactly one clue entry; found ${matches.length} (${matches.map(e => e.id).join(', ')}).`);
    }
  }
  for (const entry of entries) {
    const matches = gridRuns.filter(run => run.direction === entry.direction && run.row === entry.row
      && run.col === entry.col && run.length === entry.answer.length);
    if (matches.length !== 1) {
      errors.push(`Entry ${entry.id} at ${entry.row},${entry.col} length ${entry.answer.length} must match exactly one real grid run; found ${matches.length}.`);
    }
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
    const cell = grid[r]?.[c];
    if (!cell || cell.type !== 'letter') continue;
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

export function buildCrosswordFromPlacements(
  size: number,
  template: number[][],
  placements: ReturnType<typeof constructCrossword>,
  answerDirection: 'rtl' | 'ltr',
  debug?: { enabled: boolean; log: (msg: string) => void }
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

    const wordCells: { r: number; c: number; letter: string }[] = [];
    let hasConflict = false;

    for (let i = 0; i < answer.length; i++) {
      const { r: rr, c: cc } = getEntryCellAt(p, i, answerDirection);
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
      isInverted: p.isInverted,
      clue: String(p.clue || ''),
      number: 0,
      isRepeatedLetter: p.isRepeatedLetter,
    });
  }

  let emptyCount = 0;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (!workingGrid[r][c]) {
        emptyCount++;
      }
    }
  }
  if (emptyCount > 0) {
    if (debug?.enabled) {
      debug.log(`unfilled white cells: ${emptyCount}`);
    }
    return null;
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
    return null;
  }

  return { size, width: size, height: size, grid, entries, answerDirection };
}

export function generateCrossword(
  size: number,
  wordClues: WordClue[],
  answerDirection: 'rtl' | 'ltr' = 'ltr'
): Crossword {
  const prepared = prepareCandidates(wordClues, size);
  const clean = prepared.words;
  const buckets = prepared.byLength;

  // LTR mode needs more templates to find a solvable one (fewer 2-letter slots = tighter constraints)
  const templateCount = answerDirection === 'ltr' ? 24 : 6;
  const templates = getTemplates(size, answerDirection === 'ltr' ? 3 : 2, templateCount);
  const attempts = size <= 7 ? 18 : size <= 9 ? 22 : 20;
  // Halved after indexed 100%/75%/50% budget comparisons; see the solver benchmark report.
  const timeBudgetMs = answerDirection === 'ltr'
    ? (size <= 7 ? 3000 : size <= 9 ? 4000 : 4500)
    : (size <= 7 ? 1100 : size <= 9 ? 1700 : 1800);
  const deadline = getNow() + timeBudgetMs;

  let attemptsRun = 0;
  const templateScores = templates
    .map((template) => {
      const geometry = prepareTemplate(template, answerDirection);
      const lengths = geometry.lengths;
      let score = 0;
      let viable = true;
      for (const len of lengths) {
        const bucket = buckets.get(len);
        if (!bucket || bucket.words.length === 0) {
          viable = false;
          break;
        }
        score += bucket.words.length;
      }
      // Full-slot solutions have this exact existing puzzle score. Favor
      // denser templates now that indexing can solve previously slow layouts.
      const quality = geometry.slots.reduce((sum, slot) => sum + slot.length + 2, 0);
      return { template, geometry, score, viable, quality };
    })
    .filter((t) => t.viable)
    .sort((a, b) => b.quality - a.quality || b.score - a.score);

  const rankedTemplates = templateScores.length
    ? templateScores
    : templates.map((template) => ({ template, geometry: prepareTemplate(template, answerDirection), score: 0, viable: true }));

  // For LTR: give each template a per-template budget so we cycle through all of them
  // instead of getting stuck on the first unsolvable template until the global deadline.
  const perTemplateBudgetMs = answerDirection === 'ltr'
    ? Math.floor(timeBudgetMs / rankedTemplates.length)
    : timeBudgetMs; // RTL: keep original behavior (single template focus)

  const innerBudgetMs = answerDirection === 'ltr'
    ? (size <= 7 ? 125 : size <= 9 ? 200 : 350)
    : (size <= 7 ? 450 : size <= 9 ? 850 : 1000);

  for (const ranked of rankedTemplates) {
    const template = ranked.template;
    if (getNow() > deadline) break;
    const templateDeadline = answerDirection === 'ltr'
      ? Math.min(getNow() + perTemplateBudgetMs, deadline)
      : deadline;
    const slots = ranked.geometry.slots;
    const allowedLengths = ranked.geometry.lengths;
    const perLengthCap = size <= 7 ? 900 : size <= 9 ? 1300 : 1700;

    for (let i = 0; i < attempts; i++) {
      if (getNow() > templateDeadline) break;
      attemptsRun++;
      const candidateWindows = new Map<number, CandidateWindow>();
      for (const len of allowedLengths) {
        const bucket = buckets.get(len);
        if (!bucket || bucket.words.length === 0) continue;
        const cap = Math.min(bucket.words.length, perLengthCap);
        const offset = i === 0 && bucket.words.length <= cap ? 0 : (attemptsRun * 97 + len * 13) % bucket.words.length;
        candidateWindows.set(len, { offset, count: cap });
      }

      const debugEnabled = typeof window !== 'undefined' && (window as Window & { __CW_DEBUG?: boolean }).__CW_DEBUG;
      if (debugEnabled) {
        console.log(`[cw-gen size=${size}] attempt=${attemptsRun} words=${clean.length} templateSlots=${slots.length}`);
      }
      const remainingMs = templateDeadline - getNow();
      const placements = constructCrossword(
        size,
        clean,
        template,
        answerDirection,
        {
          preparedCandidates: prepared,
          preparedTemplate: ranked.geometry,
          candidateWindows,
          timeBudgetMs: Math.min(innerBudgetMs, Math.max(0, remainingMs)),
          useFillAllSlots: true,
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
      if (debugEnabled) {
        console.log(`[cw-gen size=${size}] attempt=${attemptsRun} placements=${placements.length}`);
      }
      if (!placements.length) {
        if (debugEnabled) {
          console.log(`[cw-gen size=${size}] attempt=${attemptsRun} no placements`);
        }
        continue;
      }

      const cw = buildCrosswordFromPlacements(
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
      if (!cw) continue;

      // Every slot is filled, so all valid solutions of this template have
      // the same word count/length score. Re-solving cannot improve density.
      return cw;
    }
    // For LTR: continue to next template even if templateDeadline exceeded (only stop at global deadline)
    // For RTL: stop on deadline (original behavior)
    if (answerDirection !== 'ltr' && getNow() > deadline) break;
  }

  if (typeof console !== 'undefined') {
    console.warn(`[crossword] generation failed size=${size} attempts=${attemptsRun} candidates=${clean.length}`);
  }
  return { size, width: size, height: size, grid: [], entries: [], answerDirection };
}

export { validatePuzzle };
