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
  answer: string; // canonical spelling, no spaces
  isInverted: boolean;
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

// row/col stay at the normal reading-order slot anchor for stable numbering.
// Only the offset changes: index always refers to the canonical answer.
export function getEntryCellAt(
  entry: Pick<Entry, 'row' | 'col' | 'direction' | 'isInverted'> & { answer: { length: number } },
  index: number,
  answerDirection: 'rtl' | 'ltr'
): { r: number; c: number } {
  const dr = entry.direction === 'down' ? 1 : 0;
  const dc = entry.direction === 'across' ? (answerDirection === 'rtl' ? -1 : 1) : 0;
  const offset = entry.isInverted ? entry.answer.length - 1 - index : index;
  return { r: entry.row + dr * offset, c: entry.col + dc * offset };
}

export function getEntryCells(
  entry: Pick<Entry, 'row' | 'col' | 'direction' | 'isInverted'> & { answer: { length: number } },
  answerDirection: 'rtl' | 'ltr'
): { r: number; c: number }[] {
  const cells: { r: number; c: number }[] = [];
  for (let i = 0; i < entry.answer.length; i++) {
    cells.push(getEntryCellAt(entry, i, answerDirection));
  }
  return cells;
}

export function getAdjacentEntryCell(entry: Entry, r: number, c: number, delta: number, answerDirection: 'rtl' | 'ltr') {
  const cells = getEntryCells(entry, answerDirection);
  const index = cells.findIndex(cell => cell.r === r && cell.c === c);
  return index < 0 ? null : cells[index + delta] ?? null;
}

export function revealEntries(entries: Entry[], fill: Record<string, string>, answerDirection: 'rtl' | 'ltr') {
  const next = { ...fill };
  for (const entry of entries) {
    getEntryCells(entry, answerDirection).forEach(({ r, c }, i) => {
      next[`${r},${c}`] = entry.answer[i];
    });
  }
  return next;
}

export function checkEntry(entry: Entry, fill: Record<string, string>, answerDirection: 'rtl' | 'ltr') {
  return getEntryCells(entry, answerDirection).every(({ r, c }, i) => fill[`${r},${c}`] === entry.answer[i]);
}

export function displayClue(entry: Entry) {
  return entry.clue + (entry.isInverted ? ' (inverted)' : '');
}
