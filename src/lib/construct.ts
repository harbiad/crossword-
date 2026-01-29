import type { Direction } from './crossword';
import type { WordClue } from './generateCrossword';

export type Placement = {
  answer: string;
  clue: string;
  row: number;
  col: number;
  direction: Direction;
};

type GridChar = string | null;

type Point = { r: number; c: number };

type Candidate = Placement & { score: number; overlaps: number; adjustedScore: number };

//
function inBounds(size: number, r: number, c: number) {
  return r >= 0 && c >= 0 && r < size && c < size;
}

function cellAt(grid: GridChar[][], r: number, c: number): GridChar {
  if (!inBounds(grid.length, r, c)) return null;
  return grid[r][c];
}

function setCell(grid: GridChar[][], r: number, c: number, ch: string) {
  grid[r][c] = ch;
}

function iterCells(p: Placement): Point[] {
  const pts: Point[] = [];
  for (let i = 0; i < p.answer.length; i++) {
    pts.push({
      r: p.row + (p.direction === 'down' ? i : 0),
      c: p.col + (p.direction === 'across' ? i : 0),
    });
  }
  return pts;
}

function canPlace(grid: GridChar[][], p: Placement): { ok: boolean; overlaps: number } {
  const size = grid.length;
  let overlaps = 0;

  // bounds
  for (const pt of iterCells(p)) {
    if (!inBounds(size, pt.r, pt.c)) return { ok: false, overlaps: 0 };
  }

  // check endpoints (classic crossword: before/after should be empty)
  const before = p.direction === 'across' ? { r: p.row, c: p.col - 1 } : { r: p.row - 1, c: p.col };
  const after = p.direction === 'across'
    ? { r: p.row, c: p.col + p.answer.length }
    : { r: p.row + p.answer.length, c: p.col };
  if (inBounds(size, before.r, before.c) && cellAt(grid, before.r, before.c)) return { ok: false, overlaps: 0 };
  if (inBounds(size, after.r, after.c) && cellAt(grid, after.r, after.c)) return { ok: false, overlaps: 0 };

  // check each letter
  for (let i = 0; i < p.answer.length; i++) {
    const r = p.row + (p.direction === 'down' ? i : 0);
    const c = p.col + (p.direction === 'across' ? i : 0);
    const ch = p.answer[i];
    const cur = cellAt(grid, r, c);
    if (cur && cur !== ch) return { ok: false, overlaps: 0 };
    if (cur === ch) overlaps++;

    // adjacency rule: if placing across, above/below should be empty unless it is a crossing.
    if (p.direction === 'across') {
      const up = cellAt(grid, r - 1, c);
      const down = cellAt(grid, r + 1, c);
      if (!cur) {
        if (up) return { ok: false, overlaps: 0 };
        if (down) return { ok: false, overlaps: 0 };
      }
    } else {
      const left = cellAt(grid, r, c - 1);
      const right = cellAt(grid, r, c + 1);
      if (!cur) {
        if (left) return { ok: false, overlaps: 0 };
        if (right) return { ok: false, overlaps: 0 };
      }
    }
  }

  return { ok: true, overlaps };
}

function boundingBox(grid: GridChar[][]) {
  const size = grid.length;
  let minR = size,
    minC = size,
    maxR = -1,
    maxC = -1;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c]) {
        minR = Math.min(minR, r);
        minC = Math.min(minC, c);
        maxR = Math.max(maxR, r);
        maxC = Math.max(maxC, c);
      }
    }
  }
  if (maxR === -1) return { minR: 0, minC: 0, maxR: 0, maxC: 0, w: 0, h: 0 };
  return { minR, minC, maxR, maxC, w: maxC - minC + 1, h: maxR - minR + 1 };
}

function scoreCandidate(grid: GridChar[][], p: Placement, overlaps: number): number {
  // Prefer more intersections and more compact bounding box.
  const size = grid.length;
  const tmp = grid.map((row) => row.slice());
  for (const pt of iterCells(p)) {
    const i = pt.r - p.row;
    const j = pt.c - p.col;
    const idx = p.direction === 'across' ? j : i;
    setCell(tmp, pt.r, pt.c, p.answer[idx]);
  }
  const bb = boundingBox(tmp);
  const area = bb.w * bb.h;
  const centerDist = Math.abs((bb.minR + bb.maxR) / 2 - (size - 1) / 2) + Math.abs((bb.minC + bb.maxC) / 2 - (size - 1) / 2);
  return overlaps * 1000 - area * 2 - centerDist * 5;
}

