import { z } from 'zod';
import { normalizeArabicWord, type DictionaryHeadword } from '../api/_lib/dictionary.ts';

export function parseReferenceCsv(text: string) {
  const rows: string[][] = []; let row: string[] = [], cell = '', quoted = false;
  text = text.replace(/^\uFEFF/, '');
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') { if (quoted && text[i + 1] === '"') { cell += '"'; i++; } else quoted = !quoted; }
    else if (!quoted && (c === ',' || c === '\n')) { row.push(cell.replace(/\r$/, '')); cell = ''; if (c === '\n') { rows.push(row); row = []; } }
    else cell += c;
  }
  if (cell || row.length) { row.push(cell.replace(/\r$/, '')); rows.push(row); }
  if (quoted || rows[0]?.join(',') !== 'english,arabic') throw new Error('Invalid common-word reference CSV');
  return new Map(rows.slice(1).filter(r => r.length === 2).map(r => [r[0].trim().toUpperCase(), r[1]]));
}

export function selectBatch001(source: readonly DictionaryHeadword[], reference: Map<string, string>, prior: Set<string>, deferred: Set<string>) {
  return source.flatMap((h, headwordIndex) => h.status === 'review' && reference.has(h.english) && !prior.has(h.english) && !deferred.has(h.english)
    ? [{ headwordIndex, english: h.english, referenceArabic: reference.get(h.english)! }] : []).slice(0, 500);
}
const schema = z.object({
  headwordIndex: z.number().int().nonnegative(), translationIndex: z.number().int().nonnegative(),
  english: z.string(), original: z.string().min(1), status: z.enum(['approved','review','rejected']),
  register: z.enum(['msa','dialect','uncertain']), confidence: z.enum(['high','medium','low']),
  reasonCode: z.string().min(1), reason: z.string().min(1), reviewer: z.literal('AI-assisted linguistic review'),
  replacement: z.string().min(1).nullable(), applied: z.boolean(),
  preferredForEnToAr: z.boolean().optional(), preferredForArToEn: z.boolean().optional(),
  directionReason: z.string().min(1).optional(), partOfSpeech: z.string().min(1).optional(), sense: z.string().min(1).optional(),
}).strict();
export type BatchDecision = z.infer<typeof schema>;

export function applyBatch001(source: readonly DictionaryHeadword[], selection: ReturnType<typeof selectBatch001>, manifest: unknown) {
  if (selection.length !== 500 || new Set(selection.map(h => h.headwordIndex)).size !== 500) throw new Error('Batch must contain exactly 500 distinct headwords');
  const decisions = z.array(schema).parse(manifest), selected = new Set(selection.map(h => h.headwordIndex));
  const seen = new Set<string>(), dictionary: DictionaryHeadword[] = structuredClone([...source]);
  const logs = decisions.map(d => {
    const key = `${d.headwordIndex}:${d.translationIndex}`, h = dictionary[d.headwordIndex], old = h?.translations[d.translationIndex];
    if (seen.has(key) || !selected.has(d.headwordIndex) || !old || h.english !== d.english || old.arabic !== d.original) throw new Error(`Duplicate, stale or outside batch: ${key}`);
    seen.add(key);
    if (d.confidence !== 'high' && (d.status !== 'review' || d.applied || d.preferredForEnToAr === true || d.preferredForArToEn === true)) throw new Error(`Uncertain applied decision: ${key}`);
    if ((d.preferredForEnToAr === true || d.preferredForArToEn === true) && (d.status !== 'approved' || d.register !== 'msa')) throw new Error(`Preference without approved MSA: ${key}`);
    if (d.status === 'approved' && d.register !== 'msa') throw new Error(`Approval without MSA: ${key}`);
    if (d.register === 'dialect' && d.status !== 'rejected') throw new Error(`Dialect must be rejected: ${key}`);
    if (old.status === 'rejected' && d.status !== 'rejected') throw new Error(`Prior rejection undone: ${key}`);
    if (d.applied && (!d.replacement || d.replacement === old.arabic || d.status !== 'approved')) throw new Error(`Unsafe correction: ${key}`);
    const updated = { ...old, arabic: d.applied ? d.replacement! : old.arabic, status: d.status, register: d.register };
    for (const field of ['preferredForEnToAr','preferredForArToEn','partOfSpeech','sense'] as const) {
      if (d[field] !== undefined) Object.assign(updated, { [field]: d[field] });
    }
    h.translations[d.translationIndex] = updated;
    return { ...d, sourceId: `stage3a:h${d.headwordIndex}:t${d.translationIndex}`, beforeStatus: old.status, beforeRegister: old.register,
      finalArabic: updated.arabic, beforeGrid: normalizeArabicWord(old.arabic), afterGrid: normalizeArabicWord(updated.arabic) };
  });
  for (const {headwordIndex, english} of selection) {
    const h = dictionary[headwordIndex];
    if (h.english !== english || h.translations.some((_, j) => !seen.has(`${headwordIndex}:${j}`))) throw new Error(`Incomplete headword review: ${english}`);
    // All selected headwords are general vocabulary; bad translations alone never reject a headword.
    h.status = h.translations.some(t => t.status === 'approved' && t.register === 'msa') ? 'approved' : 'review';
  }
  return { dictionary, decisions: logs };
}
