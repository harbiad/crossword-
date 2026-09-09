import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { DICTIONARY as source } from '../../api/_lib/dictionary.generated';
import { DICTIONARY_STAGE2 } from '../../api/_lib/dictionary.stage2.generated';
import { DICT_COMMON_3000_ABBREV } from '../../api/dict_common_3000_abbrev';
import { cleanupStage2, verifyStage2, csv } from '../../scripts/stage2';
import { createCandidateIndex } from '../../api/_lib/candidates';
import { normalizeArabicWord, type DictionaryHeadword } from '../../api/_lib/dictionary';
const result = cleanupStage2(source, new Set(Object.keys(DICT_COMMON_3000_ABBREV)));

it('preserves every source relationship except documented consolidations, and reproduces checked-in production data', () => {
  expect(verifyStage2(source, result)).toEqual([]);
  expect(result.dictionary).toEqual(DICTIONARY_STAGE2);
  expect(result.lineage).toHaveLength(29526);
  expect(result.consolidations).toHaveLength(59);
  expect(result.dictionary).toHaveLength(16018);
  expect(result.dictionary.reduce((n, h) => n + h.translations.length, 0)).toBe(29526 - result.consolidations.length);
  expect(source.every(h => h.status === undefined && h.cefr === undefined && h.translations.every(t => Object.keys(t).join() === 'arabic'))).toBe(true);
  expect(result.dictionary.every(h => h.cefr === null)).toBe(true);
  const report = JSON.parse(readFileSync('dictionary/stage2/report.json', 'utf8'));
  expect(report.consolidations).toEqual(result.consolidations);
  expect(report.lineage).toEqual(result.lineage);
  expect(report.metadataActions).toEqual(result.metadataActions);
});

it('consolidates identical normalized relationships only within a headword and preserves meaningful metadata distinctions', () => {
  const fixture: DictionaryHeadword[] = [
    { english: 'CAT', translations: [{ arabic: 'قِط' }, { arabic: 'قط' }, { arabic: 'قط', sense: 'another sense' },
      { arabic: 'قط', preferredForEnToAr: false }, { arabic: 'هر' }] },
    { english: 'TOMCAT', translations: [{ arabic: 'قط' }] },
  ];
  const clean = cleanupStage2(fixture, new Set());
  expect(clean.consolidations).toHaveLength(1);
  expect(clean.dictionary[0].translations.map(t => t.arabic)).toEqual(['قِط', 'قط', 'قط', 'هر']);
  expect(clean.dictionary[1].translations[0].arabic).toBe('قط');
  expect(verifyStage2(fixture, clean)).toEqual([]);
  clean.consolidations = [];
  expect(verifyStage2(fixture, clean).length).toBeGreaterThan(0);
});

it('retains an existing spaced display when consolidating its concatenated duplicate', () => {
  const fixture = [{ english: 'NOTHING', translations: [{ arabic: 'لاشيء' }, { arabic: 'لا شيء' }] }];
  const clean = cleanupStage2(fixture, new Set());
  expect(clean.dictionary[0].translations[0].arabic).toBe('لا شيء');
  expect(clean.consolidations).toEqual([expect.objectContaining({ sourceId: 'h0:t0', retainedSourceId: 'h0:t1', removedArabic: 'لاشيء', retainedArabic: 'لا شيء' })]);
  expect(verifyStage2(fixture, clean)).toEqual([]);
});

it.each([['PROPERLY', 'بشكل صحيح', 'بشكلصحيح'], ['FOR', 'من أجل', 'منأجل'], ['PERCENTAGE', 'النسبة المئوية', 'النسبةالمئوية']])('preserves %s multiword display and runtime grid normalization', (english, arabic, grid) => {
  expect(DICTIONARY_STAGE2.find(h => h.english === english)?.translations.some(t => t.arabic === arabic)).toBe(true);
  expect(normalizeArabicWord(arabic)).toBe(grid);
});

