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

// (reserved for future language-specific rules)

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
  const attempts = 6;
  let best = [] as ReturnType<typeof constructCrossword>;
  for (let i = 0; i < attempts; i++) {
    const shuffled = clean
      .map((x) => x)
      .sort(() => Math.random() - 0.5);
    const placed = constructCrossword(size, shuffled, Math.max(10, Math.min(18, size + 8)));
    if (placed.length > best.length) best = placed;
    if (best.length >= Math.min(14, size + 6)) break;
  }
  const placements = best;

  const entries: Entry[] = [];

  for (const p of placements) {
    const dir: Direction = p.direction;
    const row0 = p.row;
    const col0 = p.col;
    const id = makeId(dir, row0, col0);

    const ans = String(p.answer);
    for (let i = 0; i < ans.length; i++) {
      const rr = row0 + (dir === 'down' ? i : 0);
      const cc = col0 + (dir === 'across' ? i : 0);
      if (rr < 0 || cc < 0 || rr >= size || cc >= size) continue;
      grid[rr][cc].entryId = id;
      grid[rr][cc].isBlock = false;
      grid[rr][cc].solution = ans[i];
    }

    entries.push({
      id,
      direction: dir,
      row: row0,
      col: col0,
      answer: ans,
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

  return { size, grid, entries };
}
