import { expect,it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { DICTIONARY_STAGE3B_QA as before } from '../../api/_lib/dictionary.stage3b.qa.generated';
import { DICTIONARY_STAGE3B_METHOD as after } from '../../api/_lib/dictionary.stage3b.methodology.generated';
import { methodSample,applyMethodReview,migrateDirectionalModel,type MethodReview } from '../../scripts/stage3b-methodology';
import { qaKey,type QaReview } from '../../scripts/stage3b-qa';
import type { BatchDecision } from '../../scripts/stage3b';
import { eligibleTranslation,normalizeArabicWord,buildReverseIndex,type DictionaryHeadword } from '../../api/_lib/dictionary';
import { createCandidateIndex } from '../../api/_lib/candidates';
const read=(p:string)=>readFileSync(`dictionary/stage3b/batch001/${p}`,'utf8');
const baseline=JSON.parse(read('decisions.json')) as BatchDecision[],qa=JSON.parse(read('qa/reviews.json')) as QaReview[];
const sample=methodSample(before,baseline,qa),reviews=JSON.parse(read('methodology/reviews.json')) as MethodReview[];
const result=applyMethodReview(before,sample,reviews);

it('reproduces the pinned 200-row sample and includes every unapplied QA proposal without new headwords',()=>{
 expect(sample).toEqual(JSON.parse(read('methodology/sample.json')));expect(sample).toHaveLength(200);
 const keys=new Set(sample.map(qaKey)),batchKeys=new Set(baseline.map(qaKey));
 expect(keys.size).toBe(200);expect(sample.every(s=>batchKeys.has(qaKey(s)))).toBe(true);
 for(const r of qa.filter(r=>r.changes.some(c=>!c.applied)))expect(keys.has(qaKey(r))).toBe(true);
 const selection=JSON.parse(read('methodology/selection.json'));
 expect(selection.proposalsSha256).toBe(createHash('sha256').update(read('methodology/proposals.json')).digest('hex'));
 for(const stratum of selection.strata)expect(sample.filter(s=>s.stratum===stratum.name)).toHaveLength(stratum.count);
});

it('preserves every display, grid form, relationship, CEFR value and unsampled linguistic decision',()=>{
 expect(result.dictionary).toEqual(after);
 const selected=new Set(sample.map(qaKey)),batchKeys=new Set(baseline.map(qaKey));
 expect(result.migrationActions.every(a=>batchKeys.has(a.sourceId))).toBe(true);
 const migrated=migrateDirectionalModel(before).dictionary;
 let total=0;
 before.forEach((h,i)=>{
  expect(after[i].english).toBe(h.english);expect(after[i].cefr).toBe(h.cefr);expect(after[i].translations).toHaveLength(h.translations.length);
  h.translations.forEach((t,j)=>{
   total++;const next=after[i].translations[j];
   expect(next.arabic).toBe(t.arabic);expect(normalizeArabicWord(next.arabic)).toBe(normalizeArabicWord(t.arabic));
   if(!selected.has(`${i}:${j}`))expect(next).toEqual(migrated[i].translations[j]);
  });
 });
 expect(total).toBe(29467);expect(buildReverseIndex(before)).toEqual(buildReverseIndex(after));
 expect(result.changes.filter(c=>c.applied).every(c=>c.confidence==='high')).toBe(true);
});

it.each(['en_to_ar','ar_to_en'] as const)('keeps allowed and preferred independent in %s, including false preference and same-length synonyms',mode=>{
 const dict:DictionaryHeadword[]=[
  {english:'THREAD',status:'approved',translations:[{arabic:'خيط',status:'approved',register:'msa',allowedForEnToAr:true,allowedForArToEn:true,preferredForEnToAr:false,preferredForArToEn:false}]},
  {english:'STRING',status:'approved',translations:[{arabic:'خيط',status:'approved',register:'msa',allowedForEnToAr:true,allowedForArToEn:true}]},
 ];
 const index=createCandidateIndex(dict,'approved-only');
 const pairs=[...index.get(`7:${mode}:advanced`)!.values()].flat(2);
 expect(pairs).toHaveLength(2);
 expect(pairs).toContainEqual(mode==='en_to_ar'?{answer:'خيط',clue:'THREAD'}:{answer:'THREAD',clue:'خيط'});
 expect(eligibleTranslation(dict[0],dict[0].translations[0],'approved-only',mode)).toBe(true);
});

it('uses allowed=false only for its direction while preferences rank without removing alternatives',()=>{
 const h:DictionaryHeadword={english:'BOOK',status:'approved',translations:[
  {arabic:'كتاب',status:'approved',register:'msa',preferredForArToEn:false,allowedForArToEn:true},
  {arabic:'الكتاب',status:'approved',register:'msa',preferredForArToEn:true,allowedForArToEn:true,allowedForEnToAr:false},
 ]};
 const index=createCandidateIndex([h]);
 expect([...index.get('7:ar_to_en:advanced')!.values()].flat(2)).toEqual([{answer:'BOOK',clue:'الكتاب'}]);
 expect([...index.get('7:en_to_ar:advanced')!.values()].flat(2)).toEqual([{answer:'كتاب',clue:'BOOK'}]);
 for(const status of ['rejected','review'] as const){
  const t={...h.translations[0],status,register:status==='rejected'?'msa' as const:'uncertain' as const};
  expect(eligibleTranslation(h,t,'approved-only','ar_to_en')).toBe(false);
  if(status==='rejected')expect(eligibleTranslation(h,t,'compatibility','ar_to_en')).toBe(false);
 }
});

it('restores legitimate inflection/masdar mappings, keeps unknown register in review and preserves genuine exclusions',()=>{
 const t=(en:string,ar:string)=>after.find(h=>h.english===en)!.translations.find(t=>t.arabic===ar)!;
 for(const [en,ar]of [['USED','استخدمت'],['FOUND','وجدت'],['MAKE','صنع'],['READ','قراءة'],['SECOND','ثانيا'],['TAX','ضرائب'],['SALES','البيع']])
  expect(t(en,ar)).toMatchObject({status:'approved',register:'msa',allowedForArToEn:true,allowedForEnToAr:true});
 expect(t('SOURCE','مصدر')).toMatchObject({allowedForArToEn:true,preferredForArToEn:false});
 expect(t('LONG','لونغ')).toMatchObject({status:'review',register:'uncertain',allowedForArToEn:false,allowedForEnToAr:false});
 expect(t('WILL','راح')).toMatchObject({status:'rejected',register:'dialect',allowedForArToEn:false});
 expect(t('SET','تعيين')).toMatchObject({partOfSpeech:'verb'});
});

it.each(['missing','duplicate','stale','new-headword','uncertain-approval','uncertain-register','preferred-disallowed','missing-confidence'])('rejects invalid %s methodology review',kind=>{
 const changed=structuredClone(reviews),first=changed[0];
 if(kind==='missing')changed.pop();
 if(kind==='duplicate')changed[1]=first;
 if(kind==='stale')first.arabic='wrong';
 if(kind==='new-headword')first.sourceId='16017:0';
 if(kind==='uncertain-approval')first.confidence='medium';
 if(kind==='uncertain-register')first.revisedDecision.register='uncertain';
 if(kind==='preferred-disallowed'){first.revisedDecision.allowedForArToEn=false;first.revisedDecision.preferredForArToEn=true;}
 if(kind==='missing-confidence')delete first.fieldConfidence.allowedForArToEn;
 expect(()=>applyMethodReview(before,sample,changed)).toThrow();
});

it('audits proposal/review agreement honestly rather than calling it independent human accuracy',()=>{
 const report=JSON.parse(read('methodology/summary.json'));
 expect(report.revisedArProposalAgreement).toEqual({agree:178,total:200,percent:89});
 expect(report.formerlyRestrictedArAgreement).toEqual({agree:107,total:107,percent:100});
 expect(report.metricInterpretation).toContain('Not independent-human');
 expect(report.textChanges).toBe(0);expect(report.cefrAssignments).toBe(0);
 expect(report.arVetoTransitionsAllBatch001).toEqual({removed:673,retained:74,added:0});
 expect(readFileSync('api/generate.ts','utf8')).toContain("createCandidateIndex(DICTIONARY_STAGE3B_METHOD, 'compatibility')");
});
