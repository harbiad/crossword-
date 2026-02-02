// Test file for construct.ts
// Run with: npx vitest run src/lib/construct.test.ts

import { describe, it, expect } from 'vitest';
import { constructCrossword } from './construct';
import type { WordClue } from './generateCrossword';

// Helper to check for conflicts in placements
function findConflicts(placements: ReturnType<typeof constructCrossword>, _size: number) {
  const grid: Map<string, { letter: string; word: string; direction: string }> = new Map();
  const conflicts: string[] = [];

  for (const p of placements) {
    for (let i = 0; i < p.answer.length; i++) {
      const r = p.row + (p.direction === 'down' ? i : 0);
      const c = p.col + (p.direction === 'across' ? i : 0);
      const key = `${r},${c}`;
      const letter = p.answer[i];

      const existing = grid.get(key);
      if (existing && existing.letter !== letter) {
        conflicts.push(
          `Conflict at (${r},${c}): "${existing.word}" (${existing.direction}) has '${existing.letter}', ` +
          `but "${p.answer}" (${p.direction}) wants '${letter}'`
        );
      }

      grid.set(key, { letter, word: p.answer, direction: p.direction });
    }
  }

  return conflicts;
}

describe('constructCrossword', () => {
  it('should not produce conflicting letters at intersections', () => {
    // Simple template for testing
    const template = [
      [1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1],
    ];

    // Arabic words that might conflict
    const wordClues: WordClue[] = [
      { answer: 'فرح', clue: 'JOY' },           // 3 letters
      { answer: 'حديقة', clue: 'GARDEN' },      // 5 letters
      { answer: 'بيت', clue: 'HOUSE' },         // 3 letters
      { answer: 'كتاب', clue: 'BOOK' },         // 4 letters
      { answer: 'قلم', clue: 'PEN' },           // 3 letters
      { answer: 'ماء', clue: 'WATER' },         // 3 letters
      { answer: 'سماء', clue: 'SKY' },          // 4 letters
      { answer: 'أرض', clue: 'EARTH' },         // 3 letters
    ];

    // Run multiple times to catch random issues
    for (let i = 0; i < 10; i++) {
      const placements = constructCrossword(5, wordClues, template);
      const conflicts = findConflicts(placements, 5);

      if (conflicts.length > 0) {
        console.log('Placements:', placements.map(p => ({
          answer: p.answer,
          direction: p.direction,
          row: p.row,
          col: p.col,
        })));
        console.log('Conflicts:', conflicts);
      }

      expect(conflicts).toHaveLength(0);
    }
  });

  it('should handle mixed across and down placements correctly', () => {
    // Template with a clear cross pattern
    const template = [
      [0, 0, 1, 0, 0],
      [0, 0, 1, 0, 0],
      [1, 1, 1, 1, 1],
      [0, 0, 1, 0, 0],
      [0, 0, 1, 0, 0],
    ];

    const wordClues: WordClue[] = [
      { answer: 'حبكم', clue: 'ACROSS5' },  // 4 letters - needs to fit across slot
      { answer: 'أحمد', clue: 'DOWN5' },    // 4 letters - but we need 5 for the down slot
      { answer: 'محمود', clue: 'DOWN5B' },  // 5 letters for down
    ];

    const placements = constructCrossword(5, wordClues, template);
    const conflicts = findConflicts(placements, 5);

    console.log('Cross pattern placements:', placements);

    expect(conflicts).toHaveLength(0);
  });

  it('should handle JOY and ZOO scenario (user reported bug)', () => {
    // 11x11 template similar to what user might have
    const template = [
      [1, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1],
      [1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0],
      [1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 1],
      [0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1],
      [1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1],
      [1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0],
      [1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1],
      [0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1],
      [1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 1],
      [1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0],
      [1, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1],
    ];

    // Arabic translations for JOY and ZOO and other words
    const wordClues: WordClue[] = [
      { answer: 'فرح', clue: 'JOY' },           // 3 letters - farah
      { answer: 'حديقةحيوان', clue: 'ZOO' },   // Long form - but let's use short
      { answer: 'حيوان', clue: 'ZOO' },         // 5 letters
      { answer: 'سلاح', clue: 'GUN' },          // 4 letters
      { answer: 'حرب', clue: 'WAR' },           // 3 letters
      { answer: 'جرة', clue: 'JAR' },           // 3 letters
      { answer: 'متعة', clue: 'FUN' },          // 4 letters
      { answer: 'سعر', clue: 'PRICE' },         // 3 letters
      { answer: 'صنبور', clue: 'TAP' },         // 5 letters
      { answer: 'ملح', clue: 'SALT' },          // 3 letters
      { answer: 'لحم', clue: 'MEAT' },          // 3 letters
      { answer: 'رأس', clue: 'HEAD' },          // 3 letters
      { answer: 'طفل', clue: 'KID' },           // 3 letters
      { answer: 'قدر', clue: 'POT' },           // 3 letters
      { answer: 'واسع', clue: 'WIDE' },         // 4 letters
      { answer: 'رمل', clue: 'SAND' },          // 3 letters
      { answer: 'سريع', clue: 'FAST' },         // 4 letters
      { answer: 'مفتاح', clue: 'KEY' },         // 5 letters
      { answer: 'مطر', clue: 'RAIN' },          // 3 letters
      { answer: 'كبير', clue: 'BIG' },          // 4 letters
      { answer: 'ساعة', clue: 'CLOCK' },        // 4 letters
    ];

    // Run multiple times with shuffled word order
    for (let i = 0; i < 20; i++) {
      const shuffled = [...wordClues].sort(() => Math.random() - 0.5);
      const placements = constructCrossword(11, shuffled, template);
      const conflicts = findConflicts(placements, 11);

      if (conflicts.length > 0) {
        console.log(`\nIteration ${i} - CONFLICT FOUND:`);
        console.log('Placements:', placements.map(p => ({
          answer: p.answer,
          direction: p.direction,
          row: p.row,
          col: p.col,
          clue: p.clue,
        })));
        console.log('Conflicts:', conflicts);
      }

      expect(conflicts).toHaveLength(0);
    }
  });
});
