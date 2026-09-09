export type ReviewStatus = 'approved' | 'review' | 'rejected';
export type ArabicRegister = 'msa' | 'dialect' | 'uncertain';
export type DictionaryTranslation = {
  arabic: string;
  status?: ReviewStatus;
  register?: ArabicRegister;
  preferredForEnToAr?: boolean;
  preferredForArToEn?: boolean;
  partOfSpeech?: string;
  sense?: string;
};
export type DictionaryHeadword = {
  english: string;
  status?: ReviewStatus;
  cefr?: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2' | null;
  translations: DictionaryTranslation[];
};

export type DictionaryPolicy = 'compatibility' | 'approved-only';
export function eligibleTranslation(headword: DictionaryHeadword, translation: DictionaryTranslation, policy: DictionaryPolicy) {
  if (headword.status === 'rejected' || translation.status === 'rejected' || translation.register === 'dialect') return false;
  return policy === 'compatibility' || (headword.status === 'approved' && translation.status === 'approved' && translation.register === 'msa');
}

// Crossword comparison/answer form only. Never use this as displayed Arabic.
// Preserve the existing API normalization, including hamza and alef maksura.
export function normalizeArabicWord(value: string): string {
  return value.trim().replace(/\s+/g, '')
    .replace(/(?:ـ|[\u064B-\u065F\u0670])/g, '')
    .replace(/[\u061F\u060C\u06D4\u066B\u066C.,;:!\-_/()[\]{}"'`~@#$%^&*+=<>]/g, '').toUpperCase();
}

export type TranslationReference = { english: string; headwordIndex: number; translationIndex: number };

// Exact display phrases are keys: do not merge senses or different spellings.
// The default view preserves every relationship for curation. The approved view
// supports the future policy; it does NOT change today's production filtering.
export function buildReverseIndex(dictionary: readonly DictionaryHeadword[], approvedOnly = false) {
  const index = new Map<string, TranslationReference[]>();
  dictionary.forEach((headword, headwordIndex) => {
    headword.translations.forEach((translation, translationIndex) => {
      if (approvedOnly && (headword.status !== 'approved' || translation.status !== 'approved' || translation.register !== 'msa')) return;
      const refs = index.get(translation.arabic) ?? [];
      refs.push({ english: headword.english, headwordIndex, translationIndex });
      index.set(translation.arabic, refs);
    });
  });
  return index;
}
