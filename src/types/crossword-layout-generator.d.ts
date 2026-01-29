declare module 'crossword-layout-generator' {
  export function generateLayout(words: Array<{ answer: string; clue: string }>): {
    table: Array<Array<string | null>>;
    result: Array<{
      answer: string;
      clue: string;
      startx: number;
      starty: number;
      orientation: 'across' | 'down';
    }>;
  };
}