export function constructCrossword(size: number, wordClues: WordClue[], targetWords = 12): Placement[] {
  const grid: GridChar[][] = Array.from({ length: size }, () => Array.from({ length: size }, () => null));

  const words = wordClues
    .map((w) => ({ ...w, answer: w.answer }))
    .sort((a, b) => b.answer.length - a.answer.length);

  const placements: Placement[] = [];

  // Place the first word across, centered.
  const first = words[0];
  if (!first) return [];
  const startRow = Math.floor(size / 2);
  const startCol = Math.max(0, Math.floor((size - first.answer.length) / 2));
  const firstPlacement: Placement = { answer: first.answer, clue: first.clue, row: startRow, col: startCol, direction: 'across' };
  const okFirst = canPlace(grid, firstPlacement);
  if (!okFirst.ok) return [];
  for (let i = 0; i < first.answer.length; i++) setCell(grid, startRow, startCol + i, first.answer[i]);
  placements.push(firstPlacement);

  // Build map of existing letters positions
  const letterMap = new Map<string, Point[]>();
  function rebuildLetterMap() {
    letterMap.clear();
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const ch = grid[r][c];
        if (!ch) continue;
        const arr = letterMap.get(ch) ?? [];
        arr.push({ r, c });
        letterMap.set(ch, arr);
      }
    }
  }
  rebuildLetterMap();

  for (const w of words.slice(1)) {
    const candidates: Candidate[] = [];

    // Encourage balanced Across/Down so it feels like a real crossword.
    const curAcross = placements.filter(p => p.direction === 'across').length;
    const curDown = placements.length - curAcross;
    const totalAfter = placements.length + 1;
    const targetDown = Math.max(2, Math.floor(totalAfter * 0.35));
    const wantDown = curDown < targetDown;
    const wantAcross = curAcross < Math.max(2, Math.floor(totalAfter * 0.35));

    // For each letter in the word, try to intersect with existing grid letters
    for (let i = 0; i < w.answer.length; i++) {
      const ch = w.answer[i];
      const pts = letterMap.get(ch);
      if (!pts) continue;

      for (const pt of pts) {
        // Try placing across crossing a down letter
        const across: Placement = { answer: w.answer, clue: w.clue, direction: 'across', row: pt.r, col: pt.c - i };
        const ca = canPlace(grid, across);
        if (ca.ok) {
          const base = scoreCandidate(grid, across, ca.overlaps);
          const bonus = placements.length === 1 ? -5000 : (wantAcross ? 150 : 0); // after first word, prefer down for the second word
          candidates.push({ ...across, overlaps: ca.overlaps, score: base, adjustedScore: base + bonus });
        }

        // Try placing down crossing an across letter
        const down: Placement = { answer: w.answer, clue: w.clue, direction: 'down', row: pt.r - i, col: pt.c };
        const cd = canPlace(grid, down);
        if (cd.ok) {
          const base = scoreCandidate(grid, down, cd.overlaps);
          const bonus = placements.length === 1 ? 5000 : (wantDown ? 150 : 0);
          candidates.push({ ...down, overlaps: cd.overlaps, score: base, adjustedScore: base + bonus });
        }
      }
    }

    // Classic crossword: enforce connectivity.
    // If we can't place a word with at least one intersection, skip it.
    if (!candidates.length) {
      continue;
    }

    // Prefer intersecting placements (overlaps >= 1) and direction balance.
    candidates.sort((a, b) => (b.overlaps - a.overlaps) || (b.adjustedScore - a.adjustedScore));
    const best = candidates[0];
    if (!best || best.overlaps < 1) continue;

    // Apply
    for (let i = 0; i < best.answer.length; i++) {
      const r = best.row + (best.direction === 'down' ? i : 0);
      const c = best.col + (best.direction === 'across' ? i : 0);
      setCell(grid, r, c, best.answer[i]);
    }
    placements.push({ answer: best.answer, clue: best.clue, row: best.row, col: best.col, direction: best.direction });
    rebuildLetterMap();

    if (placements.length >= targetWords) break;
  }

  return placements;
}
