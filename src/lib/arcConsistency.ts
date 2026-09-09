import { getEntryCellAt } from './crossword';
import { prepareTemplate, type PreparedTemplate } from './preparedTemplate';
import { indexCandidates, lookupCandidates, type OrientedWord, type PreparedCandidates, type CandidateWindow } from './preparedCandidates';
import type { WordClue } from './generateCrossword';
import type { Placement } from './construct';

type Options = {
  preparedCandidates?: PreparedCandidates;
  preparedTemplate?: PreparedTemplate;
  candidateWindows?: ReadonlyMap<number, CandidateWindow>;
  timeBudgetMs?: number;
};
type Crossing = { other: number; here: number; there: number };

// Maintain support at every crossing, including between unassigned slots.
// Immutable domain arrays and a rollback trail avoid copying the entire search
// state. Answers remain canonical; orientation only changes character lookup.
export function constructArc(
  size: number, words: WordClue[], template: number[][],
  direction: 'ltr' | 'rtl', options: Options = {},
): Placement[] {
  if (template.length !== size) return [];
  const end = performance.now() + (options.timeBudgetMs ?? 400);
  const geometry = options.preparedTemplate ?? prepareTemplate(template, direction);
  const prepared = options.preparedCandidates ?? indexCandidates(words);
  const slots = geometry.slots;
  const domains = slots.map(slot => [...lookupCandidates(
    prepared, Array(slot.length).fill(null), new Set(), options.candidateWindows?.get(slot.length),
  )]);
  const neighbors: Crossing[][] = slots.map(() => []);
  const owners = new Map<string, { slot: number; position: number }>();
  slots.forEach((slot, index) => geometry.cells.get(slot)!.forEach(({ r, c }, position) => {
    const key = `${r},${c}`;
    const old = owners.get(key);
    if (old) {
      neighbors[index].push({ other: old.slot, here: position, there: old.position });
      neighbors[old.slot].push({ other: index, here: old.position, there: position });
    } else {
      owners.set(key, { slot: index, position });
    }
  }));
  const char = (word: OrientedWord, position: number) =>
    word.answer[word.isInverted ? word.answer.length - 1 - position : position];

  const trail: { index: number; previous: OrientedWord[] }[] = [];
  const setDomain = (index: number, value: OrientedWord[]) => {
    trail.push({ index, previous: domains[index] });
    domains[index] = value;
  };
  const restore = (mark: number) => {
    while (trail.length > mark) {
      const old = trail.pop()!;
      domains[old.index] = old.previous;
    }
  };
  const propagate = (initial: number[]) => {
    const queue = [...initial];
    const queued = new Set(queue);
    for (let head = 0; head < queue.length; head++) {
      if (performance.now() > end) return false;
      const index = queue[head];
      queued.delete(index);
      if (!domains[index].length) return false;
      for (const edge of neighbors[index]) {
        const supported = new Set(domains[index].map(word => char(word, edge.here)));
        const next = domains[edge.other].filter(word => supported.has(char(word, edge.there)));
        if (next.length === domains[edge.other].length) continue;
        setDomain(edge.other, next);
        if (!next.length) return false;
        if (!queued.has(edge.other)) {
          queue.push(edge.other);
          queued.add(edge.other);
        }
      }
    }
    return true;
  };
  if (!propagate(slots.map((_, index) => index))) return [];

  const chosen = new Map<number, OrientedWord>();
  const used = new Set<string>();
  const search = (): boolean => {
    if (performance.now() > end) return false;
    if (chosen.size === slots.length) return true;
    let best = -1;
    for (let index = 0; index < slots.length; index++) {
      if (chosen.has(index)) continue;
      if (best < 0 || domains[index].length < domains[best].length ||
          (domains[index].length === domains[best].length && neighbors[index].length > neighbors[best].length)) {
        best = index;
      }
    }
    if (best < 0 || !domains[best].length) return false;
    for (const word of domains[best]) {
      if (performance.now() > end) return false;
      if (used.has(word.answer)) continue;
      const mark = trail.length;
      setDomain(best, [word]);
      chosen.set(best, word);
      used.add(word.answer);
      const changed = [best];
      let feasible = true;
      // All-different is by canonical spelling, across clues and orientations.
      for (let index = 0; index < slots.length; index++) {
        if (chosen.has(index) || slots[index].length !== word.answer.length) continue;
        const next = domains[index].filter(candidate => candidate.answer !== word.answer);
        if (next.length < domains[index].length) {
          setDomain(index, next);
          changed.push(index);
          if (!next.length) { feasible = false; break; }
        }
      }
      if (feasible && propagate(changed) && search()) return true;
      used.delete(word.answer);
      chosen.delete(best);
      restore(mark);
    }
    return false;
  };
  if (!search()) return [];
  return slots.map((slot, index) => {
    const word = chosen.get(index)!;
    // Retain geometric numbering anchors even when typing begins at the far end.
    const entry = {
      ...slot, answer: word.answer, isInverted: false,
      col: slot.col + (slot.direction === 'across' && direction === 'rtl' ? slot.length - 1 : 0),
    };
    const { r, c } = getEntryCellAt(entry, 0, direction);
    return { ...word, row: r, col: c, direction: slot.direction };
  });
}
