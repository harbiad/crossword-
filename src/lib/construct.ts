import type { Direction } from './crossword';
import type { WordClue } from './generateCrossword';
import { findSlots, type Slot } from './templates';

export type Placement = {
  answer: string;
  clue: string;
  row: number;
  col: number;
  direction: Direction;
  isRepeatedLetter?: boolean;
};

type GridChar = string | null | '#';

const BLOCK: GridChar = '#';

function getSlotStart(slot: Slot, answerDirection: 'rtl' | 'ltr'): { row: number; col: number } {
  if (slot.direction === 'across' && answerDirection === 'rtl') {
    return { row: slot.row, col: slot.col + slot.length - 1 };
  }
  return { row: slot.row, col: slot.col };
}

function getStep(direction: Direction, answerDirection: 'rtl' | 'ltr'): { dr: number; dc: number } {
  if (direction === 'down') return { dr: 1, dc: 0 };
  return { dr: 0, dc: answerDirection === 'rtl' ? -1 : 1 };
}

function getCellAt(slot: Slot, i: number, answerDirection: 'rtl' | 'ltr') {
  const { row, col } = getSlotStart(slot, answerDirection);
  const { dr, dc } = getStep(slot.direction, answerDirection);
  return { r: row + dr * i, c: col + dc * i };
}

function wordFitsSlot(grid: GridChar[][], word: string, slot: Slot, answerDirection: 'rtl' | 'ltr'): boolean {
  if (word.length !== slot.length) return false;

  for (let i = 0; i < word.length; i++) {
    const { r, c } = getCellAt(slot, i, answerDirection);
    if (r < 0 || c < 0 || r >= grid.length || c >= grid[0].length) return false;

    const existing = grid[r][c];
    if (existing === BLOCK) return false;
    if (existing !== null && existing !== word[i]) return false;
  }

  return true;
}

function countIntersections(grid: GridChar[][], word: string, slot: Slot, answerDirection: 'rtl' | 'ltr'): number {
  let count = 0;
  for (let i = 0; i < word.length; i++) {
    const { r, c } = getCellAt(slot, i, answerDirection);
    if (grid[r]?.[c] === word[i]) count++;
  }
  return count;
}

function placeWord(grid: GridChar[][], word: string, slot: Slot, answerDirection: 'rtl' | 'ltr'): boolean {
  for (let i = 0; i < word.length; i++) {
    const { r, c } = getCellAt(slot, i, answerDirection);
    const existing = grid[r][c];
    if (existing !== null && existing !== BLOCK && existing !== word[i]) return false;
  }

  for (let i = 0; i < word.length; i++) {
    const { r, c } = getCellAt(slot, i, answerDirection);
    grid[r][c] = word[i];
  }

  return true;
}

function slotCenterScore(slot: Slot, size: number): number {
  const centerR = size / 2;
  const centerC = size / 2;
  const wordCenterR = slot.row + (slot.direction === 'down' ? slot.length / 2 : 0);
  const wordCenterC = slot.col + (slot.direction === 'across' ? slot.length / 2 : 0);
  const distToCenter = Math.hypot(wordCenterR - centerR, wordCenterC - centerC);
  const maxDist = Math.sqrt(2) * size;
  return ((maxDist - distToCenter) / maxDist) * 20;
}

function isFullyConnected(grid: GridChar[][], size: number): boolean {
  const letterCells: { r: number; c: number }[] = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const cell = grid[r][c];
      if (cell !== null && cell !== BLOCK) letterCells.push({ r, c });
    }
  }

  if (letterCells.length === 0) return true;

  const visited = new Set<string>();
  const queue: { r: number; c: number }[] = [letterCells[0]];
  visited.add(`${letterCells[0].r},${letterCells[0].c}`);

  while (queue.length > 0) {
    const { r, c } = queue.shift()!;
    const neighbors = [
      { r: r - 1, c },
      { r: r + 1, c },
      { r, c: c - 1 },
      { r, c: c + 1 },
    ];

    for (const n of neighbors) {
      if (n.r < 0 || n.r >= size || n.c < 0 || n.c >= size) continue;
      const key = `${n.r},${n.c}`;
      if (visited.has(key)) continue;
      const cell = grid[n.r][n.c];
      if (cell !== null && cell !== BLOCK) {
        visited.add(key);
        queue.push(n);
      }
    }
  }

  return visited.size === letterCells.length;
}

function calculateIntersectionPercentage(placements: Placement[], answerDirection: 'rtl' | 'ltr'): number {
  if (placements.length <= 1) return 100;

  let entriesWithIntersection = 0;
  const nonFirstCount = placements.length - 1;

  for (let i = 1; i < placements.length; i++) {
    const p = placements[i];
    const pCells = new Set<string>();
    const dr = p.direction === 'down' ? 1 : 0;
    const dc = p.direction === 'across' ? (answerDirection === 'rtl' ? -1 : 1) : 0;

    for (let j = 0; j < p.answer.length; j++) {
      const r = p.row + dr * j;
      const c = p.col + dc * j;
      pCells.add(`${r},${c}`);
    }

    let hasIntersection = false;
    for (let k = 0; k < i; k++) {
      const prev = placements[k];
      const prevDr = prev.direction === 'down' ? 1 : 0;
      const prevDc = prev.direction === 'across' ? (answerDirection === 'rtl' ? -1 : 1) : 0;
      for (let j = 0; j < prev.answer.length; j++) {
        const r = prev.row + prevDr * j;
        const c = prev.col + prevDc * j;
        if (pCells.has(`${r},${c}`)) {
          hasIntersection = true;
          break;
        }
      }
      if (hasIntersection) break;
    }

    if (hasIntersection) entriesWithIntersection++;
  }

  return nonFirstCount > 0 ? (entriesWithIntersection / nonFirstCount) * 100 : 100;
}

