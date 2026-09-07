import { expect, it } from 'vitest';
import { runGenerationCases } from './testing/puzzleFixtures';

// npm run test:stress -- separate from ordinary npm test.
// Synthetic, satisfiable vocabularies measure structural correctness rather
// than the dictionary's ability to supply words for arbitrary templates.
it('stress: both answer languages, sizes 7/9/11/13, 25 seeds each', () => {
  const started = performance.now();
  const report = runGenerationCases(Array.from({ length: 25 }, (_, i) => i + 1), [7, 9, 11, 13]);
  console.info(JSON.stringify({ attempts: report.attempts, generated: report.generated,
    generationFailures: report.generationFailures.length, invalidPuzzles: report.invalidPuzzles.length,
    elapsedMs: Math.round(performance.now() - started) }));
  expect(report.generationFailures, 'Generation failures are counted separately from structural failures').toEqual([]);
  expect(report.invalidPuzzles).toEqual([]);
  expect(report.generated).toBe(200);
}, 120_000);
