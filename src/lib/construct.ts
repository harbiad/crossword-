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

// Check if a word can be placed, return overlap count or -1 if invalid
function canPlace(grid: GridChar[][], size: number, word: string, row: number, col: number, dir: Direction): number {
  let overlaps = 0;
  const len = word.length;

  // Check bounds
  const endR = row + (dir === 'down' ? len - 1 : 0);
  const endC = col + (dir === 'across' ? len - 1 : 0);
  if (!inBounds(size, row, col) || !inBounds(size, endR, endC)) return -1;

  // Check cell before word start (must be empty or edge)
  const beforeR = row - (dir === 'down' ? 1 : 0);
  const beforeC = col - (dir === 'across' ? 1 : 0);
  if (inBounds(size, beforeR, beforeC) && cellAt(grid, beforeR, beforeC)) return -1;

  // Check cell after word end (must be empty or edge)
  const afterR = row + (dir === 'down' ? len : 0);
  const afterC = col + (dir === 'across' ? len : 0);
  if (inBounds(size, afterR, afterC) && cellAt(grid, afterR, afterC)) return -1;

  // Check each letter position
  for (let i = 0; i < len; i++) {
    const r = row + (dir === 'down' ? i : 0);
    const c = col + (dir === 'across' ? i : 0);
    const ch = word[i];
    const cur = cellAt(grid, r, c);

    if (cur) {
      // Cell occupied - must match our letter
      if (cur !== ch) return -1;
      overlaps++;
    } else {
      // Empty cell - check perpendicular neighbors
      // For across word: check above and below
      // For down word: check left and right
      if (dir === 'across') {
        const above = cellAt(grid, r - 1, c);
        const below = cellAt(grid, r + 1, c);
        if (above || below) return -1; // Would create invalid adjacency
      } else {
        const left = cellAt(grid, r, c - 1);
        const right = cellAt(grid, r, c + 1);
        if (left || right) return -1;
      }
    }
  }

  return overlaps;
}

// Place a word on the grid
function placeWord(grid: GridChar[][], word: string, row: number, col: number, dir: Direction) {
  for (let i = 0; i < word.length; i++) {
    const r = row + (dir === 'down' ? i : 0);
    const c = col + (dir === 'across' ? i : 0);
    setCell(grid, r, c, word[i]);
  }
}

// Find all valid placements for a word
function findPlacements(
  grid: GridChar[][],
  size: number,
  word: string,
  existingLetters: Map<string, Point[]>,
  needsIntersection: boolean
): Array<{ row: number; col: number; dir: Direction; overlaps: number }> {
  const results: Array<{ row: number; col: number; dir: Direction; overlaps: number }> = [];

  // Try to intersect with existing letters
  for (let i = 0; i < word.length; i++) {
    const ch = word[i];
    const positions = existingLetters.get(ch) || [];

    for (const pos of positions) {
      // Try across: letter i of word at position pos
      const acrossCol = pos.c - i;
      const acrossOverlaps = canPlace(grid, size, word, pos.r, acrossCol, 'across');
      if (acrossOverlaps > 0) {
        results.push({ row: pos.r, col: acrossCol, dir: 'across', overlaps: acrossOverlaps });
      }

      // Try down: letter i of word at position pos
      const downRow = pos.r - i;
      const downOverlaps = canPlace(grid, size, word, downRow, pos.c, 'down');
      if (downOverlaps > 0) {
        results.push({ row: downRow, col: pos.c, dir: 'down', overlaps: downOverlaps });
      }
    }
  }

  // If no intersection required (first word), try centered positions
  if (!needsIntersection && results.length === 0) {
    const centerR = Math.floor(size / 2);
    const centerC = Math.floor((size - word.length) / 2);
    const overlaps = canPlace(grid, size, word, centerR, centerC, 'across');
    if (overlaps >= 0) {
      results.push({ row: centerR, col: centerC, dir: 'across', overlaps: 0 });
    }
  }

  return results;
}

// Update letter position map
function updateLetterMap(map: Map<string, Point[]>, word: string, row: number, col: number, dir: Direction) {
  for (let i = 0; i < word.length; i++) {
    const r = row + (dir === 'down' ? i : 0);
    const c = col + (dir === 'across' ? i : 0);
    const ch = word[i];
    const arr = map.get(ch) || [];
    // Avoid duplicates
    if (!arr.some(p => p.r === r && p.c === c)) {
      arr.push({ r, c });
      map.set(ch, arr);
    }
  }
}

export function constructCrossword(size: number, wordClues: WordClue[], targetWords = 12): Placement[] {
  const grid: GridChar[][] = Array.from({ length: size }, () => Array.from({ length: size }, () => null));
  const placements: Placement[] = [];
  const letterMap = new Map<string, Point[]>();
  const usedWords = new Set<string>();

  // Sort words: prefer longer words first, they create more intersection opportunities
  const words = [...wordClues].sort((a, b) => b.answer.length - a.answer.length);

  // Track direction balance
  let acrossCount = 0;
  let downCount = 0;

  for (const wc of words) {
    if (usedWords.has(wc.answer)) continue;
    if (placements.length >= targetWords) break;

    const needsIntersection = placements.length > 0;
    const candidates = findPlacements(grid, size, wc.answer, letterMap, needsIntersection);

    if (candidates.length === 0) continue;

    // Score candidates: prefer more overlaps and balance directions
    const targetDownRatio = 0.4;
    const currentDownRatio = placements.length > 0 ? downCount / placements.length : 0.5;

    candidates.sort((a, b) => {
      // Primary: more overlaps = better connectivity
      if (b.overlaps !== a.overlaps) return b.overlaps - a.overlaps;

      // Secondary: balance directions
      const aBonus = (a.dir === 'down' && currentDownRatio < targetDownRatio) ? 100 :
                     (a.dir === 'across' && currentDownRatio > 1 - targetDownRatio) ? 100 : 0;
      const bBonus = (b.dir === 'down' && currentDownRatio < targetDownRatio) ? 100 :
                     (b.dir === 'across' && currentDownRatio > 1 - targetDownRatio) ? 100 : 0;

      return bBonus - aBonus;
    });

    const best = candidates[0];

    // Place the word
    placeWord(grid, wc.answer, best.row, best.col, best.dir);
    updateLetterMap(letterMap, wc.answer, best.row, best.col, best.dir);
    placements.push({
      answer: wc.answer,
      clue: wc.clue,
      row: best.row,
      col: best.col,
      direction: best.dir,
    });
    usedWords.add(wc.answer);

    if (best.dir === 'across') acrossCount++;
    else downCount++;
  }

  return placements;
}
