import { getEntryCellAt } from './crossword';
import { findSlots, type Slot } from './templates';

export type PreparedTemplate = {
  slots: Slot[];
  cells: Map<Slot, { r: number; c: number }[]>;
  neighbors: Map<Slot, Slot[]>;
  lengths: Set<number>;
};
const cache = new Map<string, PreparedTemplate>();

// Cache geometry, not random template selection. Include direction and actual
// layout, since templates of the same size need not contain the same slots.
export function prepareTemplate(template: number[][], answerDirection: 'rtl' | 'ltr'): PreparedTemplate {
  const key = `${template.length}:${answerDirection}:${template.map(row => row.join('')).join('/')}`;
  const cached = cache.get(key);
  if (cached) return cached;
  const slots = findSlots(template);
  const cells = new Map<Slot, { r: number; c: number }[]>();
  const owners = new Map<string, Slot[]>();
  const neighbors = new Map<Slot, Slot[]>();
  for (const slot of slots) {
    const entry = { ...slot, answer: { length: slot.length }, isInverted: false,
      col: slot.col + (slot.direction === 'across' && answerDirection === 'rtl' ? slot.length - 1 : 0) };
    const ordered = Array.from({ length: slot.length }, (_, i) => getEntryCellAt(entry, i, answerDirection));
    cells.set(slot, ordered);
    neighbors.set(slot, []);
    for (const { r, c } of ordered) {
      const list = owners.get(`${r},${c}`) ?? [];
      for (const other of list) {
        neighbors.get(slot)!.push(other);
        neighbors.get(other)!.push(slot);
      }
      list.push(slot);
      owners.set(`${r},${c}`, list);
    }
  }
  const prepared = { slots, cells, neighbors, lengths: new Set(slots.map(slot => slot.length)) };
  // Bound process lifetime memory even when New Puzzle produces novel layouts.
  if (cache.size >= 128) cache.delete(cache.keys().next().value!);
  cache.set(key, prepared);
  return prepared;
}
