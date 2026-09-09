import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { describe,it,expect } from 'vitest';
import { DICTIONARY_STAGE3B_METHOD as source } from '../../api/_lib/dictionary.stage3b.methodology.generated';
import { DICTIONARY_BATCH002 as initial } from '../../api/_lib/dictionary.stage3b.batch002.generated';
import { DICTIONARY_BATCH002_QA as final } from '../../api/_lib/dictionary.stage3b.batch002.qa.generated';
import { normalizeArabicWord,buildReverseIndex,eligibleTranslation,type DictionaryHeadword } from '../../api/_lib/dictionary';
import { createCandidateIndex } from '../../api/_lib/candidates';
import { parseReferenceCsv } from '../../scripts/stage3b';
import { selectBatch002,compileBatch002Notes,applyBatch002,sampleBatch002Qa,applyBatch002Qa,relationshipKey,type Batch002Qa,type Batch002Decision } from '../../scripts/stage3b-batch002';
const dir='dictionary/stage3b/batch002/';
const read=(p:string)=>readFileSync(p,'utf8');
const json=(p:string)=>JSON.parse(read(p));
const reference=parseReferenceCsv(read('api/english_arabic_10000_v3.csv'));
const prior=new Set(['dictionary/stage3a/decisions.json','dictionary/stage3b/batch001/decisions.json'].flatMap(f=>(json(f) as {english:string}[]).map(d=>d.english)));
const selection=selectBatch002(source,reference,prior,json(dir+'deferred.json'));
const decisions=json(dir+'decisions.json') as Batch002Decision[];
const sample=sampleBatch002Qa(decisions,reference);
const reviews=json(dir+'qa/reviews.json') as Batch002Qa[];
const summary=json(dir+'summary.json');
it('selects exactly 500 new unresolved headwords by reference then frequency order, without revisiting earlier reviews',()=>{
 expect(selection).toEqual(json(dir+'selection.json'));expect(selection).toHaveLength(500);
 expect(new Set(selection.map(s=>s.english)).size).toBe(500);
 expect(selection.every(s=>!prior.has(s.english)&&source[s.headwordIndex].status==='review'&&reference.has(s.english))).toBe(true);
 expect(selection.map(s=>s.headwordIndex)).toEqual(selection.map(s=>s.headwordIndex).sort((a,b)=>a-b));
 expect(selection[0].english).toBe('SELL');expect(selection.at(-1)?.english).toBe('MIDDLE');
 for(const [p,hash]of Object.entries(json(dir+'inputs.json')))expect(createHash('sha256').update(read(p)).digest('hex')).toBe(hash);
});
it('requires all 1543 explicit decisions and reproduces the separate original and QA layers',()=>{
 expect(compileBatch002Notes(source,selection,read(dir+'review-notes.txt'),json(dir+'review-details.json'))).toEqual(decisions);
 expect(decisions).toHaveLength(1543);
 expect(applyBatch002(source,selection,decisions).dictionary).toEqual(initial);
 expect(applyBatch002Qa(initial,sample,reviews).dictionary).toEqual(final);
});
it('preserves every relationship, Arabic display, grid form, CEFR value and out-of-batch headword',()=>{
 const selected=new Set(selection.map(s=>s.headwordIndex));
 expect(final).toHaveLength(16018);expect(final.flatMap(h=>h.translations)).toHaveLength(29467);
 let losses=0;
 for(let i=0;i<source.length;i++){
  const before=source[i],after=final[i];expect(after.english).toBe(before.english);expect(after.cefr).toEqual(before.cefr);
  if(!selected.has(i)){expect(after).toEqual(before);continue;}
  expect(after.translations.length).toBe(before.translations.length);
  before.translations.forEach((t,j)=>{const next=after.translations[j];if(!next||next.arabic!==t.arabic)losses++;expect(next.arabic).toBe(t.arabic);expect(normalizeArabicWord(next.arabic)).toBe(normalizeArabicWord(t.arabic));});
 }
 expect(losses).toBe(0);expect(buildReverseIndex(final)).toEqual(buildReverseIndex(source));
 const dataset=(english:string)=>final.find(h=>h.english===english)!;
 expect(dataset('PASSWORD').translations[0].arabic).toBe('كلمة السر');
 expect(dataset('SHARE').translations.length).toBeGreaterThan(1);
 expect(final.every(h=>h.cefr==null)).toBe(true);
});
it('samples 100 relationships with all required strata, at least 30 approved, multiple words, forms and register decisions',()=>{
 expect(sample).toEqual(json(dir+'qa/sample.json'));expect(sample).toHaveLength(100);
 expect(new Set(sample.map(relationshipKey)).size).toBe(100);
 expect(sample.filter(d=>d.status==='approved').length).toBeGreaterThanOrEqual(30);
 for(const key of ['rejected','review','reference-conflict','reverse-restricted','allowed-not-preferred','multiple-sense','verb-inflection','multiword','dialect'])expect(sample.some(s=>s.stratum===key)).toBe(true);
 expect(sample.filter(s=>/\s/.test(s.original)).length).toBeGreaterThanOrEqual(7);
});
it('logs every QA disagreement and applies only high-confidence changes without reopening unresolved exclusions',()=>{
 const result=applyBatch002Qa(initial,sample,reviews);
 expect(result.disagreements).toHaveLength(23);expect(result.disagreements.filter(d=>d.applied)).toHaveLength(17);
 expect(result.disagreements.filter(d=>!d.applied)).toHaveLength(6);
 for(const r of reviews){const before=initial[r.originalDecision.headwordIndex].translations[r.originalDecision.translationIndex];
  const after=final[r.originalDecision.headwordIndex].translations[r.originalDecision.translationIndex];
  if(r.confidence!=='high')expect(after).toEqual(before);
 }
 const girls=final.find(h=>h.english==='GIRLS')!.translations[3];
 expect(girls).toMatchObject({status:'review',allowedForEnToAr:false,allowedForArToEn:false,arabic:'لبنات'});
 expect(summary.qa.agreements.allowedForArToEn.percent).toBe(100);
 expect(summary.qa.agreements.status.percent).toBe(97);
 expect(summary.qa.agreements.sense.total).toBe(25);
});
for(const mode of ['en_to_ar','ar_to_en']as const){
 it(`excludes rejected relationships and retains valid nonpreferred alternatives in ${mode}`,()=>{
  const reviewed=decisions.map(d=>({h:final[d.headwordIndex],t:final[d.headwordIndex].translations[d.translationIndex]}));
  for(const {h,t}of reviewed){if(t.status==='rejected'||t.register==='dialect')expect(eligibleTranslation(h,t,'compatibility',mode)).toBe(false);
   const allowed=mode==='en_to_ar'?t.allowedForEnToAr:t.allowedForArToEn;
   if(t.status==='approved'&&t.register==='msa'&&allowed===true)expect(eligibleTranslation(h,t,'approved-only',mode)).toBe(true);
  }
  // Isolate individual records so candidate deduplication or another clue cannot mask exclusion.
  const data:DictionaryHeadword[]=[{english:'REJECT',status:'approved',translations:[{arabic:'مرفوض',status:'rejected',register:'msa'}]},
   {english:'THREAD',status:'approved',translations:[{arabic:'خيط',status:'approved',register:'msa',allowedForEnToAr:true,allowedForArToEn:true,preferredForEnToAr:false,preferredForArToEn:false}]},
   {english:'STRING',status:'approved',translations:[{arabic:'خيط',status:'approved',register:'msa',allowedForEnToAr:true,allowedForArToEn:true,preferredForEnToAr:false,preferredForArToEn:false}]}];
  const pairs=[...createCandidateIndex(data,'approved-only').get(`13:${mode}:advanced`)!.values()].flat(2);
  expect(pairs.some(p=>p.answer==='REJECT'||p.clue==='REJECT')).toBe(false);
  if(mode==='ar_to_en')expect(pairs.map(p=>p.answer)).toEqual(expect.arrayContaining(['THREAD','STRING']));
  else expect(pairs.some(p=>p.answer==='خيط')).toBe(true);
 });
}
it('keeps allowance independent between directions and preserves multiword display in the actual index',()=>{
 const h:DictionaryHeadword={english:'PROPERLY',status:'approved',translations:[{arabic:'بشكل صحيح',status:'approved',register:'msa',allowedForEnToAr:true,allowedForArToEn:false,preferredForEnToAr:false,preferredForArToEn:false}]};
 let index=createCandidateIndex([h],'approved-only');
 const pairs=(mode:string)=>[...index.get(`13:${mode}:advanced`)!.values()].flat(2);
 expect(pairs('en_to_ar')).toContainEqual({answer:'بشكلصحيح',clue:'PROPERLY'});expect(pairs('ar_to_en')).toHaveLength(0);
 h.translations[0].allowedForEnToAr=false;h.translations[0].allowedForArToEn=true;
 index=createCandidateIndex([h],'approved-only');
 expect(pairs('en_to_ar')).toHaveLength(0);expect(pairs('ar_to_en')).toContainEqual({answer:'PROPERLY',clue:'بشكل صحيح'});
 expect(normalizeArabicWord('من أجل')).toBe('منأجل');
});
it('reports actual candidate availability for both modes and all sizes without enabling strict production',()=>{
 for(const policy of ['compatibility','approved-only']as const){const index=createCandidateIndex(final,policy);
  for(const size of [7,9,11,13])for(const mode of ['en_to_ar','ar_to_en']){
   const row=summary.availabilityAfter.find((r:{policy:string;size:number;mode:string})=>r.policy===policy&&r.size===size&&r.mode===mode);
   expect(row.indexedCandidates).toBe([...index.get(`${size}:${mode}:advanced`)!.values()].flat(2).length);
  }
 }
 expect(read('api/generate.ts')).toContain("createCandidateIndex(DICTIONARY_BATCH003_QA, 'compatibility')");
 expect(summary.batchAfterQa.relationshipStatus).toEqual({approved:1235,review:295,rejected:13});
});
describe('manifest safeguards',()=>{
 it.each(['missing','duplicate','outside','stale','approval','preference','text','cefr'] as const)('rejects %s initial manifest',kind=>{
  const bad=structuredClone(decisions) as unknown as Record<string,unknown>[];
  if(kind==='missing')bad.pop();if(kind==='duplicate')bad.push({...bad[0]});if(kind==='outside')bad[0].headwordIndex=0;
  if(kind==='stale')bad[0].original='changed';if(kind==='approval')bad[0].confidence='medium';
  if(kind==='preference')bad[0].allowedForArToEn=false;if(kind==='text')bad[0].replacement='جديد';if(kind==='cefr')bad[0].cefr='A1';
  expect(()=>applyBatch002(source,selection,bad)).toThrow();
 });
 it.each(['missing','duplicate','outside','text','unsupported'] as const)('rejects %s QA manifest',kind=>{
  const bad=structuredClone(reviews);
  if(kind==='missing')bad.pop();if(kind==='duplicate')bad[1]=structuredClone(bad[0]);if(kind==='outside')bad[0].sourceId='0:0';
  if(kind==='text')bad[0].revisedDecision.original='changed';if(kind==='unsupported')bad[0].revisedDecision.allowedForArToEn=true;
  expect(()=>applyBatch002Qa(initial,sample,bad)).toThrow();
 });
});
