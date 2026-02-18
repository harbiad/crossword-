// Test file for generateCrossword.ts
// Run with: npx vitest run src/lib/generateCrossword.test.ts

import { describe, it, expect } from 'vitest';
import { generateCrossword, validatePuzzle, type WordClue } from './generateCrossword';
import { getEntryCellAt } from './crossword';

// Helper to check for conflicts in the final grid
function findGridConflicts(cw: ReturnType<typeof generateCrossword>) {
  const cellMap = new Map<string, { letter: string; entry: string }>();
  const conflicts: string[] = [];

  for (const entry of cw.entries) {
    for (let i = 0; i < entry.answer.length; i++) {
      const { r, c } = getEntryCellAt(entry, i, cw.answerDirection);
      const key = `${r},${c}`;
      const letter = entry.answer[i];

      const existing = cellMap.get(key);
      if (existing && existing.letter !== letter) {
        conflicts.push(
          `Entry conflict at (${r},${c}): "${existing.entry}" has '${existing.letter}', ` +
          `but "${entry.answer}" (${entry.direction}) has '${letter}'`
        );
      }

      // Also check against the grid
      const gridCell = cw.grid[r]?.[c];
      if (gridCell && gridCell.type === 'letter' && gridCell.char !== letter) {
        conflicts.push(
          `Grid conflict at (${r},${c}): grid has '${gridCell.char}', ` +
          `but entry "${entry.answer}" (${entry.direction}) expects '${letter}'`
        );
      }

      cellMap.set(key, { letter, entry: entry.answer });
    }
  }

  return conflicts;
}

