import type { Crossword } from './crossword';
import type { WordClue } from './generateCrossword';

// The generator owns bounded search. A failed call may get one fresh pool;
// never retry the multi-second solver repeatedly on the same candidates.
export async function generateWithRetry(
  fetchPool: () => Promise<WordClue[]>,
  generate: (pool: WordClue[]) => Crossword | Promise<Crossword>,
): Promise<Crossword | null> {
  for (let request = 0; request < 2; request++) {
    const pool = await fetchPool();
    if (pool.length < 6) continue;
    const puzzle = await generate(pool);
    if (puzzle.entries.length) return puzzle;
  }
  return null;
}
