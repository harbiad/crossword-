import type { Crossword } from '../lib/crossword';
import type { WordClue } from '../lib/generateCrossword';

export type GenerationRequest = {
  type: 'generate';
  requestId: number;
  size: number;
  entries: WordClue[];
  answerDirection: 'rtl' | 'ltr';
};
export type GenerationResponse =
  | { type: 'result'; requestId: number; puzzle: Crossword }
  | { type: 'error'; requestId: number };
