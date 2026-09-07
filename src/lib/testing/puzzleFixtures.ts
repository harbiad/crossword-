import { vi } from 'vitest';
import type { Crossword } from '../crossword';
import { getEntryCells } from '../crossword';
import type { Placement } from '../construct';
import { buildCrosswordFromPlacements, generateCrossword, validatePuzzle } from '../generateCrossword';
import * as templates from '../templates';

export function withSeed<T>(seed: number, fn: () => T): T {
  const original = Math.random;
  let state = seed >>> 0;
  Math.random = () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
  try { return fn(); } finally { Math.random = original; }
}

export function fixtureFromRows(rows: string[], answerDirection: 'ltr' | 'rtl') {
  const template = rows.map(row => [...row].map(char => char === '#' ? 0 : 1));
  const placements: Placement[] = templates.findSlots(template).map((slot, index) => {
    const chars = Array.from({ length: slot.length }, (_, i) =>
      rows[slot.row + (slot.direction === 'down' ? i : 0)][slot.col + (slot.direction === 'across' ? i : 0)]);
    if (slot.direction === 'across' && answerDirection === 'rtl') chars.reverse();
    const isInverted = index % 2 === 0;
    if (isInverted) chars.reverse();
    return {
      answer: chars.join(''), clue: `Fixture ${index}`, direction: slot.direction, isInverted,
      row: slot.row, col: slot.direction === 'across' && answerDirection === 'rtl' ? slot.col + slot.length - 1 : slot.col,
    };
  });
  return { template, placements, wordClues: placements.map(p => ({ answer: p.answer, clue: p.clue, isRepeatedLetter: p.isRepeatedLetter })) };
}

export function makePuzzle(rows: string[], dir: 'ltr' | 'rtl' = 'ltr') {
  const fixture = fixtureFromRows(rows, dir);
  const puzzle = buildCrosswordFromPlacements(rows.length, fixture.template, fixture.placements, dir);
  if (!puzzle) throw new Error('Invalid baseline test fixture');
  return puzzle;
}

export function seededFixture(seed: number, size: number, dir: 'ltr' | 'rtl') {
  return withSeed(seed, () => {
    const template = seed % 2 ? templates.getNYTTemplate(size, dir === 'ltr' ? 3 : 2)
      : templates.getTemplate(size, dir === 'ltr' ? 3 : 2);
    const alphabet = dir === 'ltr' ? 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' : 'ابتثجحخدذرزسشصضطظعغفقكلمنهوي';
    for (let attempt = 0; attempt < 100; attempt++) {
      const rows = template.map(row => row.map(cell => cell ? alphabet[Math.floor(Math.random() * alphabet.length)] : '#').join(''));
      const fixture = fixtureFromRows(rows, dir);
      if (new Set(fixture.wordClues.map(w => w.answer)).size === fixture.wordClues.length) return fixture;
    }
    throw new Error(`Unable to create unique vocabulary: seed=${seed} size=${size} answerDirection=${dir}`);
  });
}

// Fix only template selection so the vocabulary is known to be satisfiable.
// The solver, normalization, grid construction and validation remain real.
export function generateFixture(seed: number, size: number, dir: 'ltr' | 'rtl', fixture = seededFixture(seed, size, dir)) {
  const spy = vi.spyOn(templates, 'getTemplates').mockReturnValue([fixture.template]);
  try {
    return withSeed(seed, () => generateCrossword(size, fixture.wordClues, dir));
  } finally {
    spy.mockRestore();
  }
}

export function diagnostic(seed: number, size: number, dir: 'ltr' | 'rtl', reason: string[], puzzle?: Crossword) {
  return JSON.stringify({ seed, gridSize: size, answerDirection: dir, reason,
    entries: puzzle?.entries.map(entry => ({ id: entry.id, answer: entry.answer, direction: entry.direction,
      isInverted: entry.isInverted, anchor: [entry.row, entry.col], coordinates: getEntryCells(entry, dir) })) ?? [],
  });
}

export function runGenerationCases(seeds: number[], sizes: number[]) {
  const report = { attempts: 0, generated: 0, generationFailures: [] as string[], invalidPuzzles: [] as string[] };
  for (const size of sizes) for (const dir of ['rtl', 'ltr'] as const) for (const seed of seeds) {
    report.attempts++;
    const puzzle = generateFixture(seed, size, dir);
    if (!puzzle.entries.length) {
      const failure = diagnostic(seed, size, dir, ['Generation returned an empty puzzle; no entry or coordinates available.'], puzzle);
      report.generationFailures.push(failure);
      console.error(failure);
    } else {
      report.generated++;
      const validation = validatePuzzle(puzzle.grid, puzzle.entries, dir);
      if (!validation.ok) {
        const failure = diagnostic(seed, size, dir, validation.errors, puzzle);
        report.invalidPuzzles.push(failure);
        console.error(failure);
      }
    }
  }
  return report;
}
