import { generateLayout } from 'crossword-layout-generator';
import type { Crossword, Cell, Entry, Direction } from './crossword';

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

  // crossword-layout-generator uses words array with {answer, clue}
  const layout = generateLayout(clean);
  // layout has: table (2d), result (placements)

  // Build initial empty grid
  const grid: Cell[][] = Array.from({ length: size }, (_, r) =>
    Array.from({ length: size }, (_, c) => ({ r, c, isBlock: true } as Cell)),
  );

  // The library returns a minimal bounding box. We center it in our desired size.
  const table: (string | null)[][] = layout.table;
  const h = table.length;
  const w = table[0]?.length ?? 0;
  const offR = Math.max(0, Math.floor((size - h) / 2));
  const offC = Math.max(0, Math.floor((size - w) / 2));

  for (let r = 0; r < h; r++) {
    for (let c = 0; c < w; c++) {
      const chRaw = table[r][c];
      const ch = (chRaw ?? '').toString();
      const rr = r + offR;
      const cc = c + offC;
      if (rr < 0 || cc < 0 || rr >= size || cc >= size) continue;
      // Some generators use ' ' (space) for empty cells.
      if (ch.trim() !== '') {
        grid[rr][cc] = {
          r: rr,
          c: cc,
          isBlock: false,
          solution: ch,
        };
      }
    }
  }

  // Build entries list from placements
  const entries: Entry[] = [];

  // layout.result items have: answer, clue, startx/starty (1-indexed), orientation
  for (const p of layout.result as any[]) {
    const dir: Direction = p.orientation === 'across' ? 'across' : 'down';
    const row0 = (p.starty - 1) + offR;
    const col0 = (p.startx - 1) + offC;
    const id = makeId(dir, row0, col0);

    // mark cells with entryId (for selection)
    const ans = String(p.answer);
    for (let i = 0; i < ans.length; i++) {
      const rr = row0 + (dir === 'down' ? i : 0);
      const cc = col0 + (dir === 'across' ? i : 0);
      if (rr < 0 || cc < 0 || rr >= size || cc >= size) continue;
      grid[rr][cc].entryId = id;
      // ensure non-block
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
      number: 0, // fill later
    });
  }

  // Assign clue numbers based on starting cells
  // Classic rule: cell that begins an across or down word gets a number, numbers increase row-major.
  const startMap = new Map<string, number>();
  let counter = 1;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const cell = grid[r][c];
      if (cell.isBlock) continue;

      const leftIsBlock = c === 0 || grid[r][c - 1].isBlock;
      const upIsBlock = r === 0 || grid[r - 1][c].isBlock;

      const beginsAcross = leftIsBlock && c + 1 < size && !grid[r][c + 1].isBlock;
      const beginsDown = upIsBlock && r + 1 < size && !grid[r + 1][c].isBlock;

      if (beginsAcross || beginsDown) {
        startMap.set(`${r},${c}`, counter++);
      }
    }
  }

  for (const e of entries) {
    e.number = startMap.get(`${e.row},${e.col}`) ?? 0;
  }

  // Sort entries: across then down, by number
  entries.sort((a, b) => (a.direction === b.direction ? a.number - b.number : a.direction === 'across' ? -1 : 1));

  return { size, grid, entries };
}
