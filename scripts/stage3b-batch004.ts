import { codeDecision } from './stage3b-batch003.ts';
import { createHash } from 'node:crypto';
import { normalizeArabicWord, type DictionaryHeadword } from '../api/_lib/dictionary.ts';
import { relationshipKey, referenceConflict, type Batch002Decision } from './stage3b-batch002.ts';
export type DiagnosticPattern={mode:string;pattern:string};
export const BATCH004_QA_SEED='batch004-coverage-qa-v1';
const grid=(s:string)=>normalizeArabicWord(s).replace(/[أإآٱ]/g,'ا');
export function matchesPattern(answer:string,pattern:string){
 if(answer.length!==pattern.length)return false;
 return [false,true].some(inverted=>[...pattern].every((c,i)=>c==='?'||c===answer[inverted?answer.length-1-i:i]));
}
export function selectBatch004(source:readonly DictionaryHeadword[],reference:Map<string,string>,prior:Set<string>,deferred:Record<string,string>,patterns:DiagnosticPattern[]){
 return source.flatMap((h,headwordIndex)=>{
  if(h.status!=='review'||prior.has(h.english)||Object.hasOwn(deferred,h.english)||!/^[A-Z]+$/.test(h.english))return [];
  const englishLength=h.english.length,arabic=h.translations.map(t=>grid(t.arabic)),arabicLengths=[...new Set(arabic.map(a=>a.length))].sort((a,b)=>a-b);
  const englishPatterns=patterns.filter(p=>p.mode==='ar_to_en'&&matchesPattern(h.english,p.pattern)).map(p=>p.pattern);
  const arabicPatterns=patterns.filter(p=>p.mode==='en_to_ar'&&arabic.some(a=>matchesPattern(a,p.pattern))).map(p=>p.pattern);
  const referenceScore=reference.has(h.english)?100:0,orderScore=80*(1-headwordIndex/source.length);
  // Bounded bonuses: never a quota, never evidence for approval. English length 2 has no bonus.
  const englishLengthScore=englishLength===3?18:[7,9,11,13].includes(englishLength)?10:0;
  const arabicLengthScore=arabicLengths.some(n=>n>=2&&n<=4)?8:0;
  const patternScore=Math.min(12,englishPatterns.length*3)+Math.min(6,arabicPatterns.length*2);
  const diagnosticGapScore=englishLengthScore+arabicLengthScore+patternScore;
  return [{headwordIndex,english:h.english,referenceArabic:reference.get(h.english)??'',referenceScore,orderScore,englishLength,arabicLengths,englishLengthScore,arabicLengthScore,englishPatterns,arabicPatterns,diagnosticGapScore,finalSelectionScore:referenceScore+orderScore+diagnosticGapScore}];
 }).sort((a,b)=>b.finalSelectionScore-a.finalSelectionScore||a.headwordIndex-b.headwordIndex).slice(0,500);
}
export function sampleBatch004Qa(decisions:Batch002Decision[],reference:Map<string,string>,selection:ReturnType<typeof selectBatch004>){
 const coverage=new Set(selection.filter(s=>s.englishPatterns.length||s.arabicPatterns.length||s.englishLength===3).map(s=>s.english));
 const strata:[string,number,(d:Batch002Decision)=>boolean][]=[
 ['rejected',12,d=>d.status==='rejected'],['reference-conflict',8,d=>referenceConflict(d,reference)],
 ['register-review',8,d=>d.register==='uncertain'],['review',10,d=>d.status==='review'],
 ['coverage-approved-reverse',20,d=>d.allowedForArToEn===true&&coverage.has(d.english)],
 ['allowed-nonpreferred-reverse',12,d=>d.allowedForArToEn===true&&d.preferredForArToEn===false],
 ['sense',10,d=>!!d.sense&&d.status==='approved'],['multiword',8,d=>/\s/.test(d.original)&&d.status==='approved'],
 ['verb',6,d=>d.partOfSpeech==='verb'&&d.status==='approved'],['approved-control',100,d=>d.status==='approved']];
 const seen=new Set<string>(),sample:(Batch002Decision&{stratum:string})[]=[];
 for(const [stratum,n,predicate]of strata){
  const rank=(d:Batch002Decision)=>createHash('sha256').update(`${BATCH004_QA_SEED}|${stratum}|${relationshipKey(d)}`).digest('hex');
  const pool=decisions.filter(d=>!seen.has(relationshipKey(d))&&predicate(d)).sort((a,b)=>rank(a).localeCompare(rank(b)));
  for(const d of pool.slice(0,Math.min(n,100-sample.length))){seen.add(relationshipKey(d));sample.push({...d,stratum});}
 }
 if(sample.length!==100)throw new Error('100 QA rows required');return sample;
}

// Every QA row is authored explicitly before comparing with the first-pass metadata.
export function compileBatch004QaNotes(sample:ReturnType<typeof sampleBatch004Qa>,text:string,expectedCount=100){
 const pos:Record<string,string>={n:'noun',v:'verb',j:'adjective',b:'adverb',p:'preposition',q:'pronoun',c:'conjunction',d:'determiner',i:'interjection',t:'other',u:'uncertain'};
 const lines=text.trim().split(/\r?\n/);if(lines.length!==expectedCount)throw new Error('Expected number of fresh QA verdicts required');
 return lines.map((line,i)=>{
  const [n,token,sense,reason]=line.split('|');if(Number(n)!==i+1||!reason||token.length!==2||!pos[token[1]])throw new Error('Incomplete fresh QA verdict');
  const {stratum,...originalDecision}=sample[i];void stratum;
  const revisedDecision={...originalDecision,...codeDecision(token[0]),partOfSpeech:pos[token[1]],reasonCode:'batch004-qa-independent-pass',reason};
  delete revisedDecision.sense;if(sense)revisedDecision.sense=sense;
  return {sourceId:relationshipKey(sample[i]),originalDecision,revisedDecision,reason,confidence:'high' as const};
 });
}

export function extractBatch004Patterns(runs:{experiment:string;policy:string;mode:string;patterns:{pattern:string;prefixCounts:{remaining:number}[]}[]}[]):DiagnosticPattern[]{
 const unique=new Map<string,DiagnosticPattern>();
 for(const run of runs)if(run.experiment==='baseline'&&run.policy==='approved-only')for(const p of run.patterns)if(p.prefixCounts.at(-1)?.remaining===0)unique.set(`${run.mode}\0${p.pattern}`,{mode:run.mode,pattern:p.pattern});
 return [...unique].sort(([a],[b])=>a<b?-1:a>b?1:0).map(([,p])=>p);
}
