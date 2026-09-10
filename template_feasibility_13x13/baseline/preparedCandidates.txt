import type { WordClue } from './generateCrossword';

export type OrientedWord = WordClue & { isInverted: boolean };
export type CandidateBucket = {
  words: WordClue[];
  ids: number[];
  byPosition: Map<string, number[]>[];
  normal: OrientedWord[];
  inverted: OrientedWord[];
};
export type PreparedCandidates = { words: WordClue[]; byLength: Map<number, CandidateBucket> };
export type CandidateWindow = { offset: number; count: number };
export type LookupStats = { examined: number };

export function normalizeAnswer(answer: string): string {
  return answer.trim().replace(/\s+/g, '').replace(/(?:ـ|[\u064B-\u065F\u0670])/g, '')
    .replace(/[أإآٱ]/g, 'ا').toUpperCase(); // Deliberately preserve ى versus ي.
}

// Also available to direct constructor callers whose records are already canonical.
export function indexCandidates(words: WordClue[]): PreparedCandidates {
  const byLength = new Map<number, CandidateBucket>();
  for (const word of words) {
    const length = word.answer.length;
    let bucket = byLength.get(length);
    if (!bucket) {
      bucket = { words: [], ids: [], byPosition: Array.from({ length }, () => new Map()), normal: [], inverted: [] };
      byLength.set(length, bucket);
    }
    const id = bucket.words.length;
    bucket.words.push(word);
    bucket.ids.push(id);
    bucket.normal.push({ ...word, isInverted: false });
    bucket.inverted.push({ ...word, isInverted: true });
    for (let position = 0; position < length; position++) {
      const posting = bucket.byPosition[position].get(word.answer[position]) ?? [];
      posting.push(id);
      bucket.byPosition[position].set(word.answer[position], posting);
    }
  }
  return { words, byLength };
}

export function prepareCandidates(words: WordClue[], size: number, random = Math.random): PreparedCandidates {
  const clean = words.map(word => ({ ...word, answer: normalizeAnswer(word.answer), clue: word.clue.trim() }))
    .filter(word => word.answer.length >= 2 && word.answer.length <= size);
  const buckets = new Map<number, WordClue[]>();
  for (const word of clean) {
    const bucket = buckets.get(word.answer.length) ?? [];
    bucket.push(word);
    buckets.set(word.answer.length, bucket);
  }
  // Preserve the existing per-length random order; postings inherit that order.
  for (const bucket of buckets.values()) for (let i = bucket.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [bucket[i], bucket[j]] = [bucket[j], bucket[i]];
  }
  return indexCandidates([...buckets.values()].flat());
}

function lowerBound(ids: readonly number[], target: number): number {
  let lo = 0, hi = ids.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (ids[mid] < target) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

function* matchingIds(bucket: CandidateBucket, pattern: readonly (string | null)[], inverted: boolean,
  used: ReadonlySet<string>, window: CandidateWindow, stats?: LookupStats): Generator<number> {
  let source = bucket.ids;
  const fixed: { position: number; char: string }[] = [];
  for (let physical = 0; physical < pattern.length; physical++) {
    const char = pattern[physical];
    if (!char) continue;
    const position = inverted ? pattern.length - 1 - physical : physical;
    const posting = bucket.byPosition[position].get(char);
    if (!posting) return;
    if (posting.length < source.length) source = posting;
    fixed.push({ position, char });
  }
  // Posting IDs are ordered. Rotate at the attempt's offset without sorting or
  // copying, and retain the original candidate order when merging orientations.
  const pivot = lowerBound(source, window.offset);
  for (let i = 0; i < source.length; i++) {
    const id = source[(pivot + i) % source.length];
    if ((id - window.offset + bucket.words.length) % bucket.words.length >= window.count) continue;
    if (stats) stats.examined++;
    const word = bucket.words[id];
    if (used.has(word.answer)) continue;
    if (fixed.every(f => word.answer[f.position] === f.char)) yield id;
  }
}

// Pattern cells follow NORMAL entry traversal (LTR/RTL Across or Down).
// Inversion maps each fixed physical position to length - 1 - position; answers
// and used-word identity never change. Both MRV and forward checking use this.
export function* lookupCandidates(prepared: PreparedCandidates, pattern: readonly (string | null)[],
  used: ReadonlySet<string>, window?: CandidateWindow, stats?: LookupStats): Generator<OrientedWord> {
  const bucket = prepared.byLength.get(pattern.length);
  if (!bucket) return;
  const range = window ?? { offset: 0, count: bucket.words.length };
  const normal = matchingIds(bucket, pattern, false, used, range, stats);
  const inverted = matchingIds(bucket, pattern, true, used, range, stats);
  let a = normal.next(), b = inverted.next();
  const rank = (id: number) => (id - range.offset + bucket.words.length) % bucket.words.length;
  while (!a.done || !b.done) {
    if (!a.done && (b.done || rank(a.value) <= rank(b.value))) {
      yield bucket.normal[a.value];
      a = normal.next();
    } else if (!b.done) {
      yield bucket.inverted[b.value];
      b = inverted.next();
    }
  }
}
