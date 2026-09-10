import { createHash } from 'node:crypto';
import { z } from 'zod';
import type { DictionaryHeadword } from '../api/_lib/dictionary.ts';
import { codeRules,applyBatch002,applyBatch002Qa,relationshipKey,referenceConflict,type Batch002Decision,type Batch002Qa } from './stage3b-batch002.ts';
export { relationshipKey,referenceConflict };
export const POS=['noun','verb','adjective','adverb','preposition','pronoun','conjunction','determiner','interjection','other','uncertain']as const;
const posCodes:Record<string,typeof POS[number]>={n:'noun',v:'verb',j:'adjective',b:'adverb',p:'preposition',q:'pronoun',c:'conjunction',d:'determiner',i:'interjection',t:'other',u:'uncertain'};
export const BATCH003_QA_SEED='stage3b-batch003-pos-sense-qa-v1';
export function selectBatch003(source:readonly DictionaryHeadword[],reference:Map<string,string>,prior:Set<string>,deferred:Record<string,string>){
 return source.flatMap((h,headwordIndex)=>h.status==='review'&&!prior.has(h.english)&&!Object.hasOwn(deferred,h.english)?[{headwordIndex,english:h.english,referenceArabic:reference.get(h.english)??''}]:[])
 .sort((a,b)=>Number(!reference.has(a.english))-Number(!reference.has(b.english))||a.headwordIndex-b.headwordIndex).slice(0,500);
}
export function codeDecision(code:string){
 if(code==='H')return {...codeRules.X,status:'review' as const,reasonCode:'unsuitable-pending-review',reason:'A potentially misleading or malformed relationship remains excluded pending review; a categorical rejection is not sufficiently established.'};
 const rule=codeRules[code as keyof typeof codeRules];if(!rule)throw new Error('No implicit approval/default decision');return rule;
}
export function compileBatch003Notes(source:readonly DictionaryHeadword[],selection:ReturnType<typeof selectBatch003>,text:string,details:Record<string,string>,expectedCount=500){
 const lines=text.split(/\r?\n/).filter(l=>l&&!l.startsWith('#'));if(lines.length!==expectedCount)throw new Error('Expected number of explicit headword reviews required');
 return lines.flatMap((line,n)=>{
  const [english,raw,senseText='']=line.split('|'),s=selection[n],h=source[s.headwordIndex],tokens=raw.trim().split(/\s+/);
  if(english!==s.english||tokens.length!==h.translations.length)throw new Error(`Incomplete relationship review ${english}`);
  const senses=Object.fromEntries(senseText.split(';').filter(Boolean).map(t=>t.trim().split('=')));
  return tokens.map((token,j)=>{
   if(token.length!==2||!posCodes[token[1]])throw new Error('Each relationship requires one controlled POS');
   const rule=codeDecision(token[0]),arabic=h.translations[j].arabic;
   return {headwordIndex:s.headwordIndex,translationIndex:j,english,original:arabic,...rule,partOfSpeech:posCodes[token[1]],...(senses[j]?{sense:senses[j]}:{}),
    reason:`${english} — ${arabic}${senses[j]?` (${senses[j]})`:''}: ${details[`${english}:${j}`]??rule.reason}`,reviewer:'AI-assisted linguistic review' as const,sources:[]};
  });
 });
}
const rejectionCheck=z.object({sourceId:z.string(),english:z.string(),original:z.string(),proposedStatus:z.literal('rejected'),finalStatus:z.enum(['rejected','review']),confidence:z.enum(['high','medium','low']),reason:z.string().min(20)}).strict();
export type RejectionCheck=z.infer<typeof rejectionCheck>;
export function checkRejections(proposals:Batch002Decision[],input:unknown){
 const checks=z.array(rejectionCheck).parse(input),seen=new Set<string>();
 const decisions=structuredClone(proposals);
 for(const r of checks){const d=decisions.find(x=>relationshipKey(x)===r.sourceId);
  if(!d||seen.has(r.sourceId)||d.status!=='rejected'||d.english!==r.english||d.original!==r.original)throw new Error('Stale/duplicate rejection second pass');seen.add(r.sourceId);
  if(r.finalStatus==='rejected'&&r.confidence!=='high')throw new Error('Rejection requires high-confidence second pass');
  if(r.finalStatus==='review')Object.assign(d,codeDecision('H'));
  d.reason+=` Second pass: ${r.reason}`;
 }
 if(proposals.filter(d=>d.status==='rejected').some(d=>!seen.has(relationshipKey(d))))throw new Error('Every proposed rejection requires second-pass evidence');
 return {decisions,checks};
}
function verifyPos(decisions:Batch002Decision[]){for(const d of decisions){z.enum(POS).parse(d.partOfSpeech);if(d.sense&&d.sense.length>60)throw new Error('Sense must be short and discriminative');}}
export function applyBatch003(source:readonly DictionaryHeadword[],selection:ReturnType<typeof selectBatch003>,proposals:Batch002Decision[],checks:unknown,expectedCount=500){
 verifyPos(proposals);const checked=checkRejections(proposals,checks);
 return {...applyBatch002(source,selection,checked.decisions,expectedCount),checks:checked.checks};
}
export function sampleBatch003Qa(decisions:Batch002Decision[],reference:Map<string,string>){
 const byWord=new Map<string,Set<string>>();for(const d of decisions){if(d.partOfSpeech==='uncertain')continue;const set=byWord.get(d.english)??new Set();set.add(d.partOfSpeech);byWord.set(d.english,set);}
 const strata:[string,number,(d:Batch002Decision)=>boolean][]=[
  ['rejected',Math.min(20,decisions.filter(d=>d.status==='rejected').length),d=>d.status==='rejected'],
  ['sense',20,d=>!!d.sense&&d.status==='approved'],['multi-pos',20,d=>(byWord.get(d.english)?.size??0)>1&&d.status==='approved'],
  ['nonpreferred-reverse',15,d=>d.allowedForArToEn===true&&d.preferredForArToEn===false],
  ['review',12,d=>d.status==='review'],['register',8,d=>d.register==='uncertain'],['reference-conflict',8,d=>referenceConflict(d,reference)],
 ];
 const seen=new Set<string>(),sample:(Batch002Decision&{stratum:string})[]=[];
 const rank=(s:string,d:Batch002Decision)=>createHash('sha256').update(`${BATCH003_QA_SEED}|${s}|${relationshipKey(d)}`).digest('hex');
 for(const [name,n,predicate]of strata){const pool=decisions.filter(d=>!seen.has(relationshipKey(d))&&predicate(d)).sort((a,b)=>rank(name,a).localeCompare(rank(name,b)));
  if(pool.length<n)throw new Error(`Insufficient ${name} QA stratum`);for(const d of pool.slice(0,n)){seen.add(relationshipKey(d));sample.push({...d,stratum:name});}
 }
 const remainder=decisions.filter(d=>!seen.has(relationshipKey(d))&&d.status==='approved').sort((a,b)=>rank('pos-control',a).localeCompare(rank('pos-control',b)));
 for(const d of remainder.slice(0,100-sample.length))sample.push({...d,stratum:'pos-control'});
 if(sample.length!==100)throw new Error('QA sample must contain 100');return sample;
}
export function applyBatch003Qa(before:readonly DictionaryHeadword[],sample:ReturnType<typeof sampleBatch003Qa>,reviews:Batch002Qa[],expectedCount=100){
 verifyPos(reviews.map(r=>r.revisedDecision));return applyBatch002Qa(before,sample,reviews,expectedCount);
}