describe('generateCrossword', () => {
  it('should generate a crossword without letter conflicts', () => {
    const wordClues: WordClue[] = [
      { answer: 'فرح', clue: 'JOY' },
      { answer: 'حرب', clue: 'WAR' },
      { answer: 'سلام', clue: 'PEACE' },
      { answer: 'ماء', clue: 'WATER' },
      { answer: 'نار', clue: 'FIRE' },
      { answer: 'أرض', clue: 'EARTH' },
      { answer: 'سماء', clue: 'SKY' },
      { answer: 'بيت', clue: 'HOUSE' },
      { answer: 'كتاب', clue: 'BOOK' },
      { answer: 'قلم', clue: 'PEN' },
      { answer: 'شمس', clue: 'SUN' },
      { answer: 'قمر', clue: 'MOON' },
    ];

    // Run multiple times
    for (let i = 0; i < 10; i++) {
      const cw = generateCrossword(9, wordClues);
      const conflicts = findGridConflicts(cw);

      if (conflicts.length > 0) {
        console.log(`\nIteration ${i} - CONFLICT FOUND in generateCrossword:`);
        console.log('Entries:', cw.entries.map(e => ({
          answer: e.answer,
          direction: e.direction,
          row: e.row,
          col: e.col,
        })));
        console.log('Conflicts:', conflicts);
      }

      expect(conflicts).toHaveLength(0);
    }
  });

  it('should handle words with Alef variants correctly', () => {
    // Words with different Alef variants that should be normalized
    const wordClues: WordClue[] = [
      { answer: 'أمل', clue: 'HOPE' },      // أ - alef with hamza above
      { answer: 'إنسان', clue: 'HUMAN' },   // إ - alef with hamza below
      { answer: 'آخر', clue: 'OTHER' },     // آ - alef with madda
      { answer: 'امر', clue: 'MATTER' },    // ا - plain alef
      { answer: 'اسم', clue: 'NAME' },
      { answer: 'قال', clue: 'SAID' },
      { answer: 'كان', clue: 'WAS' },
      { answer: 'من', clue: 'FROM' },
    ];

    for (let i = 0; i < 5; i++) {
      const cw = generateCrossword(7, wordClues);
      const conflicts = findGridConflicts(cw);

      if (conflicts.length > 0) {
        console.log(`\nIteration ${i} - CONFLICT with Alef variants:`);
        console.log('Conflicts:', conflicts);
      }

      expect(conflicts).toHaveLength(0);
    }
  });

  it('should produce consistent grid and entries', () => {
    const wordClues: WordClue[] = [
      { answer: 'حديقة', clue: 'GARDEN' },
      { answer: 'سيارة', clue: 'CAR' },
      { answer: 'طاولة', clue: 'TABLE' },
      { answer: 'كرسي', clue: 'CHAIR' },
      { answer: 'باب', clue: 'DOOR' },
      { answer: 'نافذة', clue: 'WINDOW' },
    ];

    const cw = generateCrossword(9, wordClues);

    // Skip if no entries were generated
    if (cw.entries.length === 0) return;

    // Verify each entry's letters match the grid
    for (const entry of cw.entries) {
      for (let i = 0; i < entry.answer.length; i++) {
        const { r, c } = getEntryCellAt(entry, i, cw.answerDirection);
        const gridLetter = cw.grid[r][c].type === 'letter' ? cw.grid[r][c].char : '';
        const entryLetter = entry.answer[i];

        expect(gridLetter).toBe(entryLetter);
      }
    }
  });

  it('should fill empty cells with blocks (no empty cells)', () => {
    const wordClues: WordClue[] = [
      { answer: 'HELLO', clue: 'Greeting' },
      { answer: 'WORLD', clue: 'Earth' },
      { answer: 'TEST', clue: 'Exam' },
      { answer: 'CODE', clue: 'Program' },
      { answer: 'PLAY', clue: 'Fun' },
    ];

    const cw = generateCrossword(7, wordClues);

    // Skip if no entries (failed generation)
    if (cw.entries.length === 0) return;

    // Every cell should be either a block or a letter
    for (const row of cw.grid) {
      for (const cell of row) {
        expect(cell.type === 'block' || cell.type === 'letter').toBeTruthy();
      }
    }
  });

  it('should not have 3+ consecutive blocks in any row or column', () => {
    const wordClues: WordClue[] = [
      { answer: 'HELLO', clue: 'Greeting' },
      { answer: 'WORLD', clue: 'Earth' },
      { answer: 'TEST', clue: 'Exam' },
      { answer: 'CODE', clue: 'Program' },
    ];

    for (let attempt = 0; attempt < 5; attempt++) {
      const cw = generateCrossword(7, wordClues);

      // Skip if no entries (failed generation)
      if (cw.entries.length === 0) continue;

      const size = cw.size;

      // Check rows
      for (let r = 0; r < size; r++) {
        let consecutiveBlocks = 0;
        for (let c = 0; c < size; c++) {
          if (cw.grid[r][c].type === 'block') {
            consecutiveBlocks++;
            expect(consecutiveBlocks).toBeLessThan(3);
          } else {
            consecutiveBlocks = 0;
          }
        }
      }

      // Check columns
      for (let c = 0; c < size; c++) {
        let consecutiveBlocks = 0;
        for (let r = 0; r < size; r++) {
          if (cw.grid[r][c].type === 'block') {
            consecutiveBlocks++;
            expect(consecutiveBlocks).toBeLessThan(3);
          } else {
            consecutiveBlocks = 0;
          }
        }
      }
    }
  });

  it('should include answerDirection in the result', () => {
    const wordClues: WordClue[] = [
      { answer: 'TEST', clue: 'Exam' },
      { answer: 'CODE', clue: 'Program' },
    ];

    // Test LTR (default)
    const cwLtr = generateCrossword(7, wordClues);
    expect(cwLtr.answerDirection).toBe('ltr');

    // Test RTL
    const cwRtl = generateCrossword(7, wordClues, 'rtl');
    expect(cwRtl.answerDirection).toBe('rtl');
  });

  it('should preserve isRepeatedLetter flag', () => {
    const wordClues: WordClue[] = [
      { answer: 'TEST', clue: 'Exam' },
      { answer: 'EE', clue: 'E ×2', isRepeatedLetter: true },
    ];

    const cw = generateCrossword(5, wordClues);

    // Skip if no entries
    if (cw.entries.length === 0) return;

    // Check if repeated letter entries preserve the flag
    const repeatedEntry = cw.entries.find((e) => e.clue === 'E ×2');
    if (repeatedEntry) {
      expect(repeatedEntry.isRepeatedLetter).toBe(true);
    }
  });

  it('should place RTL across entry number at rightmost cell', () => {
    const wordClues: WordClue[] = [
      { answer: 'HELLO', clue: 'Greeting' },
      { answer: 'WORLD', clue: 'Earth' },
    ];

    // Generate with RTL direction
    const cw = generateCrossword(7, wordClues, 'rtl');

    // Skip if no entries
    if (cw.entries.length === 0) return;

    // For each across entry, verify the number is at the rightmost cell
    for (const entry of cw.entries) {
      if (entry.direction === 'across') {
        const numberCell = cw.grid[entry.row][entry.col];
        // The number should be at the start cell for RTL across (rightmost)
        expect(numberCell.type).toBe('letter');
        if (numberCell.type === 'letter') {
          expect(numberCell.number).toBe(entry.number);
        }
      }
    }
  });

  it('should assign RTL numbers in right-to-left order within each row', () => {
    const wordClues: WordClue[] = [
      { answer: 'ABC', clue: 'First' },
      { answer: 'DEF', clue: 'Second' },
      { answer: 'GHI', clue: 'Third' },
    ];

    const cw = generateCrossword(7, wordClues, 'rtl');

    // Skip if fewer than 2 entries
    if (cw.entries.length < 2) return;

    // Find entries in the same row
    const entriesByRow = new Map<number, typeof cw.entries>();
    for (const e of cw.entries) {
      const row = e.row;
      if (!entriesByRow.has(row)) {
        entriesByRow.set(row, []);
      }
      entriesByRow.get(row)!.push(e);
    }

    // For RTL, entries with higher column numbers should have lower clue numbers
    for (const [, rowEntries] of entriesByRow) {
      if (rowEntries.length < 2) continue;

      // Get visual start column for each entry
      const sortedByVisualCol = rowEntries
        .map((e) => ({
          entry: e,
          visualCol: e.col,
        }))
        .sort((a, b) => b.visualCol - a.visualCol); // Higher col first for RTL

      // Verify numbers are in ascending order (right-to-left visual order)
      for (let i = 0; i < sortedByVisualCol.length - 1; i++) {
        const current = sortedByVisualCol[i];
        const next = sortedByVisualCol[i + 1];
        // If they have different visual columns, current should have lower number
        if (current.visualCol !== next.visualCol) {
          expect(current.entry.number).toBeLessThanOrEqual(next.entry.number);
        }
      }
    }
  });

  it('should place LTR across entry number at leftmost cell', () => {
    const wordClues: WordClue[] = [
      { answer: 'HELLO', clue: 'Greeting' },
      { answer: 'WORLD', clue: 'Earth' },
    ];

    // Generate with LTR direction (default)
    const cw = generateCrossword(7, wordClues, 'ltr');

    // Skip if no entries
    if (cw.entries.length === 0) return;

    // For each across entry, verify the number is at the leftmost cell
    for (const entry of cw.entries) {
      if (entry.direction === 'across') {
        const numberCell = cw.grid[entry.row][entry.col];
        expect(numberCell.type).toBe('letter');
        if (numberCell.type === 'letter') {
          expect(numberCell.number).toBe(entry.number);
        }
      }
    }
  });

  it('should generate valid puzzles across random seeds', () => {
    const wordClues: WordClue[] = [
      { answer: 'HELLO', clue: 'Greeting' },
      { answer: 'WORLD', clue: 'Earth' },
      { answer: 'PLANT', clue: 'Green' },
      { answer: 'RIVER', clue: 'Stream' },
      { answer: 'STONE', clue: 'Rock' },
      { answer: 'HOUSE', clue: 'Home' },
      { answer: 'SOUND', clue: 'Noise' },
      { answer: 'LIGHT', clue: 'Bright' },
      { answer: 'MUSIC', clue: 'Tune' },
      { answer: 'CLOUD', clue: 'Sky' },
      { answer: 'TRAIN', clue: 'Rail' },
      { answer: 'BREAD', clue: 'Food' },
      { answer: 'SLEEP', clue: 'Rest' },
      { answer: 'WATER', clue: 'Liquid' },
      { answer: 'CHAIR', clue: 'Seat' },
      { answer: 'TABLE', clue: 'Desk' },
      { answer: 'PHONE', clue: 'Call' },
      { answer: 'CLOCK', clue: 'Time' },
      { answer: 'BRICK', clue: 'Block' },
      { answer: 'GRASS', clue: 'Lawn' },
    ];

    const withSeed = <T,>(seed: number, fn: () => T): T => {
      const original = Math.random;
      let s = seed >>> 0;
      Math.random = () => {
        s = (s * 1664525 + 1013904223) >>> 0;
        return s / 0x100000000;
      };
      try {
        return fn();
      } finally {
        Math.random = original;
      }
    };

    const runs = 200;
    for (let seed = 1; seed <= runs; seed++) {
      const dir = seed % 2 === 0 ? 'ltr' : 'rtl';
      const cw = withSeed(seed, () => generateCrossword(7, wordClues, dir));
      if (!cw.entries.length) {
        throw new Error(`No entries generated for seed ${seed} (${dir}).`);
      }
      const validation = validatePuzzle(cw.grid, cw.entries, cw.answerDirection);
      if (!validation.ok) {
        throw new Error(`Seed ${seed} (${dir}) failed: ${validation.errors.join(' | ')}`);
      }
    }
  });
});
