import {createHash}from'node:crypto';
import type {DictionaryHeadword}from'../api/_lib/dictionary.ts';
import type {Batch002Decision}from'./stage3b-batch002.ts';
import {relationshipKey}from'./stage3b-batch003.ts';
import {compileBatch004QaNotes}from'./stage3b-batch004.ts';
export const BATCH006_QA_SEED='batch006-67-headwords-qa-v1';
export function selectBatch006<T extends {english:string;headwordIndex:number}>(source:readonly DictionaryHeadword[],proposed:T[],words:string[]){
 if(proposed.length!==67||words.length!==67||new Set(words).size!==67||proposed.some((p,i)=>p.english!==words[i]||source[p.headwordIndex]?.english!==p.english||source[p.headwordIndex].status!=='review'))throw Error('Batch006 must use exactly the 67 proposed unresolved headwords');
 return proposed;
}
export function sampleBatch006Qa(decisions:Batch002Decision[]){
 const strata:[string,number,(d:Batch002Decision)=>boolean][]=[
 ['rejected',10,d=>d.status==='rejected'],['register',3,d=>d.register==='uncertain'],['unresolved',5,d=>d.status==='review'],
 ['multiple-meaning',8,d=>['ALIEN','SOLO','BEANS','PRAISE','SHAVED','UTILITIES'].includes(d.english)&&d.status==='approved'],
 ['allowed-nonpreferred',8,d=>d.allowedForArToEn===true&&d.preferredForArToEn===false],
 ['verb-inflection',8,d=>d.partOfSpeech==='verb'&&d.status==='approved'],['approved-reverse',45,d=>d.allowedForArToEn===true]];
 const seen=new Set<string>(),sample:(Batch002Decision&{stratum:string})[]=[];
 for(const [stratum,n,predicate]of strata){const rank=(d:Batch002Decision)=>createHash('sha256').update(`${BATCH006_QA_SEED}|${stratum}|${relationshipKey(d)}`).digest('hex');
 for(const d of decisions.filter(d=>!seen.has(relationshipKey(d))&&predicate(d)).sort((a,b)=>rank(a).localeCompare(rank(b))).slice(0,Math.min(n,45-sample.length))){seen.add(relationshipKey(d));sample.push({...d,stratum});}}
 if(sample.length!==45)throw Error('Exactly 45 QA reviews required');return sample;
}
export function compileBatch006QaNotes(sample:ReturnType<typeof sampleBatch006Qa>,text:string){return compileBatch004QaNotes(sample,text,45).map(r=>({...r,revisedDecision:{...r.revisedDecision,reasonCode:'batch006-qa-fresh-pass'}}));}
