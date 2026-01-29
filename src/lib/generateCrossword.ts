import type { Crossword, Cell, Entry, Direction } from './crossword';
import { constructCrossword } from './construct';

export type WordClue = { answer: string; clue: string };

function normalizeAnswer(a: string): string {
  return a
    .trim()
    .replace(/\s+/g, '')
    .replace(/[ـ\u064B-\u065F\u0670]/g, '') // remove Arabic tatweel + harakat
    .toUpperCase();
}

function isArabic(s: string): boolean {
  return /[\u0600-\u06FF]/.test(s);
}

// Reverse Arabic "across" answers so they display correctly RTL in the grid
function adjustForRtl(answer: string, direction: Direction): string {
  if (direction === 'across' && isArabic(answer)) {
    return [...answer].reverse().join('');
  }
  return answer;
}

function makeId(dir: Direction, row: number, col: number) {
  return `${dir}:${row}:${col}`;
}

export function generateCrossword(size: number, wordClues: WordClue[]): Crossword {
  const clean = wordClues
    .map((wc) => ({ answer: normalizeAnswer(wc.answer), clue: wc.clue.trim() }))
    .filter((wc) => wc.answer.length >= 2 && wc.answer.length <= size);

  // Build initial empty grid
  const grid: Cell[][] = Array.from({ length: size }, (_, r) =>
    Array.from({ length: size }, (_, c) => ({ r, c, isBlock: true } as Cell)),
  );

  // Construct placements directly (so we have coordinates and true blocks).
  // Retry a few times with different shuffles and keep the best (most words placed).
  const minTotalBySize: Record<number, number> = { 7: 10, 9: 14, 11: 18, 13: 22 };
  const minTotal = minTotalBySize[size] ?? 10;
  const minDown = Math.max(3, Math.floor(minTotal * 0.35));

  const attempts = 10;
  let best = [] as ReturnType<typeof constructCrossword>;
  let bestScore = -1;

  for (let i = 0; i < attempts; i++) {
    const shuffled = clean.slice().sort(() => Math.random() - 0.5);
    const placed = constructCrossword(size, shuffled, Math.max(minTotal, Math.min(26, size + 12)));

    const downCount = placed.filter((p) => p.direction === 'down').length;
    const score = placed.length * 10 + downCount * 3;

    // Prefer solutions that meet thresholds; otherwise keep the best we can.
    const meets = placed.length >= minTotal && downCount >= minDown;
    const bestMeets = best.length >= minTotal && best.filter((p) => p.direction === 'down').length >= minDown;

    if ((meets && !bestMeets) || score > bestScore) {
      best = placed;
      bestScore = score;
    }

    if (meets) break;
  }

  const placements = best;

  const entries: Entry[] = [];

  for (const p of placements) {
    const dir: Direction = p.direction;
    const row0 = p.row;
    const col0 = p.col;
    const id = makeId(dir, row0, col0);

    const originalAns = String(p.answer);
    const displayAns = adjustForRtl(originalAns, dir); // Reverse Arabic "across" for correct RTL display

    for (let i = 0; i < displayAns.length; i++) {
      const rr = row0 + (dir === 'down' ? i : 0);
      const cc = col0 + (dir === 'across' ? i : 0);
      if (rr < 0 || cc < 0 || rr >= size || cc >= size) continue;
      grid[rr][cc].entryId = id;
      grid[rr][cc].isBlock = false;
      grid[rr][cc].solution = displayAns[i];
    }

    entries.push({
      id,
      direction: dir,
      row: row0,
      col: col0,
      answer: displayAns, // Store reversed for grid display
      clue: String(p.clue || ''),
      number: 0,
    });
  }

  // Assign clue numbers based on entry start positions (robust even if grid/block semantics vary).
  // Classic rule: starting squares are numbered in row-major order.
  const startPositions = new Map<string, { r: number; c: number }>();
  for (const e of entries) {
    startPositions.set(`${e.row},${e.col}`, { r: e.row, c: e.col });
  }

  const starts = Array.from(startPositions.values()).sort((a, b) => (a.r === b.r ? a.c - b.c : a.r - b.r));
  const startMap = new Map<string, number>();
  let counter = 1;
  for (const s of starts) {
    startMap.set(`${s.r},${s.c}`, counter);
    grid[s.r][s.c].number = counter;
    counter++;
  }

  for (const e of entries) {
    e.number = startMap.get(`${e.row},${e.col}`) ?? 0;
  }

  // Sort entries: across then down, by number
  entries.sort((a, b) => (a.direction === b.direction ? a.number - b.number : a.direction === 'across' ? -1 : 1));

  // Trim grid to bounding box of actual content (remove excess blocks)
  let minR = size, minC = size, maxR = -1, maxC = -1;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (!grid[r][c].isBlock) {
        minR = Math.min(minR, r);
        minC = Math.min(minC, c);
        maxR = Math.max(maxR, r);
        maxC = Math.max(maxC, c);
      }
    }
  }

  if (maxR === -1) {
    // No content placed
    return { size: 0, width: 0, height: 0, grid: [], entries: [] };
  }

  // Create trimmed grid
  const trimmedHeight = maxR - minR + 1;
  const trimmedWidth = maxC - minC + 1;
  const trimmedSize = Math.max(trimmedHeight, trimmedWidth);

  const trimmedGrid: Cell[][] = [];
  for (let r = 0; r < trimmedHeight; r++) {
    const row: Cell[] = [];
    for (let c = 0; c < trimmedWidth; c++) {
      const oldCell = grid[r + minR][c + minC];
      row.push({
        r,
        c,
        isBlock: oldCell.isBlock,
        solution: oldCell.solution,
        entryId: oldCell.entryId,
        number: oldCell.number,
      });
    }
    trimmedGrid.push(row);
  }

  // Adjust entry coordinates
  for (const e of entries) {
    e.row -= minR;
    e.col -= minC;
    e.id = makeId(e.direction, e.row, e.col);
  }

  // Update entryIds in trimmed grid cells
  for (let r = 0; r < trimmedHeight; r++) {
    for (let c = 0; c < trimmedWidth; c++) {
      const cell = trimmedGrid[r][c];
      if (cell.entryId) {
        // Find the entry this cell belongs to and update the ID
        for (const e of entries) {
          const inEntry = (e.direction === 'across' && cell.r === e.row && cell.c >= e.col && cell.c < e.col + e.answer.length) ||
                          (e.direction === 'down' && cell.c === e.col && cell.r >= e.row && cell.r < e.row + e.answer.length);
          if (inEntry) {
            cell.entryId = e.id;
            break;
          }
        }
      }
    }
  }

  return { size: trimmedSize, width: trimmedWidth, height: trimmedHeight, grid: trimmedGrid, entries };
}
