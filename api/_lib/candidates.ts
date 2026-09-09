import { getWordLevel, type CefrLevel } from '../cefr_levels.js';
import { normalizeArabicWord, eligibleTranslation, type DictionaryPolicy, type DictionaryHeadword, type DictionaryTranslation } from './dictionary.js';

export type Mode = 'en_to_ar' | 'ar_to_en';
export type Band = 'beginner' | 'intermediate' | 'advanced';
type Pair = Readonly<{ answer: string; clue: string }>;
type Word = { english: string; level: CefrLevel; meanings: Pair[] };
type LengthGroups = ReadonlyMap<number, readonly (readonly Pair[])[]>;
export type CandidateIndex = ReadonlyMap<string, LengthGroups>;
const sizes = [7, 9, 11, 13];
const levels: Record<Band, CefrLevel[][]> = {
  beginner: [['A'], ['B'], ['C']],
  intermediate: [['A', 'B'], ['C']],
  advanced: [['A', 'B', 'C']],
};

function meanings(items: readonly DictionaryTranslation[]): Pair[] {
  const result: Pair[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    const displayArabic = item.arabic;
    for (const variant of displayArabic.split(/[/،;|]/)) {
      const answer = normalizeArabicWord(variant);
      if (answer.length < 2 || seen.has(answer)) continue;
      seen.add(answer);
      result.push({ answer, clue: displayArabic });
    }
  }
  return result;
}

// One initialization per warm process. Keep the existing CEFR classifier,
// English-length eligibility in both modes, meaning order and normalization.
export function createCandidateIndex(dictionary: readonly DictionaryHeadword[], policy: DictionaryPolicy = 'compatibility'): CandidateIndex {
  const seen = new Set<string>();
  const words: Word[] = [];
  dictionary.forEach((headword, position) => {
    const key = headword.english;
    const english = key.trim().replace(/[^a-zA-Z]/g, '').toUpperCase();
    if (!english || seen.has(english)) return;
    seen.add(english);
    words.push({ english, level: getWordLevel(english, position), meanings: meanings(headword.translations.filter(t => eligibleTranslation(headword, t, policy))) });
  });
  const index = new Map<string, LengthGroups>();
  for (const size of sizes) for (const mode of ['en_to_ar', 'ar_to_en'] as const) {
    const buckets = new Map<number, Record<CefrLevel, Pair[]>>();
    for (const word of words) {
      if (word.english.length < 2 || word.english.length > size || !word.meanings.length) continue;
      const pairs = mode === 'ar_to_en'
        ? [{ answer: word.english, clue: word.meanings[0].clue }]
        : /repeated/i.test(word.english) ? [] : word.meanings.map(m => ({ answer: m.answer, clue: word.english }));
      for (const pair of pairs) {
        const length = pair.answer.length;
        if (length > size) continue;
        if (!buckets.has(length)) buckets.set(length, { A: [], B: [], C: [] });
        buckets.get(length)![word.level].push(pair);
      }
    }
    for (const band of ['beginner', 'intermediate', 'advanced'] as const) {
      const groups = new Map<number, Pair[][]>();
      for (let length = 2; length <= size; length++) {
        const bucket = buckets.get(length);
        if (bucket) groups.set(length, levels[band].map(tier => tier.flatMap(level => bucket[level])));
      }
      index.set(`${size}:${mode}:${band}`, groups);
    }
  }
  return index;
}

// Sparse partial Fisher–Yates: O(number sampled), without copying/shuffling the
// entire dictionary. All mutation is request-local; cached arrays stay intact.
function sampler(pairs: readonly Pair[], random: () => number) {
  let remaining = pairs.length;
  const swaps = new Map<number, number>();
  return () => {
    if (!remaining) return undefined;
    const position = Math.floor(random() * remaining);
    const selected = swaps.get(position) ?? position;
    remaining--;
    swaps.set(position, swaps.get(remaining) ?? remaining);
    swaps.delete(remaining);
    return pairs[selected];
  };
}

export function selectCandidates(index: CandidateIndex, size: number, mode: Mode, band: Band,
  limit: number, random: () => number = Math.random): Pair[] {
  if (!Number.isInteger(limit) || limit < 0) throw new Error('Candidate limit must be a nonnegative integer');
  const groups = index.get(`${size}:${mode}:${band}`);
  if (!groups) throw new Error('Unsupported candidate configuration');
  const lengths = [...groups.values()].map(tiers => ({ tier: 0, draw: tiers.map(pairs => sampler(pairs, random)) }));
  const selected: Pair[][] = levels[band].map(() => []);
  let count = 0;
  // Equal allocation per available answer length; exhausted lengths release
  // their share. Random starting length avoids bias when the budget is uneven.
  let cursor = lengths.length ? Math.floor(random() * lengths.length) : 0;
  while (lengths.length && count < limit) {
    const current = lengths[cursor];
    let pair: Pair | undefined;
    while (current.tier < current.draw.length && !(pair = current.draw[current.tier]())) current.tier++;
    if (pair) {
      selected[current.tier].push(pair);
      count++;
      cursor = (cursor + 1) % lengths.length;
    } else {
      lengths.splice(cursor, 1);
      if (lengths.length) cursor %= lengths.length;
    }
  }
  // No cross-tier shuffle: preference affects membership and response order.
  return selected.flat();
}
