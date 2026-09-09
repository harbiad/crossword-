import type { DictionaryHeadword } from '../api/_lib/dictionary.ts';

// Historical reports/tests only. Preserve the old preferred=false exclusion
// semantics when replaying frozen pre-methodology snapshots. Never use in API.
export function legacyDirectionalView(source: readonly DictionaryHeadword[]): DictionaryHeadword[] {
  return source.map(h=>({...h,translations:h.translations.map(t=>({...t,
    ...(t.preferredForEnToAr===false?{allowedForEnToAr:false}:{}),
    ...(t.preferredForArToEn===false?{allowedForArToEn:false}:{}),
  }))}));
}
