import type { Direction } from './crossword';
import type { WordClue } from './generateCrossword';
import { getTemplate, findSlots, type Slot } from './templates';

export type Placement = {
  answer: string;
  clue: string;
  row: number;
  col: number;
  direction: Direction;
};

type GridChar = string | null;

// Check if a word fits in a slot given current grid state
function wordFitsSlot(
  grid: GridChar[][],
  word: string,
  slot: Slot
): boolean {
  if (word.length !== slot.length) return false;

  for (let i = 0; i < word.length; i++) {
    const r = slot.row + (slot.direction === 'down' ? i : 0);
    const c = slot.col + (slot.direction === 'across' ? i : 0);
    const existing = grid[r]?.[c];

    // If cell has a letter, it must match
    if (existing && existing !== word[i]) {
      return false;
    }
  }

  return true;
}

// Place a word in the grid
function placeWord(grid: GridChar[][], word: string, slot: Slot) {
  for (let i = 0; i < word.length; i++) {
    const r = slot.row + (slot.direction === 'down' ? i : 0);
    const c = slot.col + (slot.direction === 'across' ? i : 0);
    grid[r][c] = word[i];
  }
}

// Count intersections (letters that overlap with existing grid)
function countIntersections(grid: GridChar[][], word: string, slot: Slot): number {
  let count = 0;
  for (let i = 0; i < word.length; i++) {
    const r = slot.row + (slot.direction === 'down' ? i : 0);
    const c = slot.col + (slot.direction === 'across' ? i : 0);
    if (grid[r]?.[c] === word[i]) {
      count++;
    }
  }
  return count;
}

export function constructCrossword(size: number, wordClues: WordClue[], template: number[][], _targetWords = 12): Placement[] {
  const slots = findSlots(template);
  const grid: GridChar[][] = Array.from({ length: size }, () => Array(size).fill(null));

  // Mark black squares (0 = black in template)
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (template[r][c] === 0) {
        grid[r][c] = '#'; // Black square marker
      }
    }
  }

  const placements: Placement[] = [];
  const usedWords = new Set<string>();
  const filledSlots = new Set<string>();

  // Group words by length for faster lookup
  const wordsByLength = new Map<number, WordClue[]>();
  for (const wc of wordClues) {
    const len = wc.answer.length;
    if (!wordsByLength.has(len)) {
      wordsByLength.set(len, []);
    }
    wordsByLength.get(len)!.push(wc);
  }

  // Sort slots: prioritize longer slots first (they have fewer word options)
  const sortedSlots = [...slots].sort((a, b) => b.length - a.length);

  // Try to fill each slot
  for (const slot of sortedSlots) {
    const slotKey = `${slot.row},${slot.col},${slot.direction}`;
    if (filledSlots.has(slotKey)) continue;

    const candidates = wordsByLength.get(slot.length) || [];

    // Find best word for this slot
    let bestWord: WordClue | null = null;
    let bestScore = -1;

    for (const wc of candidates) {
      if (usedWords.has(wc.answer)) continue;
      if (!wordFitsSlot(grid, wc.answer, slot)) continue;

      // Score: prefer words that create more intersections
      const intersections = countIntersections(grid, wc.answer, slot);
      const score = intersections * 10 + Math.random(); // Small random for variety

      if (score > bestScore) {
        bestScore = score;
        bestWord = wc;
      }
    }

    if (bestWord) {
      placeWord(grid, bestWord.answer, slot);
      usedWords.add(bestWord.answer);
      filledSlots.add(slotKey);
      placements.push({
        answer: bestWord.answer,
        clue: bestWord.clue,
        row: slot.row,
        col: slot.col,
        direction: slot.direction,
      });
    }
  }

  return placements;
}

// Export template info for grid generation
export { getTemplate };
