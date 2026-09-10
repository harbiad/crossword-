import {compileBatch004QaNotes} from './stage3b-batch004.ts';
import {createHash} from 'node:crypto';
import type {DictionaryHeadword} from '../api/_lib/dictionary.ts';
import {normalizeArabicWord} from '../api/_lib/dictionary.ts';
import type {Batch002Decision} from './stage3b-batch002.ts';
import {relationshipKey,referenceConflict} from './stage3b-batch002.ts';
export type DomainNeed={id:string;size:number;mode:'ar_to_en'|'en_to_ar';length:number;pattern:string;constraints:{position:number;characters:string[]}[];failedSeeds:number[];templateCount:number;observations:number;zeroEvents:number;matchingApproved:number;matchingAnswers:string[];priority:number;slotDirections?:string[]};
export const gridForm=(s:string)=>normalizeArabicWord(s).replace(/[أإآٱ]/g,'ا');
export function matchesDomain(answer:string,need:Pick<DomainNeed,'length'|'constraints'>){return answer.length===need.length&&[false,true].some(inverted=>need.constraints.every(c=>c.characters.includes(answer[inverted?answer.length-1-c.position:c.position])));}
export function selectBatch005(source:readonly DictionaryHeadword[],reference:Map<string,string>,prior:Set<string>,deferred:Record<string,string>,needs:DomainNeed[]){
 const recurring=needs.filter(n=>n.failedSeeds.length>=2&&n.matchingApproved<=3&&n.constraints.some(c=>c.characters.length>0)&&n.constraints.every(c=>c.characters.length>0));
 return source.flatMap((h,headwordIndex)=>{
  if(h.status!=='review'||prior.has(h.english)||Object.hasOwn(deferred,h.english)||!/^[A-Z]+$/.test(h.english))return [];
  const arabic=[...new Set(h.translations.map(t=>gridForm(t.arabic)))];
  const matched=recurring.filter(n=>h.english.length<=n.size&&(n.mode==='ar_to_en'?matchesDomain(h.english,n):arabic.some(a=>!n.matchingAnswers.includes(a)&&matchesDomain(a,n))));
  const learnerScore=(reference.has(h.english)?100:0)+80/(1+headwordIndex/2000);
  const referenceArabic=reference.get(h.english)??'';
  const qualityPotential=referenceArabic&&arabic.includes(gridForm(referenceArabic))?2:0;
  // A pattern family contributes once per direction/length, preventing near-duplicate traces from dominating.
  const families=new Map<string,number>();
  for(const n of matched){const family=`${n.mode}:${n.length}`,value=(4-n.priority)*Math.log2(1+n.failedSeeds.length)/(1+n.matchingApproved);families.set(family,Math.max(families.get(family)??0,value));}
  const domainScore=Math.min(35,[...families.values()].reduce((a,b)=>a+b,0)*3);
  return [{headwordIndex,english:h.english,referenceArabic,englishLength:h.english.length,arabicLengths:[...new Set(arabic.map(a=>a.length))].sort((a,b)=>a-b),learnerScore,qualityPotential,domainScore,matchedDomainIds:matched.map(n=>n.id),matchedPatterns:[...new Set(matched.map(n=>`${n.size}:${n.mode}:${n.pattern}`))],failedSeedsHelped:[...new Set(matched.flatMap(n=>n.failedSeeds))].sort((a,b)=>a-b),domainFamilies:[...families.keys()],finalSelectionScore:learnerScore+domainScore+qualityPotential}];
 }).sort((a,b)=>b.finalSelectionScore-a.finalSelectionScore||a.headwordIndex-b.headwordIndex).slice(0,500);
}
export const BATCH005_QA_SEED='batch005-current-domains-qa-v1';
export function sampleBatch005Qa(decisions:Batch002Decision[],reference:Map<string,string>,selection:ReturnType<typeof selectBatch005>,needs:DomainNeed[]){
 const byId=new Map(needs.map(n=>[n.id,n])),byWord=new Map(selection.map(s=>[s.english,s]));
 const helps=(d:Batch002Decision,mode:string,sizes:number[])=>byWord.get(d.english)!.matchedDomainIds.some(id=>{const n=byId.get(id)!;return n.mode===mode&&sizes.includes(n.size);});
 const strata:[string,number,(d:Batch002Decision)=>boolean][]=[['rejected',12,d=>d.status==='rejected'],['register',8,d=>d.register==='uncertain'],['reference-conflict',8,d=>referenceConflict(d,reference)],['review',10,d=>d.status==='review'],['english-large-domain',18,d=>d.status==='approved'&&helps(d,'ar_to_en',[11,13])],['arabic-domain',16,d=>d.status==='approved'&&helps(d,'en_to_ar',[9,11,13])],['sense',10,d=>!!d.sense&&d.status==='approved'],['nonpreferred',10,d=>d.allowedForArToEn===true&&d.preferredForArToEn===false],['multiword',6,d=>d.status==='approved'&&/\s/.test(d.original)],['verb',6,d=>d.status==='approved'&&d.partOfSpeech==='verb'],['approved-control',100,d=>d.status==='approved']];
 const seen=new Set<string>(),sample:(Batch002Decision&{stratum:string})[]=[];
 for(const [stratum,n,test]of strata){const rank=(d:Batch002Decision)=>createHash('sha256').update(`${BATCH005_QA_SEED}|${stratum}|${relationshipKey(d)}`).digest('hex');
  for(const d of decisions.filter(d=>!seen.has(relationshipKey(d))&&test(d)).sort((a,b)=>rank(a).localeCompare(rank(b))).slice(0,Math.min(n,100-sample.length))){seen.add(relationshipKey(d));sample.push({...d,stratum});}}
 if(sample.length!==100)throw Error('100 explicit QA cases required');return sample;
}

export function compileBatch005QaNotes(sample:ReturnType<typeof sampleBatch005Qa>,text:string){
 return compileBatch004QaNotes(sample,text).map(r=>({...r,revisedDecision:{...r.revisedDecision,reasonCode:'batch005-qa-independent-pass'}}));
}
