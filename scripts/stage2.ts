import { normalizeArabicWord, type DictionaryHeadword, type DictionaryTranslation } from '../api/_lib/dictionary.ts';
import { dialectEvidence, msaEvidence, dialectTokens, clearAcronyms, lexicalWords, personNames, placeNames, brandNames, possibleTransliteration } from './stage2-rules.ts';

export type ReviewRow = { priority: 1 | 2 | 3; category: string; english: string; arabic: string; sourceIds: string[]; reason: string; suggestion?: string };
export type Consolidation = { sourceId: string; retainedSourceId: string; english: string; removedArabic: string; retainedArabic: string; grid: string; reason: string };
export type Lineage = { sourceId: string; headwordIndex: number; translationIndex: number; retainedSourceId: string };
const sourceId = (h: number, t: number) => `h${h}:t${t}`;
const metadataKey = (translation: DictionaryTranslation) => JSON.stringify(Object.entries(translation).filter(([key]) => key !== 'arabic').sort(([a], [b]) => a.localeCompare(b)));

export function cleanupStage2(source: readonly DictionaryHeadword[], abbreviationKeys: ReadonlySet<string>) {
  const dictionary: DictionaryHeadword[] = [], review: ReviewRow[] = [], consolidations: Consolidation[] = [], lineage: Lineage[] = [];
  const metadataActions: { sourceId: string; before: unknown; after: unknown; reason: string }[] = [];
  const abbreviations: { english: string; category: 'clear abbreviation/acronym' | 'likely normal word' | 'uncertain'; inDataset: boolean }[] = [];
  source.forEach((headword, h) => {
    const english = headword.english;
    const translations: DictionaryTranslation[] = [];
    const groups = new Map<string, { members: { original: DictionaryTranslation; t: number }[]; keep: { original: DictionaryTranslation; t: number } }>();
    headword.translations.forEach((original, t) => {
      const key = JSON.stringify([normalizeArabicWord(original.arabic), metadataKey(original)]);
      const member = { original, t }, group = groups.get(key);
      if (!group) groups.set(key, { members: [member], keep: member });
      else {
        group.members.push(member);
        // Retain existing natural spacing rather than a concatenated display.
        // No text is invented: the chosen representative is a source record.
        if (/\s/.test(original.arabic.trim()) && !/\s/.test(group.keep.original.arabic.trim())) group.keep = member;
      }
    });
    const headStatus = headword.status ?? 'review';
    if (headword.status !== headStatus || headword.cefr !== null) metadataActions.push({ sourceId: `h${h}`, before: { status: headword.status ?? 'unset', cefr: headword.cefr ?? null }, after: { status: headStatus, cefr: null }, reason: 'Unreviewed headword; no CEFR assignment' });
    const flags: { category: string; reason: string }[] = [];
    if (abbreviationKeys.has(english) || clearAcronyms.has(english)) {
      const category = clearAcronyms.has(english) ? 'clear abbreviation/acronym' : lexicalWords.has(english) ? 'likely normal word' : 'uncertain';
      abbreviations.push({ english, category, inDataset: abbreviationKeys.has(english) });
      flags.push({ category: 'abbreviation', reason: `${category}; abbreviation-source match alone does not establish a nonlexical sense` });
    }
    if (!/^[A-Za-z]+$/.test(english)) flags.push({ category: 'noisy-english', reason: 'Nonalphabetic English headword' });
    if (clearAcronyms.has(english)) flags.push({ category: 'english-acronym', reason: 'Explicit acronym/abbreviation hint; no automatic exclusion' });
    if (personNames.has(english)) flags.push({ category: 'proper-name', reason: 'Known name spelling; lexical senses may also exist' });
    if (placeNames.has(english)) flags.push({ category: 'place-name', reason: 'Known place spelling; inspect the intended sense' });
    if (brandNames.has(english)) flags.push({ category: 'brand-name', reason: 'Known brand/product spelling; lexical senses may also exist' });
    const lineageStart = lineage.length;
    for (const group of groups.values()) {
      const { original, t } = group.keep;
      const id = sourceId(h, t), arabic = original.arabic, grid = normalizeArabicWord(arabic);
      for (const member of group.members) {
        const memberId = sourceId(h, member.t);
        lineage.push({ sourceId: memberId, headwordIndex: h, translationIndex: translations.length, retainedSourceId: id });
        if (memberId !== id) {
          consolidations.push({ sourceId: memberId, retainedSourceId: id, english, removedArabic: member.original.arabic, retainedArabic: arabic, grid, reason: 'Same headword/grid and source metadata; retain an existing spaced display when available, otherwise first display' });
          review.push({ priority: 1, category: 'consolidated-duplicate', english, arabic: member.original.arabic, sourceIds: [memberId, id], reason: 'Consolidated; original display and reference retained in action log' });
        }
      }
      const pair = `${english}|${arabic}`;
      const dialect = dialectEvidence.get(pair), msa = msaEvidence.get(pair);
      const translation: DictionaryTranslation = { ...original,
        status: dialect ? 'rejected' : original.status ?? 'review',
        register: dialect ? 'dialect' : msa ? 'msa' : original.register ?? 'uncertain' };
      translations.push(translation);
      if (original.status !== translation.status || original.register !== translation.register) metadataActions.push({ sourceId: id,
        before: { status: original.status ?? 'unset', register: original.register ?? 'unset' },
        after: { status: translation.status, register: translation.register }, reason: dialect ?? msa ?? 'No verified linguistic evidence; human review required' });
      const add = (priority: 1 | 2 | 3, category: string, reason: string, suggestion?: string) => review.push({ priority, category, english, arabic, sourceIds: [id], reason, ...(suggestion ? { suggestion } : {}) });
      const tokens = arabic.trim().split(/\s+/);
      if (tokens.some((token, i) => i > 0 && token === tokens[i - 1])) add(1, 'repeated-word', 'Immediate repetition may be malformed or intentional; suggestion is NOT applied', tokens.filter((token, i) => i === 0 || token !== tokens[i - 1]).join(' '));
      if (dialect) add(1, 'dialect-rejected', `Relationship-specific dialect evidence: ${dialect}`);
      else if (tokens.some(token => dialectTokens.has(token))) add(1, 'possible-dialect', 'Dialect-like token in an unverified sense; may be a name or transliteration');
      if (!/[\u0621-\u064A]/.test(arabic) || /\[\]|\.{2,}|[“”]/.test(arabic)) add(1, 'possibly-malformed', 'Missing Arabic letters or suspicious editorial/punctuation residue');
      for (const flag of flags) add(2, flag.category, flag.reason);
      if (possibleTransliteration(english, arabic)) add(2, 'transliteration', 'Approximate consonant skeleton match; loanwords and coincidences are valid possibilities');
      if (/[A-Za-z]/.test(arabic)) add(2, 'latin-in-arabic', 'Latin characters in Arabic display');
      if (/[()（）[\]]/.test(arabic)) add(2, 'editorial-note', 'Parenthetical/bracketed text; review before treating as an answer');
      if (grid.length > 13 || english.length > 13) add(3, 'over-13-cells', 'English or derived Arabic answer exceeds maximum grid size; display is preserved');
      add(3, 'translation-review', 'Register/accuracy and direction suitability need human review; preferences left unset');
    }
    const ids = lineage.slice(lineageStart).filter(l => l.sourceId === l.retainedSourceId);
    if (translations.length > 1) review.push({ priority: 3, category: 'multiple-meanings', english, arabic: translations.map(t => t.arabic).join(' | '), sourceIds: ids.map(i => i.sourceId), reason: 'Alternative relationships preserved; choose preferred forms only after sense review' });
    const forms = new Map(translations.map((t, i) => [normalizeArabicWord(t.arabic), i]));
    for (const [form, i] of forms) if (form.startsWith('ال') && forms.has(form.slice(2))) {
      const other = forms.get(form.slice(2))!;
      review.push({ priority: 3, category: 'article-variant', english, arabic: `${translations[other].arabic} | ${translations[i].arabic}`, sourceIds: [ids[other].sourceId, ids[i].sourceId], reason: 'Possible bare/definite article variant; both retained' });
    }
    dictionary.push({ ...headword, status: headStatus, cefr: null, translations });
  });
  // Exact display phrase, not normalized spelling: do not merge cross-headword senses.
  const reverse = new Map<string, { english: string; id: string }[]>();
  for (const l of lineage) if (l.sourceId === l.retainedSourceId) {
    const h = dictionary[l.headwordIndex], arabic = h.translations[l.translationIndex].arabic;
    const refs = reverse.get(arabic) ?? []; refs.push({ english: h.english, id: l.sourceId }); reverse.set(arabic, refs);
  }
  for (const [arabic, refs] of reverse) if (new Set(refs.map(r => r.english)).size > 1) review.push({ priority: 3, category: 'direction-ambiguity', english: [...new Set(refs.map(r => r.english))].join(' | '), arabic, sourceIds: refs.map(r => r.id), reason: 'Shared Arabic clue has multiple English relationships; no preferred direction assigned' });
  return { dictionary, review, consolidations, lineage, metadataActions, abbreviations };
}

