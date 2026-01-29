export type Direction = 'across' | 'down';

export type Cell = {
  r: number;
  c: number;
  isBlock: boolean;
  solution?: string; // single char, uppercase English or Arabic letter
  entryId?: string;
  number?: number; // crossword clue number for starting squares
};

export type Entry = {
  id: string;
  direction: Direction;
  row: number;
  col: number;
  answer: string; // no spaces
  clue: string;
  number: number;
};

export type Crossword = {
  size: number; // deprecated, use grid dimensions
  width: number;
  height: number;
  grid: Cell[][];
  entries: Entry[];
};
