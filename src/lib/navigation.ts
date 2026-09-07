export type CellPosition = { r: number; c: number };
export type Fill = Record<string, string>;
type NavigationResult = { fill: Fill; activeCell: CellPosition };

const key = ({ r, c }: CellPosition) => `${r},${c}`;
const indexOf = (cells: readonly CellPosition[], current: CellPosition) =>
  cells.findIndex(cell => cell.r === current.r && cell.c === current.c);

// Cells must be in canonical answer order, as returned by getEntryCells.
export function enterCharacter(
  cells: readonly CellPosition[], current: CellPosition, fill: Fill, char: string,
): NavigationResult | null {
  const index = indexOf(cells, current);
  if (index < 0) return null;
  const nextFill = { ...fill, [key(current)]: char };
  const nextEmpty = char ? cells.slice(index + 1).find(cell => !nextFill[key(cell)]) : undefined;
  // A completed remainder stays on the edited cell; never wrap or leave the entry.
  return { fill: nextFill, activeCell: nextEmpty ?? current };
}

export function backspace(
  cells: readonly CellPosition[], current: CellPosition, fill: Fill,
): NavigationResult | null {
  const index = indexOf(cells, current);
  if (index < 0) return null;
  const target = fill[key(current)] ? current : cells[Math.max(0, index - 1)];
  return { fill: { ...fill, [key(target)]: '' }, activeCell: target };
}

const arrowOffsets = {
  ArrowLeft: { r: 0, c: -1 },
  ArrowRight: { r: 0, c: 1 },
  ArrowUp: { r: -1, c: 0 },
  ArrowDown: { r: 1, c: 0 },
} as const;

export type ArrowKey = keyof typeof arrowOffsets;
export function isArrowKey(key: string): key is ArrowKey {
  return Object.hasOwn(arrowOffsets, key);
}

export function getPhysicalArrowCell(
  cells: readonly CellPosition[], current: CellPosition, arrow: ArrowKey,
): CellPosition | null {
  if (indexOf(cells, current) < 0) return null;
  const offset = arrowOffsets[arrow];
  return cells.find(cell => cell.r === current.r + offset.r && cell.c === current.c + offset.c) ?? null;
}