it('flags repetitions with suggestions, without applying them, and preserves valid article variants', () => {
  const fixture = [{ english: 'SOUND', translations: [{ arabic: 'السليم السليم' }] },
    { english: 'BOOK', translations: [{ arabic: 'كتاب' }, { arabic: 'الكتاب' }] }];
  const clean = cleanupStage2(fixture, new Set());
  expect(clean.dictionary[0].translations[0].arabic).toBe('السليم السليم');
  expect(clean.review.find(r => r.category === 'repeated-word')).toMatchObject({ priority: 1, sourceIds: ['h0:t0'], suggestion: 'السليم' });
  expect(clean.review.some(r => r.category === 'article-variant')).toBe(true);
  expect(clean.dictionary[1].translations).toHaveLength(2);
});

it('uses sense-specific dialect evidence and does not reject names/transliterations or lexical abbreviation collisions', () => {
  const clean = cleanupStage2([
    { english: 'NOT', translations: [{ arabic: 'مش' }] },
    { english: 'MESH', translations: [{ arabic: 'مش' }] },
    { english: 'CAT', translations: [{ arabic: 'قط' }] },
    { english: 'THE', translations: [{ arabic: 'ال' }] },
    { english: 'USA', translations: [{ arabic: 'امريكا' }] },
  ], new Set(['THE', 'USA', 'CAT']));
  expect(clean.dictionary[0].translations[0]).toMatchObject({ status: 'rejected', register: 'dialect' });
  expect(clean.dictionary[1].translations[0]).toMatchObject({ status: 'review', register: 'uncertain' });
  expect(clean.abbreviations.map(a => a.category)).toEqual(['uncertain', 'likely normal word', 'clear abbreviation/acronym']);
  expect(clean.dictionary.every(h => h.status === 'review')).toBe(true);
});

it.each(['en_to_ar', 'ar_to_en'])('excludes rejected relationships/headwords in %s and requires approval and MSA only in strict mode', mode => {
  const fixture: DictionaryHeadword[] = [
    { english: 'CAT', status: 'approved', translations: [{ arabic: 'بس', status: 'rejected', register: 'dialect' }, { arabic: 'قط', status: 'approved', register: 'msa' }] },
    { english: 'DOG', status: 'rejected', translations: [{ arabic: 'كلب', status: 'approved', register: 'msa' }] },
    { english: 'BOOK', translations: [{ arabic: 'كتاب' }] },
    { english: 'HOUSE', status: 'review', translations: [{ arabic: 'منزل', status: 'review', register: 'uncertain' }] },
  ];
  const pairs = (policy: 'compatibility' | 'approved-only') => [...createCandidateIndex(fixture, policy).get(`13:${mode}:advanced`)!.values()].flat(2);
  expect(pairs('compatibility')).toHaveLength(3);
  expect(pairs('approved-only')).toEqual([mode === 'en_to_ar' ? { answer: 'قط', clue: 'CAT' } : { answer: 'CAT', clue: 'قط' }]);
  expect([...createCandidateIndex(DICTIONARY_STAGE2, 'approved-only').values()].every(groups => groups.size === 0)).toBe(true);
});

it('gives every production relationship a source reference, even when suspicious noise is retained for review', () => {
  const fixture = [{ english: 'ABC-123', translations: [{ arabic: 'كلمة (note)' }, { arabic: 'عبارة عربية طويلة جدا للغاية' }] }];
  const clean = cleanupStage2(fixture, new Set());
  expect(clean.review.map(r => r.category)).toEqual(expect.arrayContaining(['noisy-english','latin-in-arabic','editorial-note','over-13-cells']));
  expect(clean.dictionary[0].translations.map(t => t.arabic)).toEqual(fixture[0].translations.map(t => t.arabic));
  expect(verifyStage2(fixture, clean)).toEqual([]);
});

it('writes escaped UTF-8 CSV review rows with source references', () => {
  const output = csv([{ priority: 1, category: 'review', english: 'TEST', arabic: 'كلمة "أخرى", نص', sourceIds: ['h0:t0'], reason: 'line\nbreak' }]);
  expect(output).toContain('"كلمة ""أخرى"", نص"');
  expect(output).toContain('"h0:t0"');
});
