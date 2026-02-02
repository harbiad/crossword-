import type { Direction } from './crossword';
import type { WordClue } from './generateCrossword';
import { findSlots, type Slot } from './templates';

export type Placement = {
  answer: string;
  clue: string;
  row: number;
  col: number;
  direction: Direction;
};

type GridChar = string | null;

// Check if text contains Arabic characters
function isArabic(s: string): boolean {
  return /[\u0600-\u06FF]/.test(s);
}

// Get the display version of a word for a given direction
// Arabic across words are reversed so they display correctly RTL in the LTR grid
function getDisplayWord(word: string, direction: Direction): string {
  if (direction === 'across' && isArabic(word)) {
    return [...word].reverse().join('');
  }
  return word;
}

// Check if a word fits in a slot given current grid state
// Uses display-adjusted word (Arabic across words are reversed)
function wordFitsSlot(
  grid: GridChar[][],
  word: string,
  slot: Slot
): boolean {
  if (word.length !== slot.length) return false;

  // Use the display version of the word for this slot's direction
  const displayWord = getDisplayWord(word, slot.direction);

  for (let i = 0; i < displayWord.length; i++) {
    const r = slot.row + (slot.direction === 'down' ? i : 0);
    const c = slot.col + (slot.direction === 'across' ? i : 0);

    // Bounds check
    if (r < 0 || c < 0 || r >= grid.length || c >= grid[0].length) {
      return false;
    }

    const existing = grid[r][c];

    // Cannot place on black squares
    if (existing === '#') {
      return false;
    }

    // If cell has a letter, it must match exactly
    if (existing !== null && existing !== displayWord[i]) {
      return false;
    }
  }

  return true;
}

// Place a word in the grid using display-adjusted letters
// Returns false if placement would cause a conflict (should not happen if wordFitsSlot passed)
function placeWord(grid: GridChar[][], word: string, slot: Slot): boolean {
  const displayWord = getDisplayWord(word, slot.direction);

  // Verify no conflicts before placing
  for (let i = 0; i < displayWord.length; i++) {
    const r = slot.row + (slot.direction === 'down' ? i : 0);
    const c = slot.col + (slot.direction === 'across' ? i : 0);
    const existing = grid[r][c];
    if (existing !== null && existing !== '#' && existing !== displayWord[i]) {
      // Conflict detected - should not happen but prevents overwriting
      return false;
    }
  }

  // Now place the letters
  for (let i = 0; i < displayWord.length; i++) {
    const r = slot.row + (slot.direction === 'down' ? i : 0);
    const c = slot.col + (slot.direction === 'across' ? i : 0);
    grid[r][c] = displayWord[i];
  }

  return true;
}

// Count intersections (letters that overlap with existing grid)
// Uses display-adjusted word for accurate intersection counting
function countIntersections(grid: GridChar[][], word: string, slot: Slot): number {
  const displayWord = getDisplayWord(word, slot.direction);
  let count = 0;
  for (let i = 0; i < displayWord.length; i++) {
    const r = slot.row + (slot.direction === 'down' ? i : 0);
    const c = slot.col + (slot.direction === 'across' ? i : 0);
    if (grid[r]?.[c] === displayWord[i]) {
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
      // Try to place the word - skip if conflict detected
      const placed = placeWord(grid, bestWord.answer, slot);
      if (!placed) {
        continue; // Skip this word if placement failed
      }
      usedWords.add(bestWord.answer);
      filledSlots.add(slotKey);
      // Store the display-adjusted answer (Arabic across words are already reversed)
      const displayAnswer = getDisplayWord(bestWord.answer, slot.direction);
      placements.push({
        answer: displayAnswer,
        clue: bestWord.clue,
        row: slot.row,
        col: slot.col,
        direction: slot.direction,
      });
    }
  }

  // Final validation: verify all placements match the grid
  // This catches any bugs in the construction logic
  const validPlacements: Placement[] = [];
  for (const p of placements) {
    let isValid = true;
    for (let i = 0; i < p.answer.length; i++) {
      const r = p.row + (p.direction === 'down' ? i : 0);
      const c = p.col + (p.direction === 'across' ? i : 0);
      if (grid[r]?.[c] !== p.answer[i]) {
        isValid = false;
        break;
      }
    }
    if (isValid) {
      validPlacements.push(p);
    }
  }

  return validPlacements;
}