export function verifyStage2(source: readonly DictionaryHeadword[], result: ReturnType<typeof cleanupStage2>) {
  const errors: string[] = [], bySource = new Map(result.lineage.map(l => [l.sourceId, l]));
  const duplicates = new Map(result.consolidations.map(c => [c.sourceId, c]));
  const total = source.reduce((n, h) => n + h.translations.length, 0);
  if (result.dictionary.length !== source.length || result.lineage.length !== total || bySource.size !== total) errors.push('Headword/lineage count mismatch');
  const covered = new Set<string>();
  source.forEach((headword, h) => {
    if (result.dictionary[h]?.english !== headword.english) errors.push(`h${h}: headword changed`);
    headword.translations.forEach((original, t) => {
      const id = sourceId(h, t), line = bySource.get(id);
      const target = line && result.dictionary[line.headwordIndex]?.translations[line.translationIndex];
      if (!line || line.headwordIndex !== h || !target || normalizeArabicWord(target.arabic) !== normalizeArabicWord(original.arabic)) { errors.push(`${id}: lost or changed grid relationship`); return; }
      covered.add(`${h}:${line.translationIndex}`);
      if (line.retainedSourceId !== id) {
        const action = duplicates.get(id), retained = bySource.get(line.retainedSourceId);
        const sourceT = Number(line.retainedSourceId.split(':t')[1]);
        const survivor = source[h].translations[sourceT];
        if (!action || !survivor || action.retainedSourceId !== line.retainedSourceId || action.removedArabic !== original.arabic || action.retainedArabic !== target.arabic || !retained || retained.translationIndex !== line.translationIndex || retained.headwordIndex !== h || metadataKey(survivor) !== metadataKey(original)) errors.push(`${id}: unreported or unsafe consolidation`);
      } else if (target.arabic !== original.arabic) errors.push(`${id}: display text changed`);
    });
  });
  if (result.dictionary.reduce((n, h) => n + h.translations.length, 0) !== total - duplicates.size || covered.size !== total - duplicates.size) errors.push('Unexplained added/removed relationship');
  return errors;
}

export function csv(rows: ReviewRow[]) {
  const cell = (s: string) => `"${s.replace(/"/g, '""')}"`;
  return '\uFEFF' + ['priority,category,english,arabic,source_ids,reason,suggestion', ...rows.map(r => [r.priority.toString(), r.category, r.english, r.arabic, r.sourceIds.join(' '), r.reason, r.suggestion ?? ''].map(cell).join(','))].join('\r\n') + '\r\n';
}
