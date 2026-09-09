import { getEntryCellAt, type Entry } from './crossword';
import type { Fill } from './navigation';

export function entrySelection(entry: Entry, answerDirection: 'ltr' | 'rtl') {
  return { entryId: entry.id, activeCell: getEntryCellAt(entry, 0, answerDirection) };
}

export function chooseGridEntry(
  entries: readonly Entry[], entryIds: ReadonlySet<string>, selectedEntryId: string | null, repeated: boolean,
): Entry | null {
  const across = entries.find(entry => entryIds.has(entry.id) && entry.direction === 'across');
  const down = entries.find(entry => entryIds.has(entry.id) && entry.direction === 'down');
  if (repeated && across && down) return selectedEntryId === across.id ? down : across;
  return across ?? down ?? null;
}

// Presentation only: the arrow follows the first two canonical answer cells.
export function getTypingStartIndicator(entry: Entry | null, answerDirection: 'ltr' | 'rtl', fill: Fill) {
  if (!entry || entry.answer.length < 2) return null;
  const start = getEntryCellAt(entry, 0, answerDirection);
  if (fill[`${start.r},${start.c}`]) return null;
  const next = getEntryCellAt(entry, 1, answerDirection);
  const arrow = next.r > start.r ? '↓' : next.r < start.r ? '↑' : next.c > start.c ? '→' : '←';
  return { ...start, arrow };
}
