// Test file for generateCrossword.ts
// Run with: npx vitest run src/lib/generateCrossword.test.ts

import { describe, it, expect } from 'vitest';
import { generateCrossword, type WordClue } from './generateCrossword';

// Helper to check for conflicts in the final grid
function findGridConflicts(cw: ReturnType<typeof generateCrossword>) {
  const cellMap = new Map<string, { letter: string; entry: string }>();
  const conflicts: string[] = [];

  for (const entry of cw.entries) {
    for (let i = 0; i < entry.answer.length; i++) {
      const r = entry.row + (entry.direction === 'down' ? i : 0);
      const c = entry.col + (entry.direction === 'across' ? i : 0);
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
      if (gridCell && gridCell.solution && gridCell.solution !== letter) {
        conflicts.push(
          `Grid conflict at (${r},${c}): grid has '${gridCell.solution}', ` +
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

    // Verify each entry's letters match the grid
    for (const entry of cw.entries) {
      for (let i = 0; i < entry.answer.length; i++) {
        const r = entry.row + (entry.direction === 'down' ? i : 0);
        const c = entry.col + (entry.direction === 'across' ? i : 0);
        const gridLetter = cw.grid[r][c].solution;
        const entryLetter = entry.answer[i];

        expect(gridLetter).toBe(entryLetter);
      }
    }
  });
});
