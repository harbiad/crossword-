import { normalizeArabicWord, buildReverseIndex, type DictionaryHeadword } from '../api/_lib/dictionary.ts';
export type RawDictionary = Record<string, { answer: string; clue: string }[]>;
export function migrate(raw: RawDictionary): DictionaryHeadword[] {
  return Object.entries(raw).map(([english, items]) => ({
    english, translations: items.map(item => ({ arabic: item.clue })),
  }));
}

export function equivalenceFailures(raw: RawDictionary, dictionary: readonly DictionaryHeadword[]) {
  const failures: { english: string; translationIndex?: number; reason: string; oldAnswer?: string; arabic?: string }[] = [];
  const originals = Object.entries(raw);
  if (originals.length !== dictionary.length) failures.push({ english: '*', reason: 'Headword count differs' });
  originals.forEach(([english, items], i) => {
    const headword = dictionary[i];
    if (headword?.english !== english) {
      failures.push({ english, reason: 'Headword missing or reordered' });
      return;
    }
    if (headword.translations.length !== items.length) failures.push({ english, reason: 'Relationship count differs' });
    items.forEach((item, translationIndex) => {
      const arabic = headword.translations[translationIndex]?.arabic;
      if (arabic !== item.clue || normalizeArabicWord(item.answer) !== normalizeArabicWord(arabic ?? '')) {
        failures.push({ english, translationIndex, oldAnswer: item.answer, arabic,
          reason: arabic !== item.clue ? 'Display Arabic changed or relationship missing' : 'Normalized answer differs' });
      }
    });
  });
  return failures;
}

// Review hints, not classifications. Whole-token matches avoid substring noise;
// some tokens can still have legitimate MSA senses, so humans must review them.
const dialectHints = new Set(['مش', 'عايز', 'عاوز', 'شو', 'ليش', 'ازاي', 'كده', 'هيك', 'دلوقتي', 'عشان', 'بدي', 'بتاع', 'كويس']);
export function audit(raw: RawDictionary, dictionary: readonly DictionaryHeadword[], abbreviations: RawDictionary) {
  const review: { english: string; translationIndex: number; arabic: string; reasons: string[] }[] = [];
  const classifications = { msa: 0, dialect: 0, uncertain: 0, unset: 0 };
  let multiwordArabic = 0, duplicateArabicWithinHeadword = 0;
  for (const headword of dictionary) {
    const seen = new Set<string>();
    headword.translations.forEach((translation, translationIndex) => {
      const { arabic } = translation;
      classifications[translation.register ?? 'unset']++;
      const tokens = arabic.trim().split(/\s+/);
      if (tokens.length > 1) multiwordArabic++;
      const reasons: string[] = [];
      if (seen.has(arabic)) { duplicateArabicWithinHeadword++; reasons.push('duplicate translation within headword'); }
      seen.add(arabic);
      if (tokens.some((token, i) => i > 0 && token === tokens[i - 1])) reasons.push('immediately repeated Arabic word');
      if (tokens.some(token => dialectHints.has(token))) reasons.push('possible dialect/slang; human review required');
      if (Object.hasOwn(abbreviations, headword.english)) reasons.push('headword present in abbreviation dataset');
      if (reasons.length) review.push({ english: headword.english, translationIndex, arabic, reasons });
    });
  }
  const reverse = buildReverseIndex(dictionary);
  const sharedArabic = [...reverse].filter(([, refs]) => new Set(refs.map(ref => ref.english)).size > 1)
    .map(([arabic, references]) => ({ arabic, references }));
  return {
    sourceHeadwords: Object.keys(raw).length,
    sourceTranslations: Object.values(raw).reduce((n, items) => n + items.length, 0),
    englishHeadwords: dictionary.length,
    arabicTranslations: dictionary.reduce((n, h) => n + h.translations.length, 0),
    equivalenceFailures: equivalenceFailures(raw, dictionary), multiwordArabic,
    duplicateArabicWithinHeadword, sharedArabicExpressions: sharedArabic.length,
    abbreviationHeadwords: dictionary.filter(h => Object.hasOwn(abbreviations, h.english)).map(h => h.english),
    repeatedWordTranslations: review.filter(r => r.reasons.includes('immediately repeated Arabic word')).length,
    likelyDialectTranslations: review.filter(r => r.reasons.includes('possible dialect/slang; human review required')).length,
    classifications, review, sharedArabic,
  };
}
