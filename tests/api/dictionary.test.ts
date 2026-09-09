import { expect, it } from 'vitest';
import { DICT_COMMON_30000_NON_EMPTY as raw } from '../../api/DICT_COMMON_30000_non_empty';
import { DICTIONARY } from '../../api/_lib/dictionary.generated';
import { normalizeArabicWord, buildReverseIndex, type DictionaryHeadword } from '../../api/_lib/dictionary';
import { createCandidateIndex } from '../../api/_lib/candidates';
import { createCandidateIndex as legacyIndex } from '../fixtures/legacy-candidates';
import { migrate, equivalenceFailures, audit } from '../../scripts/dictionary-tools';

it('preserves every source relationship, display string, order, and normalized answer', () => {
  expect(equivalenceFailures(raw, DICTIONARY)).toEqual([]);
  expect(DICTIONARY).toEqual(migrate(raw));
  expect(DICTIONARY).toHaveLength(16018);
  expect(DICTIONARY.reduce((n, h) => n + h.translations.length, 0)).toBe(29526);
  expect(DICTIONARY.every(h => h.cefr === undefined && h.translations.every(t => Object.keys(t).join() === 'arabic'))).toBe(true);
});

it('preserves the complete candidate index, order and CEFR tiers in both modes at every size/band', () => {
  const before = legacyIndex(raw), after = createCandidateIndex(DICTIONARY);
  expect([...after.keys()]).toEqual([...before.keys()]);
  for (const [configuration, expected] of before) {
    expect(after.get(configuration), configuration).toEqual(expected);
  }
});

it.each([['بشكل صحيح', 'بشكلصحيح'], ['من أجل', 'منأجل'], ['النسبة المئوية', 'النسبةالمئوية'], ['كتاب', 'كتاب']])(
  'derives %s only for grid answers, preserving the display form', (arabic, grid) => {
    expect(normalizeArabicWord(arabic)).toBe(grid);
    const index = createCandidateIndex([{ english: 'PROPERLY', translations: [{ arabic }] }]);
    const pairs = (mode: string) => [...index.get(`13:${mode}:advanced`)!.values()].flat(2);
    expect(pairs('en_to_ar')).toContainEqual({ answer: grid, clue: 'PROPERLY' });
    expect(pairs('ar_to_en')).toContainEqual({ answer: 'PROPERLY', clue: arabic });
  },
);

it('detects mismatches, missing alternatives, added records, and changes to display spacing', () => {
  const source = { CAT: [{ answer: 'قط', clue: 'قط' }, { answer: 'هر', clue: 'هر' }] };
  expect(equivalenceFailures(source, migrate(source))).toEqual([]);
  expect(equivalenceFailures({ CAT: [{ answer: 'قط', clue: 'كلب' }] }, migrate({ CAT: [{ answer: 'قط', clue: 'كلب' }] }))).toHaveLength(1);
  expect(equivalenceFailures(source, [{ english: 'CAT', translations: [{ arabic: 'قط' }] }]).length).toBeGreaterThan(0);
  expect(equivalenceFailures(source, [...migrate(source), { english: 'DOG', translations: [] }]).length).toBeGreaterThan(0);
  const changed = migrate(source); changed[0].translations[0].arabic = ' قط ';
  expect(equivalenceFailures(source, changed)).toHaveLength(1);
});

it('keeps many-to-many relationships and exposes approved MSA references without treating unset metadata as approved', () => {
  const dictionary: DictionaryHeadword[] = [
    { english: 'CAT', status: 'approved', translations: [
      { arabic: 'قط', status: 'approved', register: 'msa', preferredForEnToAr: false, preferredForArToEn: true },
      { arabic: 'هر' }, { arabic: 'قط', sense: 'another sense' },
    ] },
    { english: 'TOMCAT', status: 'approved', translations: [{ arabic: 'قط', status: 'approved', register: 'msa' }] },
    { english: 'REVIEW', translations: [{ arabic: 'قط' }] },
    { english: 'NO', status: 'approved', translations: [{ arabic: 'مش', status: 'approved', register: 'dialect' }] },
  ];
  expect(buildReverseIndex(dictionary).get('قط')).toHaveLength(4);
  expect(buildReverseIndex(dictionary).get('هر')).toHaveLength(1);
  expect(buildReverseIndex(dictionary, true).get('قط')?.map(r => r.english)).toEqual(['CAT', 'TOMCAT']);
  expect(buildReverseIndex(dictionary, true).has('مش')).toBe(false);
});

it('flags duplicates, repeated words, abbreviations and possible dialect without changing records', () => {
  const source = { TEST: [{ answer: 'السليمالسليم', clue: 'السليم السليم' },
    { answer: 'مش', clue: 'مش' }, { answer: 'مش', clue: 'مش' }] };
  const dictionary = migrate(source);
  const result = audit(source, dictionary, { TEST: [] });
  expect(result.repeatedWordTranslations).toBe(1);
  expect(result.duplicateArabicWithinHeadword).toBe(1);
  expect(result.likelyDialectTranslations).toBe(2);
  expect(result.abbreviationHeadwords).toEqual(['TEST']);
  expect(result.classifications.unset).toBe(3);
  expect(dictionary).toEqual(migrate(source));
});
