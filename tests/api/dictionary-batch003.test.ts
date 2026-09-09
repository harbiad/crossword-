import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { it,expect } from 'vitest';
import { DICTIONARY_BATCH002_QA as source } from '../../api/_lib/dictionary.stage3b.batch002.qa.generated';
import { DICTIONARY_BATCH003 as initial } from '../../api/_lib/dictionary.stage3b.batch003.generated';
import { DICTIONARY_BATCH003_QA as final } from '../../api/_lib/dictionary.stage3b.batch003.qa.generated';
import { normalizeArabicWord,eligibleTranslation,buildReverseIndex,type DictionaryHeadword } from '../../api/_lib/dictionary';
import { createCandidateIndex } from '../../api/_lib/candidates';
import { parseReferenceCsv } from '../../scripts/stage3b';
import { selectBatch003,compileBatch003Notes,applyBatch003,sampleBatch003Qa,applyBatch003Qa,checkRejections,relationshipKey,POS,type RejectionCheck } from '../../scripts/stage3b-batch003';
import type { Batch002Decision,Batch002Qa } from '../../scripts/stage3b-batch002';
const root='dictionary/stage3b/batch003/';
const read=(p:string)=>readFileSync(p,'utf8'),json=(p:string)=>JSON.parse(read(p));
const priorFiles=['dictionary/stage3a/decisions.json','dictionary/stage3b/batch001/decisions.json','dictionary/stage3b/batch002/decisions.json'];
const prior=new Set(priorFiles.flatMap(f=>(json(f)as {english:string}[]).map(d=>d.english)));
const reference=parseReferenceCsv(read('api/english_arabic_10000_v3.csv'));
const selection=selectBatch003(source,reference,prior,json(root+'deferred.json'));
const proposals=json(root+'proposals.json')as Batch002Decision[],checks=json(root+'rejection_checks.json')as RejectionCheck[];
const decisions=json(root+'decisions.json')as Batch002Decision[],sample=sampleBatch003Qa(decisions,reference),reviews=json(root+'qa/reviews.json')as Batch002Qa[];
const summary=json(root+'summary.json');
it('selects 500 new unresolved reference headwords without repeating any previous linguistic batch',()=>{
 expect(selection).toHaveLength(500);expect(selection).toEqual(json(root+'selection.json'));expect(new Set(selection.map(s=>s.english)).size).toBe(500);
 expect(selection.every(s=>!prior.has(s.english)&&reference.has(s.english)&&source[s.headwordIndex].status==='review')).toBe(true);
 expect(selection.map(s=>s.headwordIndex)).toEqual(selection.map(s=>s.headwordIndex).sort((a,b)=>a-b));
 expect(selection[0].english).toBe('MOVE');expect(selection.at(-1)?.english).toBe('TRANSPORT');
 for(const [file,hash]of Object.entries(json(root+'inputs.json')))expect(createHash('sha256').update(read(file)).digest('hex')).toBe(hash);
});
it('replays every relationship note, every rejection check, the frozen original and separate QA layer',()=>{
 expect(proposals).toHaveLength(1418);
 expect(compileBatch003Notes(source,selection,read(root+'review-notes.txt'),json(root+'review-details.json'))).toEqual(proposals);
 const replay=applyBatch003(source,selection,proposals,checks);expect(replay.decisions).toEqual(decisions);expect(replay.dictionary).toEqual(initial);
 expect(applyBatch003Qa(initial,sample,reviews).dictionary).toEqual(final);
 expect(checks).toHaveLength(6);expect(checks.filter(r=>r.finalStatus==='rejected')).toHaveLength(3);
 expect(checks.filter(r=>r.finalStatus==='review')).toHaveLength(3);
});
it('uses controlled per-relationship POS with short shared senses, and leaves uncertain POS explicit',()=>{
 for(const d of decisions){expect(POS).toContain(d.partOfSpeech);if(d.sense)expect(d.sense.length).toBeLessThanOrEqual(60);}
 const h=(word:string)=>final.find(h=>h.english===word)!;
 expect(h('MANUAL').translations.map(t=>t.partOfSpeech)).toEqual(['noun','noun','adjective']);
 expect(h('BLOCK').translations.map(t=>t.partOfSpeech)).toEqual(['noun','noun','verb']);
 expect(h('GRANT').translations.slice(0,2).map(t=>t.partOfSpeech)).toEqual(['verb','noun']);
 expect(h('LOCATED').translations[0].partOfSpeech).toBe('uncertain');
 expect(h('MISSION').translations[2].sense).toBe(h('MISSION').translations[3].sense);
 expect(h('CAPITAL').translations[0].sense).toBe(h('CAPITAL').translations[1].sense);
 expect(h('CAPITAL').translations[1].sense).not.toBe(h('CAPITAL').translations[2].sense);
});
it('preserves exact display, grid normalization, relationship multiplicity, CEFR and every out-of-batch record',()=>{
 const selected=new Set(selection.map(s=>s.headwordIndex));expect(final).toHaveLength(16018);expect(final.flatMap(h=>h.translations)).toHaveLength(29467);
 source.forEach((h,i)=>{const n=final[i];expect(n.english).toBe(h.english);expect(n.cefr).toEqual(h.cefr);expect(n.translations).toHaveLength(h.translations.length);
  if(!selected.has(i))expect(n).toEqual(h);
  else h.translations.forEach((t,j)=>{expect(n.translations[j].arabic).toBe(t.arabic);expect(normalizeArabicWord(n.translations[j].arabic)).toBe(normalizeArabicWord(t.arabic));});
 });
 expect(buildReverseIndex(final)).toEqual(buildReverseIndex(source));expect(final.every(h=>h.cefr==null)).toBe(true);
 expect(final.find(h=>h.english==='FOOTBALL')!.translations[0].arabic).toBe('كرة القدم');
 expect(final.find(h=>h.english==='CAPITAL')!.translations[2].arabic).toBe('رأس المال');
});
it('samples all rejections and oversamples sense, multi-POS, nonpreference, review, register and reference conflicts',()=>{
 expect(sample).toEqual(json(root+'qa/sample.json'));expect(sample).toHaveLength(100);expect(new Set(sample.map(relationshipKey)).size).toBe(100);
 for(const d of decisions.filter(d=>d.status==='rejected'))expect(sample.some(s=>relationshipKey(s)===relationshipKey(d))).toBe(true);
 expect(sample.filter(s=>s.stratum==='sense')).toHaveLength(20);expect(sample.filter(s=>s.stratum==='multi-pos')).toHaveLength(20);
 for(const stratum of ['nonpreferred-reverse','review','register','reference-conflict'])expect(sample.some(s=>s.stratum===stratum)).toBe(true);
});
it('applies only high-confidence QA changes and reports all agreements using applicable sense denominators',()=>{
 const result=applyBatch003Qa(initial,sample,reviews);
 expect(result.disagreements).toHaveLength(9);expect(result.disagreements.filter(d=>d.applied)).toHaveLength(7);expect(result.disagreements.filter(d=>!d.applied)).toHaveLength(2);
 expect(summary.qa.agreements.partOfSpeech.percent).toBe(98);expect(summary.qa.agreements.sense).toEqual({agree:29,total:29,percent:100});
 for(const r of reviews.filter(r=>r.confidence!=='high'))expect(final[r.originalDecision.headwordIndex].translations[r.originalDecision.translationIndex]).toEqual(initial[r.originalDecision.headwordIndex].translations[r.originalDecision.translationIndex]);
 const worth=final.find(h=>h.english==='WORTH')!.translations[1];expect(worth).toMatchObject({arabic:'قيمة',status:'approved',partOfSpeech:'noun',allowedForEnToAr:true,allowedForArToEn:true});
});
for(const mode of ['en_to_ar','ar_to_en']as const)it(`preserves approved nonpreferred eligibility and rejected exclusion in ${mode}`,()=>{
 for(const d of decisions){const h=final[d.headwordIndex],t=h.translations[d.translationIndex];if(t.status==='rejected'||t.register==='dialect')expect(eligibleTranslation(h,t,'compatibility',mode)).toBe(false);
  if(t.status==='approved'&&t.register==='msa'&&(mode==='en_to_ar'?t.allowedForEnToAr:t.allowedForArToEn)===true)expect(eligibleTranslation(h,t,'approved-only',mode)).toBe(true);
 }
 const data:DictionaryHeadword[]=[{english:'THREAD',status:'approved',translations:[{arabic:'خيط',status:'approved',register:'msa',allowedForEnToAr:true,allowedForArToEn:true,preferredForEnToAr:false,preferredForArToEn:false}]},
 {english:'STRING',status:'approved',translations:[{arabic:'خيط',status:'approved',register:'msa',allowedForEnToAr:true,allowedForArToEn:true,preferredForEnToAr:false,preferredForArToEn:false}]},
 {english:'REJECT',status:'approved',translations:[{arabic:'مرفوض',status:'rejected',register:'msa'}]}];
 const pairs=[...createCandidateIndex(data,'approved-only').get(`13:${mode}:advanced`)!.values()].flat(2);
 expect(pairs.some(p=>p.answer==='REJECT'||p.clue==='REJECT')).toBe(false);
 if(mode==='ar_to_en')expect(pairs.map(p=>p.answer)).toEqual(expect.arrayContaining(['THREAD','STRING']));else expect(pairs.some(p=>p.answer==='خيط')).toBe(true);
});
it('keeps direction flags independent and uses the natural multiword clue',()=>{
 const h:DictionaryHeadword={english:'PROPERLY',status:'approved',translations:[{arabic:'بشكل صحيح',status:'approved',register:'msa',allowedForEnToAr:true,allowedForArToEn:false,preferredForEnToAr:false,preferredForArToEn:false}]};
 const pairs=(mode:string)=>[...createCandidateIndex([h],'approved-only').get(`13:${mode}:advanced`)!.values()].flat(2);
 expect(pairs('en_to_ar')).toContainEqual({answer:'بشكلصحيح',clue:'PROPERLY'});expect(pairs('ar_to_en')).toHaveLength(0);
 h.translations[0].allowedForEnToAr=false;h.translations[0].allowedForArToEn=true;
 expect(pairs('en_to_ar')).toHaveLength(0);expect(pairs('ar_to_en')).toContainEqual({answer:'PROPERLY',clue:'بشكل صحيح'});
});
it('reports measured availability in both modes and all sizes while compatibility remains explicit',()=>{
 for(const policy of ['compatibility','approved-only']as const){const index=createCandidateIndex(final,policy);
  for(const mode of ['en_to_ar','ar_to_en'])for(const size of [7,9,11,13])expect(summary.availabilityAfter.find((r:{policy:string;mode:string;size:number})=>r.policy===policy&&r.mode===mode&&r.size===size).indexedCandidates).toBe([...index.get(`${size}:${mode}:advanced`)!.values()].flat(2).length);
 }
 expect(read('api/generate.ts')).toContain("createCandidateIndex(DICTIONARY_BATCH003_QA, 'compatibility')");expect(summary.batch004Started).toBe(false);
});
it.each(['missing-check','duplicate-check','stale-check','low-confidence-reject'] as const)('rejects %s in mandatory second pass',kind=>{
 const changed=structuredClone(checks);if(kind==='missing-check')changed.pop();if(kind==='duplicate-check')changed.push(changed[0]);if(kind==='stale-check')changed[0].original='changed';if(kind==='low-confidence-reject')changed.find(c=>c.finalStatus==='rejected')!.confidence='medium';
 expect(()=>checkRejections(proposals,changed)).toThrow();
});
it.each(['pos','sense','text','missing','approval','outside'] as const)('rejects unsafe %s proposal',kind=>{
 const changed=structuredClone(proposals);if(kind==='pos')changed[0].partOfSpeech='noun/verb';if(kind==='sense')changed[0].sense='x'.repeat(61);if(kind==='text')changed[0].original='changed';if(kind==='missing')changed.pop();if(kind==='approval')changed[0].confidence='low';if(kind==='outside')changed[0].headwordIndex=0;
 expect(()=>applyBatch003(source,selection,changed,checks)).toThrow();
});
it('rejects new text or uncontrolled POS in QA',()=>{
 const changed=structuredClone(reviews);changed[0].revisedDecision.partOfSpeech='participle';expect(()=>applyBatch003Qa(initial,sample,changed)).toThrow();
 changed[0].revisedDecision.partOfSpeech='noun';changed[0].revisedDecision.original='changed';expect(()=>applyBatch003Qa(initial,sample,changed)).toThrow();
});
