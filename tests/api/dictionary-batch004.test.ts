import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { it,expect } from 'vitest';
import { DICTIONARY_BATCH003_QA as source } from '../../api/_lib/dictionary.stage3b.batch003.qa.generated';
import { DICTIONARY_BATCH004 as initial } from '../../api/_lib/dictionary.stage3b.batch004.generated';
import { DICTIONARY_BATCH004_QA as final } from '../../api/_lib/dictionary.stage3b.batch004.qa.generated';
import { normalizeArabicWord,eligibleTranslation,buildReverseIndex,type DictionaryHeadword } from '../../api/_lib/dictionary';
import { createCandidateIndex } from '../../api/_lib/candidates';
import { parseReferenceCsv } from '../../scripts/stage3b';
import { compileBatch003Notes,applyBatch003,applyBatch003Qa,relationshipKey,POS,type RejectionCheck } from '../../scripts/stage3b-batch003';
import { extractBatch004Patterns,selectBatch004,sampleBatch004Qa,matchesPattern,compileBatch004QaNotes } from '../../scripts/stage3b-batch004';
import type { Batch002Decision,Batch002Qa } from '../../scripts/stage3b-batch002';
const root='dictionary/stage3b/batch004/';
const read=(p:string)=>readFileSync(p,'utf8'),json=(p:string)=>JSON.parse(read(p));
const priorFiles=['dictionary/stage3a/decisions.json',...[1,2,3].map(n=>`dictionary/stage3b/batch00${n}/decisions.json`)];
const prior=new Set(priorFiles.flatMap(f=>(json(f)as {english:string}[]).map(d=>d.english)));
const reference=parseReferenceCsv(read('api/english_arabic_10000_v3.csv'));
const selection=selectBatch004(source,reference,prior,json(root+'deferred.json'),json(root+'diagnostic_patterns.json'));
const proposals=json(root+'proposals.json')as Batch002Decision[],checks=json(root+'rejection_checks.json')as RejectionCheck[];
const decisions=json(root+'decisions.json')as Batch002Decision[],sample=sampleBatch004Qa(decisions,reference,selection),reviews=json(root+'qa/reviews.json')as Batch002Qa[];
const summary=json(root+'summary.json');
it('reproduces 500 new common headwords using bounded diagnostic bonuses rather than quotas or alphabetic order',()=>{
 expect(extractBatch004Patterns(json('generator_failure_analysis/diagnostic_runs.json'))).toEqual(json(root+'diagnostic_patterns.json'));
 expect(selection).toEqual(json(root+'selection.json'));expect(selection).toHaveLength(500);
 expect(new Set(selection.map(s=>s.english)).size).toBe(500);
 expect(selection.every(s=>!prior.has(s.english)&&reference.has(s.english)&&source[s.headwordIndex].status==='review')).toBe(true);
 expect(selection[0].english).toBe('ICE');expect(selection.filter(s=>s.englishLength===3)).toHaveLength(58);
 expect(selection.map(s=>s.headwordIndex)).not.toEqual(selection.map(s=>s.headwordIndex).sort((a,b)=>a-b));
 for(const [file,hash]of Object.entries(json(root+'inputs.json')))expect(createHash('sha256').update(read(file)).digest('hex')).toBe(hash);
});
it('matches constrained patterns in either orientation without modifying canonical answers',()=>{
 expect(matchesPattern('EAT','EA?')).toBe(true);expect(matchesPattern('TEA','EA?')).toBe(false);
 expect(matchesPattern('TEA','AE?')).toBe(true);expect(matchesPattern('EAT','E??T')).toBe(false);
 expect(matchesPattern('جليد','?لي?')).toBe(true);expect(matchesPattern('جليد','?يل?')).toBe(true);
});
it('replays all 1307 explicit judgments, mandatory rejection second passes, and the separate QA layer',()=>{
 expect(proposals).toHaveLength(1307);
 expect(compileBatch003Notes(source,selection,read(root+'review-notes.txt'),json(root+'review-details.json'))).toEqual(proposals);
 const replay=applyBatch003(source,selection,proposals,checks);expect(replay.decisions).toEqual(decisions);expect(replay.dictionary).toEqual(initial);
 expect(checks).toHaveLength(7);expect(checks.filter(c=>c.finalStatus==='rejected')).toHaveLength(6);
 expect(compileBatch004QaNotes(sample,read(root+'qa/review-notes.txt'))).toEqual(reviews);
 expect(applyBatch003Qa(initial,sample,reviews).dictionary).toEqual(final);
});
it('preserves every relationship, exact Arabic display, normalization, CEFR, reverse links and all prior work',()=>{
 const selected=new Set(selection.map(s=>s.headwordIndex));expect(final).toHaveLength(16018);expect(final.flatMap(h=>h.translations)).toHaveLength(29467);
 source.forEach((h,i)=>{const next=final[i];expect(next.english).toBe(h.english);expect(next.cefr).toEqual(h.cefr);expect(next.translations).toHaveLength(h.translations.length);
  if(!selected.has(i))expect(next).toEqual(h);
  else h.translations.forEach((t,j)=>{expect(next.translations[j].arabic).toBe(t.arabic);expect(normalizeArabicWord(next.translations[j].arabic)).toBe(normalizeArabicWord(t.arabic));});
 });
 expect(buildReverseIndex(final)).toEqual(buildReverseIndex(source));expect(final.every(h=>h.cefr==null)).toBe(true);
 expect(final.find(h=>h.english==='EAT')!.translations[4].arabic).toBe('تناول الطعام');
 expect(final.find(h=>h.english==='ANNIVERSARY')!.translations[1].arabic).toBe('الذكرى السنوية');
 expect(final.flatMap(h=>h.translations).filter(t=>t.status==='approved')).toHaveLength(4628);
});
it('keeps controlled relationship-specific POS and meaningful distinct senses',()=>{
 for(const d of decisions){expect(POS).toContain(d.partOfSpeech);if(d.sense)expect(d.sense.length).toBeLessThanOrEqual(60);}
 const h=(word:string)=>final.find(h=>h.english===word)!;
 expect(h('FLY').translations.map(t=>t.partOfSpeech)).toEqual(['noun','verb']);
 expect(h('CORRECT').translations.map(t=>t.partOfSpeech)).toEqual(['verb','adjective']);
 expect(h('RESERVATION').translations[0].sense).not.toBe(h('RESERVATION').translations[1].sense);
 expect(h('RESERVATION').translations[0].sense).toBe(h('RESERVATION').translations[2].sense);
 expect(h('PATIENT').translations[1].partOfSpeech).toBe('noun');expect(h('PATIENT').translations[3].partOfSpeech).toBe('adjective');
});
it('reproduces targeted QA and logs every changed field without overwriting the initial decisions',()=>{
 expect(sample).toEqual(json(root+'qa/sample.json'));expect(sample).toHaveLength(100);expect(new Set(sample.map(relationshipKey)).size).toBe(100);
 for(const d of decisions.filter(d=>d.status==='rejected'))expect(sample.some(s=>relationshipKey(s)===relationshipKey(d))).toBe(true);
 for(const stratum of ['coverage-approved-reverse','allowed-nonpreferred-reverse','sense','multiword','verb','review','register-review','reference-conflict'])expect(sample.some(s=>s.stratum===stratum)).toBe(true);
 const result=applyBatch003Qa(initial,sample,reviews);expect(result.disagreements).toHaveLength(12);
 expect(new Set(result.disagreements.map(d=>d.sourceId)).size).toBe(4);
 expect(summary.qa.agreements.status.percent).toBe(98);expect(summary.qa.agreements.sense).toEqual({agree:14,total:16,percent:87.5});
 const hits=(data:DictionaryHeadword[])=>data.find(h=>h.english==='HITS')!.translations[2];
 expect(hits(initial).status).toBe('approved');expect(hits(final).status).toBe('review');
 const lowerConfidence=structuredClone(reviews);lowerConfidence.find(r=>r.originalDecision.english==='HITS'&&r.originalDecision.translationIndex===2)!.confidence='medium';
 expect(hits(applyBatch003Qa(initial,sample,lowerConfidence).dictionary)).toEqual(hits(initial));
});
for(const mode of ['en_to_ar','ar_to_en']as const)it(`keeps nonpreferred approvals available and all rejections excluded in ${mode}`,()=>{
 for(const h of final)for(const t of h.translations){
  if(t.status==='rejected'||t.register==='dialect')expect(eligibleTranslation(h,t,'compatibility',mode)).toBe(false);
  if(t.status==='approved'&&t.register==='msa'&&(mode==='en_to_ar'?t.allowedForEnToAr:t.allowedForArToEn)===true)expect(eligibleTranslation(h,t,'approved-only',mode)).toBe(h.status==='approved');
 }
 const nonpreferred=final.find(h=>h.english==='AMATEUR')!;
 expect(nonpreferred.translations[1]).toMatchObject({status:'approved',preferredForArToEn:false,allowedForArToEn:true});
 expect(eligibleTranslation(nonpreferred,nonpreferred.translations[1],'approved-only',mode)).toBe(true);
 const data:DictionaryHeadword[]=[{english:'BOOKING',status:'approved',translations:final.find(h=>h.english==='BOOKING')!.translations}];
 const pairs=[...createCandidateIndex(data,'compatibility').get(`13:${mode}:advanced`)!.values()].flat(2);
 expect(pairs.some(p=>p.answer==='جز'||p.clue==='جز')).toBe(false);
});
it('keeps many-to-many, display spacing and allowance independent from direction preference',()=>{
 const data:DictionaryHeadword[]=['PROPERLY','CORRECTLY'].map(english=>({english,status:'approved',translations:[{arabic:'بشكل صحيح',status:'approved',register:'msa',allowedForEnToAr:true,allowedForArToEn:true,preferredForEnToAr:false,preferredForArToEn:false}]}));
 const pairs=(mode:string)=>[...createCandidateIndex(data,'approved-only').get(`13:${mode}:advanced`)!.values()].flat(2);
 expect(pairs('ar_to_en')).toEqual(expect.arrayContaining([{answer:'PROPERLY',clue:'بشكل صحيح'},{answer:'CORRECTLY',clue:'بشكل صحيح'}]));
 expect(pairs('en_to_ar')).toContainEqual({answer:'بشكلصحيح',clue:'PROPERLY'});
 data[0].translations[0].allowedForArToEn=false;expect(pairs('ar_to_en').some(p=>p.answer==='PROPERLY')).toBe(false);expect(pairs('en_to_ar')).toContainEqual({answer:'بشكلصحيح',clue:'PROPERLY'});
});
it('reports both policies and all sizes with compatibility still explicitly enabled',()=>{
 for(const policy of ['compatibility','approved-only']as const){const index=createCandidateIndex(final,policy);
  for(const mode of ['en_to_ar','ar_to_en'])for(const size of [7,9,11,13])expect(summary.availabilityAfter.find((r:{policy:string;mode:string;size:number})=>r.policy===policy&&r.mode===mode&&r.size===size).indexedCandidates).toBe([...index.get(`${size}:${mode}:advanced`)!.values()].flat(2).length);
 }
 expect(read('api/generate.ts')).toMatch(/createCandidateIndex\(DICTIONARY_BATCH\d+_QA, 'compatibility'\)/);expect(summary.batch005Started).toBe(false);
 const h=final.find(h=>h.english==='BROTHER')!,t=h.translations[0];expect(t.status).toBe('review');expect(eligibleTranslation(h,t,'approved-only','ar_to_en')).toBe(false);expect(eligibleTranslation(h,t,'compatibility','ar_to_en')).toBe(true);
});
