import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { z } from 'zod';
import { normalizeArabicWord, type DictionaryHeadword, type DictionaryTranslation } from '../api/_lib/dictionary.ts';

export const BATCH002_SEED = 'stage3b-batch002-qa-v1';
export function selectBatch002(source: readonly DictionaryHeadword[], reference: Map<string,string>, prior: Set<string>, deferred: Record<string,string>) {
  // Reference presence is ranking evidence only, never linguistic approval.
  return source.flatMap((h,headwordIndex)=>h.status==='review'&&!prior.has(h.english)&&!Object.hasOwn(deferred,h.english)
    ? [{headwordIndex,english:h.english,referenceArabic:reference.get(h.english)??''}] : [])
    .sort((a,b)=>Number(!reference.has(a.english))-Number(!reference.has(b.english))||a.headwordIndex-b.headwordIndex).slice(0,500);
}
export const codeRules = {
  P: {status:'approved',register:'msa',confidence:'high',allowedForEnToAr:true,allowedForArToEn:true,preferredForEnToAr:true,preferredForArToEn:true,reasonCode:'natural-preferred',reason:'Natural learner-facing equivalent for this English sense; preferred in both directions. Valid synonyms remain allowed.'},
  A: {status:'approved',register:'msa',confidence:'high',allowedForEnToAr:true,allowedForArToEn:true,preferredForEnToAr:false,preferredForArToEn:false,reasonCode:'valid-alternative',reason:'Valid natural MSA equivalent or grammatical/article variant. Allowed in both directions; nonpreference is not exclusion.'},
  E: {status:'approved',register:'msa',confidence:'high',allowedForEnToAr:true,allowedForArToEn:true,preferredForEnToAr:true,preferredForArToEn:false,reasonCode:'preferred-forward',reason:'Natural preferred Arabic rendering; reverse remains valid but nonpreferred.'},
  C: {status:'review',register:'msa',confidence:'medium',allowedForEnToAr:null,allowedForArToEn:null,preferredForEnToAr:null,preferredForArToEn:null,reasonCode:'construction-or-sense-review',reason:'Arabic is recognizable MSA, but this isolated relationship needs a supported construction/sense before approval; morphology alone is not rejection.'},
  O: {status:'review',register:'msa',confidence:'medium',allowedForEnToAr:null,allowedForArToEn:null,preferredForEnToAr:null,preferredForArToEn:null,reasonCode:'orthography-review',reason:'Recognizable MSA expression with a spelling/hamza/letter or editorial defect. Preserve the original text and defer repair; not classified as dialect for spelling alone.'},
  R: {status:'review',register:'uncertain',confidence:'medium',allowedForEnToAr:null,allowedForArToEn:null,preferredForEnToAr:null,preferredForArToEn:null,reasonCode:'register-review',reason:'Register or status of this borrowing/form needs evidence. Neither automatic dialect rejection nor unsupported MSA approval.'},
  U: {status:'review',register:'uncertain',confidence:'high',allowedForEnToAr:false,allowedForArToEn:false,preferredForEnToAr:false,preferredForArToEn:false,reasonCode:'unsuitable-unclassified',reason:'This rendering does not supply a natural learner equivalent of the English sense. Both directions withheld; register is unresolved so status remains review.'},
  X: {status:'rejected',register:'msa',confidence:'high',allowedForEnToAr:false,allowedForArToEn:false,preferredForEnToAr:false,preferredForArToEn:false,reasonCode:'wrong-or-corrupt-relationship',reason:'The Arabic relationship is semantically wrong or demonstrably corrupted, rather than a valid alternative. Exclude both directions and preserve the source record.'},
  D: {status:'rejected',register:'dialect',confidence:'high',allowedForEnToAr:false,allowedForArToEn:false,preferredForEnToAr:false,preferredForArToEn:false,reasonCode:'dialect',reason:'This expression in the intended English sense is dialectal, not approved MSA. Exclude both directions without rewriting it.'},
} as const;
const nullableFlag=z.boolean().nullable();
export const batch002DecisionSchema=z.object({
  headwordIndex:z.number().int().nonnegative(),translationIndex:z.number().int().nonnegative(),english:z.string(),original:z.string().min(1),
  status:z.enum(['approved','review','rejected']),register:z.enum(['msa','dialect','uncertain']),confidence:z.enum(['high','medium','low']),
  allowedForEnToAr:nullableFlag,allowedForArToEn:nullableFlag,preferredForEnToAr:nullableFlag,preferredForArToEn:nullableFlag,
  partOfSpeech:z.string().min(1),sense:z.string().min(1).optional(),reasonCode:z.string().min(1),reason:z.string().min(1),
  reviewer:z.literal('AI-assisted linguistic review'),sources:z.array(z.string().url()),
}).strict();
export type Batch002Decision=z.infer<typeof batch002DecisionSchema>;
export const relationshipKey=(r:{headwordIndex:number;translationIndex:number})=>`${r.headwordIndex}:${r.translationIndex}`;
export function validateBatch002Decision(d:Batch002Decision) {
  if(d.status==='approved'&&(d.confidence!=='high'||d.register!=='msa'))throw new Error('Approval requires high-confidence MSA');
  if(d.status==='rejected'&&d.confidence!=='high')throw new Error('Rejection requires high confidence');
  if(d.register==='uncertain'&&d.status!=='review')throw new Error('Uncertain register requires review');
  if(d.register==='dialect'&&d.status!=='rejected')throw new Error('Dialect requires rejection');
  for(const [allowed,preferred]of [['allowedForEnToAr','preferredForEnToAr'],['allowedForArToEn','preferredForArToEn']]as const){
    if(d[allowed]===true&&(d.status!=='approved'||d.register!=='msa'||d.confidence!=='high'))throw new Error('Unsupported positive allowance');
    if(d[preferred]===true&&d[allowed]!==true)throw new Error('Preference requires allowance');
    if((d.status==='rejected'||d.register==='dialect')&&d[allowed]!==false)throw new Error('Rejection must explicitly exclude both directions');
  }
}
export function translationForDecision(old:DictionaryTranslation,d:Batch002Decision) {
  const t={...old,status:d.status,register:d.register,partOfSpeech:d.partOfSpeech};
  for(const f of ['allowedForEnToAr','allowedForArToEn','preferredForEnToAr','preferredForArToEn']as const){if(d[f]===null)delete t[f];else t[f]=d[f];}
  if(d.sense)t.sense=d.sense;else delete t.sense;
  return t;
}
export function applyBatch002(source:readonly DictionaryHeadword[],selection:ReturnType<typeof selectBatch002>,input:unknown,expectedCount=500){
  if(selection.length!==expectedCount||new Set(selection.map(s=>s.headwordIndex)).size!==expectedCount)throw new Error('Expected number of distinct new headwords required');
  const decisions=z.array(batch002DecisionSchema).parse(input),dictionary:DictionaryHeadword[]=structuredClone([...source]),selected=new Set(selection.map(s=>s.headwordIndex)),seen=new Set<string>();
  for(const d of decisions){
    const h=dictionary[d.headwordIndex],old=h?.translations[d.translationIndex],key=relationshipKey(d);
    if(!selected.has(d.headwordIndex)||seen.has(key)||!old||h.english!==d.english||old.arabic!==d.original)throw new Error(`Stale/duplicate/outside batch ${key}`);
    if(source[d.headwordIndex].status!=='review')throw new Error('Previously resolved headword selected');
    if(old.status==='rejected'&&d.status!=='rejected')throw new Error('Prior rejection cannot be undone');
    validateBatch002Decision(d);seen.add(key);h.translations[d.translationIndex]=translationForDecision(old,d);
  }
  for(const s of selection){const h=dictionary[s.headwordIndex];
    if(h.english!==s.english||h.translations.some((_,j)=>!seen.has(`${s.headwordIndex}:${j}`)))throw new Error('Incomplete headword review');
    h.status=h.translations.some(t=>t.status==='approved'&&t.register==='msa')?'approved':'review';
  }
  return {dictionary,decisions};
}
export function compileBatch002Notes(source:readonly DictionaryHeadword[],selection:ReturnType<typeof selectBatch002>,text:string,details:Record<string,string>) {
  const lines=text.split(/\r?\n/).filter(l=>l&&!l.startsWith('#'));
  if(lines.length!==500)throw new Error('Exactly 500 explicitly authored note rows required');
  return lines.flatMap((line,n)=>{
    const [english,rawCodes,partOfSpeech,senseText='']=line.split('|'),s=selection[n],h=source[s.headwordIndex],codes=rawCodes.replace(/\s/g,'');
    if(english!==s.english||codes.length!==h.translations.length)throw new Error(`Explicit notes do not cover ${english}`);
    const senses=Object.fromEntries(senseText.split(';').filter(Boolean).map(x=>x.trim().split('=')));
    return h.translations.map((t,j)=>{
      const rule=codeRules[codes[j] as keyof typeof codeRules];if(!rule)throw new Error('No default linguistic decision permitted');
      const key=`${english}:${j}`;
      return {headwordIndex:s.headwordIndex,translationIndex:j,english,original:t.arabic,...rule,partOfSpeech,...(senses[j]?{sense:senses[j]}:{}),
        reason:`${english} — ${t.arabic}${senses[j]?` (${senses[j]})`:''}: ${details[key]??rule.reason}`,
        reviewer:'AI-assisted linguistic review' as const,sources:[]};
    });
  });
}
export function referenceConflict(d:Batch002Decision,reference:Map<string,string>){
  const ref=reference.get(d.english);return !!ref&&d.status!=='approved'&&normalizeArabicWord(ref)===normalizeArabicWord(d.original);
}
export function sampleBatch002Qa(decisions:Batch002Decision[],reference:Map<string,string>){
 const strata:[string,number,(d:Batch002Decision)=>boolean][]=[
  ['dialect',3,d=>d.register==='dialect'],['rejected',12,d=>d.status==='rejected'],['review',12,d=>d.status==='review'],
  ['reference-conflict',8,d=>referenceConflict(d,reference)],['reverse-restricted',8,d=>d.allowedForArToEn===false],
  ['allowed-not-preferred',15,d=>d.allowedForArToEn===true&&d.preferredForArToEn===false],['multiple-sense',8,d=>!!d.sense&&d.status==='approved'],
  ['verb-inflection',10,d=>d.partOfSpeech.includes('verb')&&d.status==='approved'],['multiword',7,d=>/\s/.test(d.original)&&d.status==='approved'],['approved-control',17,d=>d.status==='approved'],
 ];
 const seen=new Set<string>(),selected:(Batch002Decision&{stratum:string})[]=[];
 const rank=(s:string,d:Batch002Decision)=>createHash('sha256').update(`${BATCH002_SEED}|${s}|${relationshipKey(d)}`).digest('hex');
 for(const [name,n,predicate]of strata){const pool=decisions.filter(d=>!seen.has(relationshipKey(d))&&predicate(d)).sort((a,b)=>rank(name,a).localeCompare(rank(name,b)));
  if(pool.length<n)throw new Error(`Insufficient QA stratum ${name}: ${pool.length}/${n}`);
  for(const d of pool.slice(0,n)){seen.add(relationshipKey(d));selected.push({...d,stratum:name});}
 }return selected;
}
export const qaFields=['status','register','allowedForEnToAr','allowedForArToEn','preferredForEnToAr','preferredForArToEn','partOfSpeech','sense']as const;
const qaSchema=z.object({sourceId:z.string(),originalDecision:batch002DecisionSchema,revisedDecision:batch002DecisionSchema,reason:z.string().min(1),confidence:z.enum(['high','medium','low'])}).strict();
export type Batch002Qa=z.infer<typeof qaSchema>;
export function applyBatch002Qa(before:readonly DictionaryHeadword[],sample:ReturnType<typeof sampleBatch002Qa>,input:unknown,expectedCount=100){
 const reviews=z.array(qaSchema).parse(input);if(sample.length!==expectedCount||reviews.length!==expectedCount)throw new Error('Expected number of QA reviews required');
 const dictionary:DictionaryHeadword[]=structuredClone([...before]),seen=new Set<string>();
 const disagreements:{sourceId:string;english:string;arabic:string;field:string;before:unknown;after:unknown;reason:string;confidence:string;applied:boolean}[]=[];
 for(const r of reviews){
  const s=sample.find(d=>relationshipKey(d)===r.sourceId);if(!s||seen.has(r.sourceId))throw new Error('QA outside/duplicate sample');seen.add(r.sourceId);
  const {stratum,...original}=s;void stratum;
  if(!isDeepStrictEqual(original,r.originalDecision))throw new Error('Stale original QA decision');
  const d=r.revisedDecision;
  if(relationshipKey(d)!==r.sourceId||d.english!==s.english||d.original!==s.original)throw new Error('QA identity/text change');
  validateBatch002Decision(d);
  for(const field of qaFields){const old=s[field]??null,next=d[field]??null;if(old!==next)disagreements.push({sourceId:r.sourceId,english:s.english,arabic:s.original,field,before:old,after:next,reason:r.reason,confidence:r.confidence,applied:r.confidence==='high'});}
  if(r.confidence==='high')dictionary[d.headwordIndex].translations[d.translationIndex]=translationForDecision(dictionary[d.headwordIndex].translations[d.translationIndex],d);
 }
 for(const i of new Set(sample.map(s=>s.headwordIndex))){const h=dictionary[i];h.status=h.translations.some(t=>t.status==='approved'&&t.register==='msa')?'approved':'review';}
 return {dictionary,reviews,disagreements};
}
