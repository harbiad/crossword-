import type { Crossword, Cell, Entry, Direction } from './crossword';
import { constructCrossword, getTemplate } from './construct';

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

  // Try multiple templates and word arrangements to find the best fill
  const attempts = 50;
  let bestTemplate: number[][] | null = null;
  let bestPlacements: ReturnType<typeof constructCrossword> = [];
  let bestScore = -1;

  for (let i = 0; i < attempts; i++) {
    // Get a fresh randomized template for each attempt
    const template = getTemplate(size);

    // Count total white cells in this template
    let totalWhiteCells = 0;
    for (const row of template) {
      for (const cell of row) {
        if (cell === 1) totalWhiteCells++;
      }
    }

    const shuffled = clean.slice().sort(() => Math.random() - 0.5);
    const placed = constructCrossword(size, shuffled, template, 50);

    // Score: total letters placed / total white cells (fill percentage)
    const totalLetters = placed.reduce((sum, p) => sum + p.answer.length, 0);
    // Bonus for number of words placed
    const score = totalLetters + placed.length * 2;

    if (score > bestScore) {
      bestScore = score;
      bestTemplate = template;
      bestPlacements = placed;
    }
  }

  // Use the best template and placements
  const template = bestTemplate || getTemplate(size);
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
  for (const p of placements) {
    const dir: Direction = p.direction;
    const row0 = p.row;
    const col0 = p.col;
    const id = makeId(dir, row0, col0);

    const originalAns = String(p.answer);
    const displayAns = adjustForRtl(originalAns, dir);

    for (let i = 0; i < displayAns.length; i++) {
      const rr = row0 + (dir === 'down' ? i : 0);
      const cc = col0 + (dir === 'across' ? i : 0);
      if (rr < 0 || cc < 0 || rr >= size || cc >= size) continue;
      grid[rr][cc].entryId = id;
      grid[rr][cc].solution = displayAns[i];
    }

    entries.push({
      id,
      direction: dir,
      row: row0,
      col: col0,
      answer: displayAns,
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

  // DO NOT convert unfilled cells to black - the template already has
  // proper black square placement with max 2 adjacent blacks.
  // Unfilled white cells will remain white (user can see they're part of a word slot)

  return { size, width: size, height: size, grid, entries };
}
