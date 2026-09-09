import { describe, expect, it } from 'vitest';
import { createCandidateIndex as prepare, selectCandidates, type Band } from '../../api/_lib/candidates';

import type { DictionaryTranslation } from '../../api/_lib/dictionary';
const createCandidateIndex = (dictionary: Record<string, DictionaryTranslation[]>) =>
  prepare(Object.entries(dictionary).map(([english, translations]) => ({ english, translations })));

const dictionary = {
  CAT: [{ arabic: 'قط / قِط / هر' }],
  DOG: [{ arabic: 'كلب' }],
  HOUSE: [{ arabic: 'منزل' }],
  SCHOOL: [{ arabic: 'مدرسة' }],
  ABILITY: [{ arabic: 'قدرة' }],
  ABERRATION: [{ arabic: 'انحراف' }],
};
const index = createCandidateIndex(dictionary);
const zero = () => 0;

it('normalizes meanings once, deduplicates variants, and preserves English and Arabic spelling', () => {
  const result = selectCandidates(index, 7, 'en_to_ar', 'advanced', 100, zero);
  expect(result.filter(p => p.clue === 'CAT').map(p => p.answer).sort()).toEqual(['قط', 'هر']);
  expect(result).toContainEqual({ answer: 'كلب', clue: 'DOG' });
  expect(selectCandidates(index, 7, 'ar_to_en', 'advanced', 100, zero)).toContainEqual({ answer: 'CAT', clue: 'قط / قِط / هر' });
});

it('retains English length eligibility in both modes, without restricting Arabic clue length', () => {
  const custom = createCandidateIndex({
    ABERRATION: [{ arabic: 'قط' }],
    CAT: [{ arabic: 'عبارة عربية طويلة' }],
  });
  expect(selectCandidates(custom, 7, 'en_to_ar', 'advanced', 100, zero)).toEqual([]);
  expect(selectCandidates(custom, 7, 'ar_to_en', 'advanced', 100, zero)).toEqual([{ answer: 'CAT', clue: 'عبارة عربية طويلة' }]);
});

it('balances lengths and redistributes capacity from exhausted lengths', () => {
  const custom = createCandidateIndex({
    CAT: [{ arabic: 'قط' }, { arabic: 'هر' }, { arabic: 'يد' }],
    DOG: [{ arabic: 'كلب' }, { arabic: 'بيت' }, { arabic: 'نور' }],
    HOUSE: [{ arabic: 'منزل' }],
  });
  const counts = (limit: number) => selectCandidates(custom, 7, 'en_to_ar', 'beginner', limit, zero)
    .reduce<Record<number, number>>((result, p) => { result[p.answer.length] = (result[p.answer.length] ?? 0) + 1; return result; }, {});
  expect(counts(3)).toEqual({ 2: 1, 3: 1, 4: 1 });
  expect(counts(7)).toEqual({ 2: 3, 3: 3, 4: 1 });
});

describe.each<Band>(['beginner', 'intermediate', 'advanced'])('%s', band => {
  it('has no duplicates, respects the exact cap, and does not mutate the warm index', () => {
    const before = selectCandidates(index, 13, 'en_to_ar', band, 100, zero);
    for (const limit of [0, 1, 3, 5, 100]) {
      const result = selectCandidates(index, 13, 'en_to_ar', band, limit, zero);
      expect(result).toHaveLength(Math.min(limit, before.length));
      expect(new Set(result.map(p => `${p.answer}:${p.clue}`)).size).toBe(result.length);
    }
    expect(selectCandidates(index, 13, 'en_to_ar', band, 100, zero)).toEqual(before);
  });
});

it('uses CEFR tiers within each length and falls back instead of hard-filtering', () => {
  // Same Arabic length isolates preference from length allocation.
  const custom = createCandidateIndex({
    ABERRATION: [{ arabic: 'شر' }], // C curated
    ABILITY: [{ arabic: 'يد' }], // B
    CAT: [{ arabic: 'قط' }], // A
  });
  const choose = (band: Band, limit: number, random = zero) => selectCandidates(custom, 13, 'en_to_ar', band, limit, random).map(p => p.clue);
  expect(choose('beginner', 3)).toEqual(['CAT', 'ABILITY', 'ABERRATION']);
  expect(choose('beginner', 1)).toEqual(['CAT']);
  expect(choose('intermediate', 1, () => 0.99)).toEqual(['ABILITY']);
  expect(choose('intermediate', 3).at(-1)).toBe('ABERRATION');
  expect(choose('advanced', 1, () => 0.99)).toEqual(['ABERRATION']);
});

it('draws fresh random samples and never reclassifies or rereads dictionary values on requests', () => {
  let reads = 0;
  const custom = createCandidateIndex({ get CAT() { reads++; return dictionary.CAT; }, DOG: dictionary.DOG });
  const initializedReads = reads;
  const a = selectCandidates(custom, 7, 'ar_to_en', 'advanced', 1, zero);
  const b = selectCandidates(custom, 7, 'ar_to_en', 'advanced', 1, () => 0.99);
  expect(a).not.toEqual(b);
  expect(reads).toBe(initializedReads);
});

it('preserves the first display Arabic including separators, and excludes repeated fillers', () => {
  const custom = createCandidateIndex({
    CAT: [{ arabic: 'قط/هر' }, { arabic: 'آخر' }],
    REPEATED: [{ arabic: 'تكرار' }],
  });
  expect(selectCandidates(custom, 13, 'ar_to_en', 'advanced', 10, zero)).toContainEqual({ answer: 'CAT', clue: 'قط/هر' });
  expect(selectCandidates(custom, 13, 'en_to_ar', 'advanced', 10, zero).every(p => p.clue !== 'REPEATED')).toBe(true);
});
