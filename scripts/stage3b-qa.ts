import { createHash } from 'node:crypto';
import { z } from 'zod';
import type { DictionaryHeadword } from '../api/_lib/dictionary.ts';
import type { BatchDecision } from './stage3b.ts';

export const QA_SEED = 'stage3b-batch001-qa-v1';
export const qaKey = (d: {headwordIndex:number;translationIndex:number}) => `${d.headwordIndex}:${d.translationIndex}`;
export function sampleBatchQa(decisions: BatchDecision[], conflicts: Set<string>) {
  const strata: [string,number,(d:BatchDecision)=>boolean][] = [
    ['approved',40,d=>d.status==='approved'],['rejected',20,d=>d.status==='rejected'],['review',20,d=>d.status==='review'],
    ['reverse-restricted',30,d=>d.status==='approved'&&d.preferredForArToEn===false],['reverse-preferred',10,d=>d.preferredForArToEn===true],
    ['sense',10,d=>d.sense!==undefined],['reference-conflict',10,d=>conflicts.has(qaKey(d))],
    ['multiword',5,d=>d.original.trim().includes(' ')],['function-verb-adverb',5,d=>['verb','preposition','conjunction','pronoun'].some(p=>d.partOfSpeech?.includes(p))],
  ];
  const picked = new Set<string>(), rows: (BatchDecision & {sampleStratum:string})[] = [];
  const rank=(name:string,d:BatchDecision)=>createHash('sha256').update(`${QA_SEED}|${name}|${qaKey(d)}`).digest('hex');
  for(const [name,n,predicate] of strata) {
    const pool=decisions.filter(d=>!picked.has(qaKey(d))&&predicate(d)).sort((a,b)=>rank(name,a).localeCompare(rank(name,b)));
    if(pool.length<n)throw new Error(`Insufficient QA stratum: ${name}`);
    for(const d of pool.slice(0,n)){picked.add(qaKey(d));rows.push({...d,sampleStratum:name});}
  }
  return rows;
}
const category=z.enum(['minor metadata issue','preferred-direction issue','semantic translation issue','register issue','POS/sense issue','serious approval/rejection error']);
const change=z.object({field:z.enum(['status','register','preferredForEnToAr','preferredForArToEn','partOfSpeech','sense']),before:z.union([z.string(),z.boolean(),z.null()]),after:z.union([z.string(),z.boolean(),z.null()]),category,confidence:z.enum(['high','medium','low']),reason:z.string().min(1),applied:z.boolean()}).strict();
const review=z.object({
  sampleIndex:z.number().int().nonnegative(),headwordIndex:z.number().int().nonnegative(),translationIndex:z.number().int().nonnegative(),english:z.string(),arabic:z.string(),
  headwordSuitability:z.literal('suitable general vocabulary'),semanticAssessment:z.string().min(1),naturalDisplayAssessment:z.string().min(1),
  qaStatus:z.enum(['approved','review','rejected']),qaRegister:z.enum(['msa','dialect','uncertain']),
  statusAgreement:z.boolean(),registerAgreement:z.boolean(),posAgreement:z.boolean().nullable(),senseAgreement:z.boolean().nullable(),
  enPreferenceAgreement:z.boolean().nullable(),arPreferenceAgreement:z.boolean().nullable(),
  reverseClassification:z.enum(['clearly justified','probably justified','probably too restrictive','clearly too restrictive']).nullable(),reverseRestrictionAgreement:z.boolean().nullable(),
  reason:z.string().min(1),reviewer:z.string().min(1),sources:z.array(z.string().url()),changes:z.array(change),
}).strict();
export type QaReview=z.infer<typeof review>;
export function applyBatchQa(source: readonly DictionaryHeadword[], sample: ReturnType<typeof sampleBatchQa>, input:unknown) {
  const reviews=z.array(review).parse(input);
  if(sample.length!==150||reviews.length!==150)throw new Error('QA must cover exactly 150 relationships');
  const dictionary:DictionaryHeadword[]=structuredClone([...source]),seen=new Set<string>();
  for(const r of reviews) {
    const b=sample[r.sampleIndex],key=qaKey(r);
    if(!b||qaKey(b)!==key||seen.has(key)||b.english!==r.english||b.original!==r.arabic)throw new Error(`Stale/duplicate/outside QA: ${key}`);
    seen.add(key);
    const h=dictionary[r.headwordIndex],t=h?.translations[r.translationIndex];
    if(!t||h.english!==r.english||t.arabic!==r.arabic)throw new Error(`Source mismatch: ${key}`);
    if(r.statusAgreement!==(b.status===r.qaStatus)||r.registerAgreement!==(b.register===r.qaRegister))throw new Error(`Invalid agreement: ${key}`);
    const restricted=b.status==='approved'&&b.preferredForArToEn===false;
    if(restricted!==(r.reverseClassification!==null)||r.reverseRestrictionAgreement!==(restricted?r.reverseClassification!.endsWith('justified'):null))throw new Error(`Invalid reverse assessment: ${key}`);
    const fields=new Set<string>(),proposal:Record<string,unknown>={...b};
    for(const c of r.changes) {
      if(fields.has(c.field)||JSON.stringify(t[c.field]??null)!==JSON.stringify(c.before)||c.before===c.after)throw new Error(`Stale/duplicate correction: ${key}:${c.field}`);
      fields.add(c.field);proposal[c.field]=c.after;
      if(c.applied&&c.confidence!=='high')throw new Error(`Uncertain correction applied: ${key}`);
      if(c.field==='status')z.enum(['approved','review','rejected']).parse(c.after);
      else if(c.field==='register')z.enum(['msa','dialect','uncertain']).parse(c.after);
      else if(c.field.startsWith('preferred'))z.boolean().nullable().parse(c.after);
      else z.string().min(1).nullable().parse(c.after);
      if(c.applied) { if(c.after===null)delete t[c.field];else Object.assign(t,{[c.field]:c.after}); }
    }
    for (const [field, agreement] of [['partOfSpeech',r.posAgreement],['sense',r.senseAgreement]] as const) {
      const expected=b[field]===undefined?null:!r.changes.some(c=>c.field===field);
      if(agreement!==expected)throw new Error(`Unlogged POS/sense disagreement: ${key}`);
    }
    if(proposal.status!==r.qaStatus||proposal.register!==r.qaRegister)throw new Error(`Unlogged judgment: ${key}`);
    if(t.status==='approved'&&t.register!=='msa')throw new Error(`Approval without MSA: ${key}`);
    if((t.preferredForEnToAr===true||t.preferredForArToEn===true)&&t.status!=='approved')throw new Error(`Preference without approval: ${key}`);
  }
  // Recompute only affected headwords; never reject a headword for a bad translation.
  for(const i of new Set(reviews.filter(r=>r.changes.some(c=>c.applied)).map(r=>r.headwordIndex))) {
    const h=dictionary[i];if(h.status==='rejected')throw new Error('Earlier rejected headword cannot be reopened');
    h.status=h.translations.some(t=>t.status==='approved'&&t.register==='msa')?'approved':'review';
  }
  return {dictionary,reviews};
}
