export type Direction = 'across' | 'down';

export type BlockCell = {
  r: number;
  c: number;
  type: 'block';
};

export type LetterCell = {
  r: number;
  c: number;
  type: 'letter';
  char: string; // single char, uppercase English or Arabic letter
  entries: Set<string>;
  number?: number; // crossword clue number for starting squares
};

export type Cell = BlockCell | LetterCell;

export type Entry = {
  id: string;
  direction: Direction;
  row: number;
  col: number;
  answer: string; // no spaces
  clue: string;
  number: number;
  isRepeatedLetter?: boolean;
};

export type Crossword = {
  size: number; // deprecated, use grid dimensions
  width: number;
  height: number;
  grid: Cell[][];
  entries: Entry[];
  answerDirection: 'rtl' | 'ltr';
};

export function isBlockCell(cell: Cell): cell is BlockCell {
  return cell.type === 'block';
}

export function isLetterCell(cell: Cell): cell is LetterCell {
  return cell.type === 'letter';
}

export function getEntryCellAt(
  entry: Entry,
  index: number,
  answerDirection: 'rtl' | 'ltr'
): { r: number; c: number } {
  const dr = entry.direction === 'down' ? 1 : 0;
  const dc = entry.direction === 'across' ? (answerDirection === 'rtl' ? -1 : 1) : 0;
  return { r: entry.row + dr * index, c: entry.col + dc * index };
}

export function getEntryCells(
  entry: Entry,
  answerDirection: 'rtl' | 'ltr'
): { r: number; c: number }[] {
  const cells: { r: number; c: number }[] = [];
  for (let i = 0; i < entry.answer.length; i++) {
    cells.push(getEntryCellAt(entry, i, answerDirection));
  }
  return cells;
}
