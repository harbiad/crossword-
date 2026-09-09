import { createHash } from 'node:crypto';
import { z } from 'zod';
import type { DictionaryHeadword, DictionaryTranslation } from '../api/_lib/dictionary.ts';
import type { BatchDecision } from './stage3b.ts';
import { qaKey, type QaReview } from './stage3b-qa.ts';

export const METHOD_SEED='batch001-methodology-v2-validation';
export function methodSample(source:readonly DictionaryHeadword[],baseline:BatchDecision[],qa:QaReview[]) {
  const pending=new Set(qa.filter(r=>r.changes.some(c=>!c.applied)).map(qaKey));
  const register=new Set(qa.filter(r=>r.changes.some(c=>c.field==='register')).map(qaKey));
  const records=baseline.map(b=>({headwordIndex:b.headwordIndex,translationIndex:b.translationIndex,english:b.english,translation:source[b.headwordIndex].translations[b.translationIndex],originalDecision:b}));
  type Row=typeof records[number];
  const verbs=new Set('HAVE HAS HAD IS ARE WAS WERE BE BEEN BEING AM WILL WOULD COULD CAN SHOULD SHALL MUST DO DOES DID GET GOT FOUND FIND GO GOING USED USING MADE MAKE SAVE READ SEND GIVE PROVIDED PROVIDE COMPARE NEW YOUR YOU US THEM THEIR HIS HER ITS A AN EACH MANY SECOND FIRST MORE ONE TWO THREE'.split(' '));
  const strata:[string,number,(r:Row)=>boolean][]=[
    ['unapplied-qa',35,r=>pending.has(qaKey(r))],['register-disagreement',24,r=>register.has(qaKey(r))],
    ['verb-inflection',30,r=>!!r.translation.partOfSpeech?.includes('verb')||verbs.has(r.english)],
    ['previous-rejection',30,r=>r.originalDecision.status==='rejected'],
    ['previous-reverse-restriction',60,r=>r.translation.status==='approved'&&r.translation.preferredForArToEn===false],
    ['multiple-sense',10,r=>!!r.translation.sense],['qa-source-counterexample',1,r=>r.english==='SOURCE'&&r.translation.arabic==='مصدر'],
    ['control',10,r=>r.translation.status==='approved'&&r.translation.preferredForArToEn===true],
  ];
  const seen=new Set<string>(),selected:(Row&{stratum:string})[]=[];
  const rank=(name:string,r:Row)=>createHash('sha256').update(`${METHOD_SEED}|${name}|${qaKey(r)}`).digest('hex');
  for(const [name,n,predicate] of strata){
    const pool=records.filter(r=>!seen.has(qaKey(r))&&predicate(r)).sort((a,b)=>rank(name,a).localeCompare(rank(name,b)));
    if(pool.length<n)throw new Error(`Insufficient methodology stratum ${name}`);
    for(const r of pool.slice(0,n)){seen.add(qaKey(r));selected.push({...r,stratum:name});}
  }
  return selected;
}

// An explicit, logged migration of OLD semantics; never infer disallowance from
// preference in production. Approved records lose obsolete synonym vetoes.
// Pending/rejected records retain prior intentional exclusions in allowed fields.
export function migrateDirectionalModel(source:readonly DictionaryHeadword[]) {
  const dictionary:DictionaryHeadword[]=structuredClone([...source]);
  const actions:{sourceId:string;english:string;arabic:string;field:string;before:null;after:boolean;reason:string}[]=[];
  dictionary.forEach((h,i)=>h.translations.forEach((t,j)=>{
    for(const [preferred,allowed] of [['preferredForEnToAr','allowedForEnToAr'],['preferredForArToEn','allowedForArToEn']] as const){
      if(t[preferred]!==false||t[allowed]!==undefined)continue;
      const permit=t.status==='approved'&&t.register==='msa';
      t[allowed]=permit;
      actions.push({sourceId:`${i}:${j}`,english:h.english,arabic:t.arabic,field:allowed,before:null,after:permit,
        reason:permit?'Product-policy migration: valid approved relationship is not excluded by nonpreference/synonym ambiguity. Not a new linguistic approval.':'Preserve earlier intentional exclusion of a nonapproved relationship, independently of preference.'});
    }
  }));
  return {dictionary,actions};
}
const confidence=z.enum(['high','medium','low']);
const fields=['status','register','allowedForEnToAr','allowedForArToEn','preferredForEnToAr','preferredForArToEn','partOfSpeech','sense'] as const;
const metadata=z.object({status:z.enum(['approved','review','rejected']),register:z.enum(['msa','dialect','uncertain']),
  allowedForEnToAr:z.boolean().nullable(),allowedForArToEn:z.boolean().nullable(),preferredForEnToAr:z.boolean().nullable(),preferredForArToEn:z.boolean().nullable(),
  partOfSpeech:z.string().min(1).optional(),sense:z.string().min(1).optional()}).strict();
