import { describe, expect, it } from 'vitest';
import { createCandidateIndex, selectCandidates, type Band } from '../../api/_lib/candidates';

const dictionary = {
  CAT: [{ answer: 'قط / قِط / هر', clue: 'قط' }],
  DOG: [{ answer: 'كلب', clue: 'كلب' }],
  HOUSE: [{ answer: 'منزل', clue: 'منزل' }],
  SCHOOL: [{ answer: 'مدرسة', clue: 'مدرسة' }],
  ABILITY: [{ answer: 'قدرة', clue: 'قدرة' }],
  ABERRATION: [{ answer: 'انحراف', clue: 'انحراف' }],
};
const index = createCandidateIndex(dictionary);
const zero = () => 0;

it('normalizes meanings once, deduplicates variants, and preserves English and Arabic spelling', () => {
  const result = selectCandidates(index, 7, 'en_to_ar', 'advanced', 100, zero);
  expect(result.filter(p => p.clue === 'CAT').map(p => p.answer).sort()).toEqual(['قط', 'هر']);
  expect(result).toContainEqual({ answer: 'كلب', clue: 'DOG' });
  expect(selectCandidates(index, 7, 'ar_to_en', 'advanced', 100, zero)).toContainEqual({ answer: 'CAT', clue: 'قط' });
});

it('retains English length eligibility in both modes, without restricting Arabic clue length', () => {
  const custom = createCandidateIndex({
    ABERRATION: [{ answer: 'قط', clue: 'قط' }],
    CAT: [{ answer: 'عبارةعربيةطويلة', clue: 'عبارة عربية طويلة' }],
  });
  expect(selectCandidates(custom, 7, 'en_to_ar', 'advanced', 100, zero)).toEqual([]);
  expect(selectCandidates(custom, 7, 'ar_to_en', 'advanced', 100, zero)).toEqual([{ answer: 'CAT', clue: 'عبارة عربية طويلة' }]);
});

it('balances lengths and redistributes capacity from exhausted lengths', () => {
  const custom = createCandidateIndex({
    CAT: [{ answer: 'قط', clue: '' }, { answer: 'هر', clue: '' }, { answer: 'يد', clue: '' }],
    DOG: [{ answer: 'كلب', clue: '' }, { answer: 'بيت', clue: '' }, { answer: 'نور', clue: '' }],
    HOUSE: [{ answer: 'منزل', clue: '' }],
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
    ABERRATION: [{ answer: 'شر', clue: '' }], // C curated
    ABILITY: [{ answer: 'يد', clue: '' }], // B
    CAT: [{ answer: 'قط', clue: '' }], // A
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

it('preserves the first Arabic clue and fallback clue text, and excludes repeated fillers', () => {
  const custom = createCandidateIndex({
    CAT: [{ answer: 'قط/هر', clue: '[]' }, { answer: 'بس', clue: 'آخر' }],
    REPEATED: [{ answer: 'دد', clue: 'تكرار' }],
  });
  expect(selectCandidates(custom, 13, 'ar_to_en', 'advanced', 10, zero)).toContainEqual({ answer: 'CAT', clue: 'قط/هر' });
  expect(selectCandidates(custom, 13, 'en_to_ar', 'advanced', 10, zero).every(p => p.clue !== 'REPEATED')).toBe(true);
});
