import{readFileSync}from'node:fs';
import{createHash}from'node:crypto';
import{it,expect}from'vitest';
import{DICTIONARY_BATCH005_QA as before}from'../../api/_lib/dictionary.stage3b.batch005.qa.generated';
import{DICTIONARY_BATCH006 as initial}from'../../api/_lib/dictionary.stage3b.batch006.generated';
import{DICTIONARY_BATCH006_QA as after}from'../../api/_lib/dictionary.stage3b.batch006.qa.generated';
import{normalizeArabicWord,eligibleTranslation,buildReverseIndex}from'../../api/_lib/dictionary';
import{createCandidateIndex}from'../../api/_lib/candidates';
import{compileBatch003Notes,applyBatch003,applyBatch003Qa,POS}from'../../scripts/stage3b-batch003';
import{selectBatch006,sampleBatch006Qa,compileBatch006QaNotes}from'../../scripts/stage3b-batch006';
import type{Batch002Decision,Batch002Qa}from'../../scripts/stage3b-batch002';
const root='dictionary/stage3b/batch006/',read=(p:string)=>readFileSync(p,'utf8'),json=(p:string)=>JSON.parse(read(p));
const proposed=json('dictionary/stage3b/batch006_analysis/proposed_candidates.json')as{english:string;headwordIndex:number;referenceArabic:string;domainIds:string[]}[];
const words=read('dictionary/stage3b/batch006_analysis/proposed_headwords.txt').trim().split('\n'),selection=selectBatch006(before,proposed,words),decisions=json(root+'decisions.json')as Batch002Decision[],reviews=json(root+'qa/reviews.json')as Batch002Qa[];
const summary=json(root+'summary.json');
it('locks exactly the 67 proposed headwords and 788 target domains without expanding or revisiting earlier headwords',()=>{
 expect(selection).toEqual(json(root+'selection.json'));expect(selection).toHaveLength(67);expect(new Set(selection.flatMap(s=>s.domainIds)).size).toBe(788);
 expect(()=>selectBatch006(before,proposed.slice(0,66),words)).toThrow();expect(()=>selectBatch006(before,[...proposed,proposed[0]],[...words,words[0]])).toThrow();
 const prior=new Set(['dictionary/stage3a/decisions.json',...[1,2,3,4,5].map(n=>`dictionary/stage3b/batch00${n}/decisions.json`)].flatMap(p=>(json(p)as{english:string}[]).map(d=>d.english)));
 expect(selection.every(s=>!prior.has(s.english))).toBe(true);
 for(const [p,hash]of Object.entries(json(root+'inputs.json')))expect(createHash('sha256').update(readFileSync(p)).digest('hex')).toBe(hash);
});
it('replays all 136 explicit relationship judgments, rejection checks and the independent QA layer',()=>{
 const compiled=compileBatch003Notes(before,selection,read(root+'review-notes.txt'),json(root+'review-details.json'),67);expect(compiled).toHaveLength(136);expect(compiled).toEqual(json(root+'proposals.json'));
 const result=applyBatch003(before,selection,compiled,json(root+'rejection_checks.json'),67);expect(result.dictionary).toEqual(initial);expect(result.decisions).toEqual(decisions);expect(result.checks).toHaveLength(2);
 expect(()=>applyBatch003(before,selection,compiled,[],67)).toThrow();
 const sample=sampleBatch006Qa(decisions);expect(sample).toHaveLength(45);expect(sample).toEqual(json(root+'qa/sample.json'));expect(compileBatch006QaNotes(sample,read(root+'qa/review-notes.txt'))).toEqual(reviews);
 const qa=applyBatch003Qa(initial,sample,reviews,45);expect(qa.dictionary).toEqual(after);expect(qa.disagreements).toHaveLength(1);expect(qa.disagreements[0]).toMatchObject({english:'INVITE',field:'partOfSpeech',before:'verb',after:'noun',applied:true});
});
it('preserves every natural Arabic value, grid spelling, relationship identity, prior decision and CEFR value',()=>{
 const selected=new Set(selection.map(s=>s.headwordIndex));expect(after).toHaveLength(16018);expect(after.flatMap(h=>h.translations)).toHaveLength(29467);
 before.forEach((h,i)=>{const n=after[i];expect(n.english).toBe(h.english);expect(n.cefr).toEqual(h.cefr);expect(n.cefr==null).toBe(true);expect(n.translations).toHaveLength(h.translations.length);
 if(!selected.has(i))expect(n).toEqual(h);h.translations.forEach((t,j)=>{expect(n.translations[j].arabic).toBe(t.arabic);expect(normalizeArabicWord(n.translations[j].arabic)).toBe(normalizeArabicWord(t.arabic));});});
 expect(buildReverseIndex(after)).toEqual(buildReverseIndex(before));expect(after.find(h=>h.english==='CLOSELY')!.translations[0].arabic).toBe('عن كثب');
});
it('requires high-confidence MSA approval independently of domain usefulness and keeps allowance separate from preference',()=>{
 const batch=selection.flatMap(s=>after[s.headwordIndex].translations);expect(batch.filter(t=>t.status==='approved')).toHaveLength(103);expect(batch.filter(t=>t.status==='review')).toHaveLength(31);expect(batch.filter(t=>t.status==='rejected')).toHaveLength(2);
 for(const d of decisions){expect(POS).toContain(d.partOfSpeech);if(d.status==='approved')expect(d).toMatchObject({confidence:'high',register:'msa',allowedForArToEn:true,allowedForEnToAr:true});}
 for(const english of ['LANCE','MESA','EAGLE','RETRO','TECHNO','INTAKE','AFFORD'])expect(after.find(h=>h.english===english)!.status).toBe('review');
 const h=after.find(h=>h.english==='MODIFICATIONS')!,t=h.translations[1];expect(t.preferredForArToEn).toBe(false);for(const mode of ['ar_to_en','en_to_ar']as const)expect(eligibleTranslation(h,t,'approved-only',mode)).toBe(true);
});
it('excludes rejected relationships from production candidates in both modes and retains approved relationships',()=>{
 for(const mode of ['en_to_ar','ar_to_en']as const){for(const h of after)for(const t of h.translations)if(t.status==='rejected')expect(eligibleTranslation(h,t,'compatibility',mode)).toBe(false);
 const h=after.find(h=>h.english==='ANGEL')!,index=createCandidateIndex([h],'compatibility'),pairs=[...index.get(`13:${mode}:advanced`)!.values()].flat(2);expect(pairs.some(p=>p.answer==='انجيل'||p.clue==='انجيل')).toBe(false);expect(pairs.length).toBeGreaterThan(0);}
});
it('records QA uncertainty and confirms compatibility remains explicit',()=>{
 expect(summary.qa.agreements.partOfSpeech).toEqual({agree:44,total:45,percent:97.78});expect(summary.qa.agreements.sense.total).toBe(3);expect(summary.qa.highConfidenceFieldCorrections).toBe(1);expect(summary.textCorrections).toBe(0);
 expect(summary.afterQa.relationshipStatus).toEqual({review:23321,approved:5758,rejected:388});expect(summary.batch007Started).toBe(false);
 expect(read('api/generate.ts')).toMatch(/createCandidateIndex\(DICTIONARY_BATCH\d+_QA, 'compatibility'\)/);
});
