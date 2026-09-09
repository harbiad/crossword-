import { z } from 'zod';
import { normalizeArabicWord, type DictionaryHeadword } from '../api/_lib/dictionary.ts';
import type { cleanupStage2 } from './stage2.ts';

export const stage3Categories = new Set(['repeated-word','possibly-malformed','editorial-note','abbreviation','proper-name','place-name','brand-name','dialect-rejected','possible-dialect']);
export function stage3Scope(stage2: ReturnType<typeof cleanupStage2>) {
  const scope = new Map<string, string[]>();
  for (const row of stage2.review) if (stage3Categories.has(row.category)) {
    for (const id of row.sourceIds) {
      const categories = scope.get(id) ?? [];
      if (!categories.includes(row.category)) categories.push(row.category);
      scope.set(id, categories);
    }
  }
  return scope;
}
const decisionSchema = z.object({
  sourceId: z.string(), english: z.string(), original: z.string().min(1), categories: z.array(z.string()),
  status: z.enum(['approved','review','rejected']), register: z.enum(['msa','dialect','uncertain']),
  confidence: z.enum(['high','medium','low']), reasonCode: z.string().min(1), reason: z.string().min(1),
  proposedReplacement: z.string().min(1).nullable(), applied: z.boolean(), reviewer: z.literal('AI-assisted linguistic review'),
  sources: z.array(z.string()), repetitionAssessment: z.string().optional(),
}).strict();
export type Stage3Decision = z.infer<typeof decisionSchema>;

export function applyStage3a(stage2: ReturnType<typeof cleanupStage2>, input: unknown) {
  const decisions = z.array(decisionSchema).parse(input);
  const scope = stage3Scope(stage2), seen = new Set<string>();
  const coordinates = new Map(stage2.lineage.filter(l => l.sourceId === l.retainedSourceId).map(l => [l.sourceId, l]));
  const dictionary: DictionaryHeadword[] = structuredClone(stage2.dictionary);
  const logs = decisions.map(d => {
    if (seen.has(d.sourceId) || !scope.has(d.sourceId)) throw new Error(`Duplicate/out-of-scope decision ${d.sourceId}`);
    seen.add(d.sourceId);
    const position = coordinates.get(d.sourceId);
    if (!position) throw new Error(`Missing source relationship ${d.sourceId}`);
    const headword = dictionary[position.headwordIndex], original = headword.translations[position.translationIndex];
    if (headword.english !== d.english || original.arabic !== d.original) throw new Error(`Stale decision ${d.sourceId}`);
    if (JSON.stringify([...d.categories].sort()) !== JSON.stringify([...scope.get(d.sourceId)!].sort())) throw new Error(`Category mismatch ${d.sourceId}`);
    if (d.confidence !== 'high' && (d.status !== 'review' || d.applied)) throw new Error(`Uncertain decision applied/approved/rejected: ${d.sourceId}`);
    if (d.applied && (d.proposedReplacement === null || d.proposedReplacement === d.original || d.status !== 'approved' || d.register !== 'msa')) throw new Error(`Invalid correction ${d.sourceId}`);
    if (d.status === 'approved' && d.register !== 'msa') throw new Error(`Approval without MSA ${d.sourceId}`);
    if (original.status === 'rejected' && d.status !== 'rejected') throw new Error(`Stage 2 rejection undone: ${d.sourceId}`);
    const updated = { ...original, arabic: d.applied ? d.proposedReplacement! : original.arabic, status: d.status, register: d.register };
    headword.translations[position.translationIndex] = updated;
    return { ...d, headwordIndex: position.headwordIndex, translationIndex: position.translationIndex,
      beforeStatus: original.status, beforeRegister: original.register, finalArabic: updated.arabic,
      beforeGrid: normalizeArabicWord(original.arabic), afterGrid: normalizeArabicWord(updated.arabic),
      metadataChanged: original.status !== updated.status || original.register !== updated.register };
  });
  if (seen.size !== scope.size) throw new Error(`Incomplete review: ${seen.size}/${scope.size}`);
  // Headword status can change only when EVERY relationship was explicitly
  // reviewed. Bad translation alone does not mean the English word is invalid.
  const byHeadword = new Map<number, typeof logs>();
  for (const log of logs) { const list = byHeadword.get(log.headwordIndex) ?? []; list.push(log); byHeadword.set(log.headwordIndex, list); }
  const excludedReasons = new Set(['personal-or-geographic-name','personal-name','geographic-name','brand-product','abbreviation-initialism']);
  const headwordActions: { english: string; headwordIndex: number; before: string; after: string; reason: string }[] = [];
  for (const [h, list] of byHeadword) {
    const headword = dictionary[h];
    if (list.length !== headword.translations.length || list.some(d => d.confidence !== 'high')) continue;
    const status = list.every(d => d.status === 'approved') ? 'approved'
      : list.every(d => d.status === 'rejected' && excludedReasons.has(d.reasonCode)) ? 'rejected' : headword.status;
    if (status !== headword.status) {
      headwordActions.push({ english: headword.english, headwordIndex: h, before: headword.status ?? 'unset', after: status!, reason: status === 'approved' ? 'All relationships individually reviewed and approved as MSA' : 'All relationships individually identified as out-of-pool proper-name/abbreviation senses' });
      headword.status = status;
    }
  }
  return { dictionary, decisions: logs, headwordActions };
}

export function reviewCsv(rows: Record<string, unknown>[]) {
  if (!rows.length) return '\uFEFF';
  const keys = [...new Set(rows.flatMap(r => Object.keys(r)))];
  const quote = (value: unknown) => {
    const s = value === null || value === undefined ? '' : typeof value === 'object' ? JSON.stringify(value) : String(value);
    return `"${s.replace(/"/g, '""')}"`;
  };
  return '\uFEFF' + [keys.map(quote).join(','), ...rows.map(r => keys.map(k => quote(r[k])).join(','))].join('\r\n') + '\r\n';
}