const decision=z.object({sampleIndex:z.number().int().nonnegative(),sourceId:z.string(),english:z.string(),arabic:z.string(),oldDecision:z.record(z.string(),z.unknown()),revisedDecision:metadata,
 reason:z.string().min(1),confidence,fieldConfidence:z.record(z.string(),confidence),sources:z.array(z.string().url()),reviewer:z.string().min(1)}).strict();
export type MethodReview=z.infer<typeof decision>;
export function applyMethodReview(source:readonly DictionaryHeadword[],sample:ReturnType<typeof methodSample>,input:unknown){
  const reviews=z.array(decision).parse(input);
  if(sample.length!==200||reviews.length!==200)throw new Error('Exactly 200 methodology reviews required');
  const migrated=migrateDirectionalModel(source),dictionary=migrated.dictionary,seen=new Set<string>();
  const changes:{sourceId:string;english:string;arabic:string;field:string;before:unknown;after:unknown;confidence:string;applied:boolean;reason:string}[]=[];
  for(const r of reviews){
    const s=sample[r.sampleIndex];
    if(!s||r.sourceId!==qaKey(s)||seen.has(r.sourceId)||r.english!==s.english||r.arabic!==s.translation.arabic||JSON.stringify(r.oldDecision)!==JSON.stringify(s.translation))throw new Error(`Stale/duplicate/outside method review: ${r.sourceId}`);
    seen.add(r.sourceId);
    const target=r.revisedDecision,t=dictionary[s.headwordIndex].translations[s.translationIndex];
    if(target.register==='uncertain'&&target.status!=='review')throw new Error('Uncertain register requires review');
    if(target.register==='dialect'&&target.status!=='rejected')throw new Error('Dialect must be rejected');
    if(target.status==='approved'&&(target.register!=='msa'||r.confidence!=='high'))throw new Error('Approval requires high-confidence MSA');
    if((target.allowedForEnToAr===true||target.allowedForArToEn===true)&&(target.status!=='approved'||target.register!=='msa'||r.confidence!=='high'))throw new Error('Positive allowance requires verified MSA');
    for(const f of fields){
      if(!(f in target))continue;
      const before=t[f]??null,after=target[f]??null,certainty=r.fieldConfidence[f];
      if(!certainty)throw new Error(`Missing confidence for ${f}`);
      if(before===after)continue;
      const applied=certainty==='high';
      if(applied){if(after===null)delete t[f];else Object.assign(t,{[f]:after});}
      changes.push({sourceId:r.sourceId,english:r.english,arabic:r.arabic,field:f,before,after,confidence:certainty,applied,reason:r.reason});
    }
    validateTranslation(t);
  }
  for(const i of new Set(sample.map(s=>s.headwordIndex))){
    const h=dictionary[i];if(h.status==='rejected')throw new Error('Cannot reopen earlier rejected headword');
    h.status=h.translations.some(t=>t.status==='approved'&&t.register==='msa')?'approved':'review';
  }
  return {dictionary,reviews,migrationActions:migrated.actions,changes};
}
function validateTranslation(t:DictionaryTranslation){
  if(t.status==='approved'&&t.register!=='msa')throw new Error('Approval without MSA');
  for(const [allowed,preferred]of [['allowedForEnToAr','preferredForEnToAr'],['allowedForArToEn','preferredForArToEn']]as const){
    if(t[preferred]===true&&(t[allowed]===false||t.status!=='approved'))throw new Error('Preferred relationship cannot be disallowed or unapproved');
  }
}