function countTotalIntersections(placements: Placement[], answerDirection: 'rtl' | 'ltr'): number {
  const cellCounts = new Map<string, number>();
  for (const p of placements) {
    const dr = p.direction === 'down' ? 1 : 0;
    const dc = p.direction === 'across' ? (answerDirection === 'rtl' ? -1 : 1) : 0;
    for (let i = 0; i < p.answer.length; i++) {
      const r = p.row + dr * i;
      const c = p.col + dc * i;
      const key = `${r},${c}`;
      cellCounts.set(key, (cellCounts.get(key) ?? 0) + 1);
    }
  }
  let total = 0;
  for (const count of cellCounts.values()) {
    if (count > 1) total++;
  }
  return total;
}

export function validateBlockRuns(grid: GridChar[][], size: number): boolean {
  for (let r = 0; r < size; r++) {
    let consecutiveBlocks = 0;
    for (let c = 0; c < size; c++) {
      const cell = grid[r][c];
      if (cell === BLOCK || cell === null) {
        consecutiveBlocks++;
        if (consecutiveBlocks >= 3) return false;
      } else {
        consecutiveBlocks = 0;
      }
    }
  }

  for (let c = 0; c < size; c++) {
    let consecutiveBlocks = 0;
    for (let r = 0; r < size; r++) {
      const cell = grid[r][c];
      if (cell === BLOCK || cell === null) {
        consecutiveBlocks++;
        if (consecutiveBlocks >= 3) return false;
      } else {
        consecutiveBlocks = 0;
      }
    }
  }

  return true;
}

export function constructCrossword(
  size: number,
  wordClues: WordClue[],
  template: number[][],
  answerDirection: 'rtl' | 'ltr',
  _targetWords = 12
): Placement[] {
  const slots = findSlots(template);
  const grid: GridChar[][] = Array.from({ length: size }, () => Array(size).fill(null));

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (template[r][c] === 0) grid[r][c] = BLOCK;
    }
  }

  const placements: Placement[] = [];
  const usedWords = new Set<string>();
  const usedSlots = new Set<string>();

  const sortedWords = wordClues
    .slice()
    .sort((a, b) => {
      const diff = b.answer.length - a.answer.length;
      if (diff !== 0) return diff;
      return Math.random() - 0.5;
    });

  const tryPlaceWord = (wc: WordClue, requireIntersection: boolean): boolean => {
    let bestSlot: Slot | null = null;
    let bestScore = -1;

    for (const slot of slots) {
      if (slot.length !== wc.answer.length) continue;
      const slotKey = `${slot.row},${slot.col},${slot.direction}`;
      if (usedSlots.has(slotKey)) continue;
      if (!wordFitsSlot(grid, wc.answer, slot, answerDirection)) continue;

      const intersections = countIntersections(grid, wc.answer, slot, answerDirection);
      if (requireIntersection && intersections === 0) continue;

      const centerBonus = slotCenterScore(slot, size);
      const score = intersections * 100 + centerBonus + Math.random();

      if (score > bestScore) {
        bestScore = score;
        bestSlot = slot;
      }
    }

    if (!bestSlot) return false;
    const placed = placeWord(grid, wc.answer, bestSlot, answerDirection);
    if (!placed) return false;

    usedWords.add(wc.answer);
    usedSlots.add(`${bestSlot.row},${bestSlot.col},${bestSlot.direction}`);
    const start = getSlotStart(bestSlot, answerDirection);
    placements.push({
      answer: wc.answer,
      clue: wc.clue,
      row: start.row,
      col: start.col,
      direction: bestSlot.direction,
      isRepeatedLetter: wc.isRepeatedLetter,
    });
    return true;
  };

  // Place longest word first near center
  for (const wc of sortedWords) {
    if (tryPlaceWord(wc, false)) break;
  }

  // Place remaining words, requiring intersections
  for (const wc of sortedWords) {
    if (usedWords.has(wc.answer)) continue;
    tryPlaceWord(wc, true);
  }

  // Validate placements against grid to catch any mismatches
  const validPlacements: Placement[] = [];
  for (const p of placements) {
    let isValid = true;
    const dr = p.direction === 'down' ? 1 : 0;
    const dc = p.direction === 'across' ? (answerDirection === 'rtl' ? -1 : 1) : 0;
    for (let i = 0; i < p.answer.length; i++) {
      const r = p.row + dr * i;
      const c = p.col + dc * i;
      if (grid[r]?.[c] !== p.answer[i]) {
        isValid = false;
        break;
      }
    }
    if (isValid) validPlacements.push(p);
  }

  if (!isFullyConnected(grid, size)) return [];

  const intersectionPct = calculateIntersectionPercentage(validPlacements, answerDirection);
  if (intersectionPct < 80) return [];

  const totalIntersections = countTotalIntersections(validPlacements, answerDirection);
  const minIntersections = Math.max(3, Math.floor(validPlacements.length * 0.5));
  if (totalIntersections < minIntersections) return [];

  return validPlacements;
}
