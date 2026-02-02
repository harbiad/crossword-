import type { Crossword, Cell, Entry, Direction } from './crossword';
import { constructCrossword } from './construct';
import { getTemplate } from './templates';

export type WordClue = { answer: string; clue: string };

function normalizeAnswer(a: string): string {
  return a
    .trim()
    .replace(/\s+/g, '')
    .replace(/[ـ\u064B-\u065F\u0670]/g, '') // remove Arabic tatweel + harakat
    .toUpperCase();
}

function makeId(dir: Direction, row: number, col: number) {
  return `${dir}:${row}:${col}`;
}

export function generateCrossword(size: number, wordClues: WordClue[]): Crossword {
  const clean = wordClues
    .map((wc) => ({ answer: normalizeAnswer(wc.answer), clue: wc.clue.trim() }))
    .filter((wc) => wc.answer.length >= 2 && wc.answer.length <= size);

  // Get ONE random template for this puzzle - ensures different grids each time
  const template = getTemplate(size);

  // Try multiple word arrangements with the SAME template
  const attempts = 30;
  let bestPlacements: ReturnType<typeof constructCrossword> = [];
  let bestScore = -1;

  for (let i = 0; i < attempts; i++) {
    const shuffled = clean.slice().sort(() => Math.random() - 0.5);
    const placed = constructCrossword(size, shuffled, template, 50);

    // Score: total letters placed + bonus for word count
    const totalLetters = placed.reduce((sum, p) => sum + p.answer.length, 0);
    const score = totalLetters + placed.length * 2;

    if (score > bestScore) {
      bestScore = score;
      bestPlacements = placed;
    }
  }

  const placements = bestPlacements;

  // Build grid from template (0 = block, 1 = white cell)
  const grid: Cell[][] = template.map((row, r) =>
    row.map((cell, c) => ({
      r,
      c,
      isBlock: cell === 0,
    } as Cell))
  );

  const entries: Entry[] = [];

  // Place words in grid
  // Note: p.answer is already display-ready (Arabic across words are pre-reversed in construct.ts)
  for (const p of placements) {
    const dir: Direction = p.direction;
    const row0 = p.row;
    const col0 = p.col;
    const id = makeId(dir, row0, col0);
    const answer = String(p.answer);

    for (let i = 0; i < answer.length; i++) {
      const rr = row0 + (dir === 'down' ? i : 0);
      const cc = col0 + (dir === 'across' ? i : 0);
      if (rr < 0 || cc < 0 || rr >= size || cc >= size) continue;
      grid[rr][cc].entryId = id;
      grid[rr][cc].solution = answer[i];
    }

    entries.push({
      id,
      direction: dir,
      row: row0,
      col: col0,
      answer,
      clue: String(p.clue || ''),
      number: 0,
    });
  }

  // Assign clue numbers
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

  // DO NOT convert unfilled cells to black - this can create single-letter entries
  // which violate crossword rules. The template defines black squares.
  // Unfilled white cells indicate incomplete slots (need more vocabulary).

  return { size, width: size, height: size, grid, entries };
}
