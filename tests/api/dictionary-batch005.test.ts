import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {it,expect} from 'vitest';
import {DICTIONARY_BATCH004_QA as source} from '../../api/_lib/dictionary.stage3b.batch004.qa.generated';
import {DICTIONARY_BATCH005 as initial} from '../../api/_lib/dictionary.stage3b.batch005.generated';
import {DICTIONARY_BATCH005_QA as final} from '../../api/_lib/dictionary.stage3b.batch005.qa.generated';
import {normalizeArabicWord,eligibleTranslation,buildReverseIndex,type DictionaryHeadword} from '../../api/_lib/dictionary';
import {createCandidateIndex} from '../../api/_lib/candidates';
import {parseReferenceCsv} from '../../scripts/stage3b';
import {compileBatch003Notes,applyBatch003,applyBatch003Qa,relationshipKey,POS,type RejectionCheck} from '../../scripts/stage3b-batch003';
import {selectBatch005,sampleBatch005Qa,compileBatch005QaNotes,matchesDomain,type DomainNeed} from '../../scripts/stage3b-batch005';
import type {Batch002Decision,Batch002Qa} from '../../scripts/stage3b-batch002';
const root='dictionary/stage3b/batch005/',read=(p:string)=>readFileSync(p,'utf8'),json=(p:string)=>JSON.parse(read(p));
const prior=new Set(['dictionary/stage3a/decisions.json',...[1,2,3,4].map(n=>`dictionary/stage3b/batch00${n}/decisions.json`)].flatMap(f=>(json(f)as {english:string}[]).map(d=>d.english)));
const reference=parseReferenceCsv(read('api/english_arabic_10000_v3.csv')),needs=json(root+'domain_needs.json')as DomainNeed[];
const selection=selectBatch005(source,reference,prior,json(root+'deferred.json'),needs);
const proposals=json(root+'proposals.json')as Batch002Decision[],decisions=json(root+'decisions.json')as Batch002Decision[],checks=json(root+'rejection_checks.json')as RejectionCheck[];
const sample=sampleBatch005Qa(decisions,reference,selection,needs),reviews=json(root+'qa/reviews.json')as Batch002Qa[],summary=json(root+'summary.json');
it('reproduces 500 new common headwords from recurring support domains rather than length quotas',()=>{
 expect(selection).toEqual(json(root+'selection.json'));expect(selection).toHaveLength(500);expect(new Set(selection.map(s=>s.english)).size).toBe(500);
 expect(selection.every(s=>!prior.has(s.english)&&source[s.headwordIndex].status==='review'&&reference.has(s.english))).toBe(true);
 expect(selection.filter(s=>s.domainScore>0)).toHaveLength(441);
 const byId=new Map(needs.map(n=>[n.id,n]));
 for(const s of selection)for(const id of s.matchedDomainIds){const n=byId.get(id)!;expect(n.failedSeeds.length).toBeGreaterThanOrEqual(2);expect(n.matchingApproved).toBeLessThanOrEqual(3);expect(n.size).toBeGreaterThanOrEqual(s.englishLength);}
 for(const [file,hash]of Object.entries(json(root+'inputs.json')))expect(createHash('sha256').update(read(file)).digest('hex')).toBe(hash);
});
it('checks support sets and inversion, including constraints hidden behind question marks',()=>{
 const answer='STONE';expect(matchesDomain(answer,{length:5,constraints:[{position:0,characters:['E']},{position:4,characters:['S']}]})).toBe(true);expect(answer).toBe('STONE');
 expect(matchesDomain('STONE',{length:5,constraints:[{position:2,characters:['A','I']}]})).toBe(false);
 expect(matchesDomain('سلام',{length:4,constraints:[{position:0,characters:['م']},{position:3,characters:['س']}]})).toBe(true);
 expect(matchesDomain('STONE',{length:5,constraints:[{position:1,characters:[]}]})).toBe(false);
 expect(matchesDomain('STONE',{length:4,constraints:[]})).toBe(false);
});
it('keeps commonness dominant for equivalent needs and does not multiply near-duplicate family credit',()=>{
 const data:DictionaryHeadword[]=['DEAL','TEAL','ZEAL'].map(english=>({english,status:'review',translations:[{arabic:'عقد'}]}));
 const need:DomainNeed={id:'test',size:11,mode:'ar_to_en',length:4,pattern:'??A?',constraints:[{position:2,characters:['A']}],failedSeeds:[1,2,3],templateCount:2,observations:10,zeroEvents:10,matchingApproved:0,matchingAnswers:[],priority:1};
 const ref=new Map([['DEAL','عقد'],['TEAL','بط']]);
 const a=selectBatch005(data,ref,new Set(),{},[need]),b=selectBatch005(data,ref,new Set(),{},[need,{...need,id:'duplicate'}]);
 expect(a.map(s=>s.english)).toEqual(['DEAL','TEAL','ZEAL']);expect(a.map(s=>s.domainScore)).toEqual(b.map(s=>s.domainScore));
 expect(selectBatch005(data,ref,new Set(),{},[]).every(s=>s.domainScore===0)).toBe(true);
 expect(selectBatch005(data,ref,new Set(['DEAL']),{},[need]).some(s=>s.english==='DEAL')).toBe(false);
});
it('replays every relationship and rejection check beneath a separate explicit QA layer',()=>{
 expect(proposals).toHaveLength(1321);expect(compileBatch003Notes(source,selection,read(root+'review-notes.txt'),json(root+'review-details.json'))).toEqual(proposals);
 const replay=applyBatch003(source,selection,proposals,checks);expect(replay.dictionary).toEqual(initial);expect(replay.decisions).toEqual(decisions);
 expect(checks).toHaveLength(5);expect(checks.filter(c=>c.finalStatus==='rejected')).toHaveLength(4);
 expect(compileBatch005QaNotes(sample,read(root+'qa/review-notes.txt'))).toEqual(reviews);expect(applyBatch003Qa(initial,sample,reviews).dictionary).toEqual(final);
});
it('preserves all relationships, natural display, normalized answers, many-to-many links and untouched prior stages',()=>{
 const selected=new Set(selection.map(s=>s.headwordIndex));expect(final).toHaveLength(16018);expect(final.flatMap(h=>h.translations)).toHaveLength(29467);
 source.forEach((h,i)=>{const n=final[i];expect(n.english).toBe(h.english);expect(n.cefr).toEqual(h.cefr);expect(n.translations).toHaveLength(h.translations.length);
 if(!selected.has(i))expect(n).toEqual(h);else h.translations.forEach((t,j)=>{expect(n.translations[j].arabic).toBe(t.arabic);expect(normalizeArabicWord(n.translations[j].arabic)).toBe(normalizeArabicWord(t.arabic));});});
 expect(buildReverseIndex(final)).toEqual(buildReverseIndex(source));expect(final.every(h=>h.cefr==null)).toBe(true);
 expect(final.find(h=>h.english==='PROCEED')!.translations[0].arabic).toBe('المضي قدما');expect(final.flatMap(h=>h.translations).filter(t=>t.status==='approved')).toHaveLength(5655);
});
it('uses controlled relationship-specific POS and sparse discriminative senses',()=>{
 for(const d of decisions){expect(POS).toContain(d.partOfSpeech);if(d.sense)expect(d.sense.length).toBeLessThanOrEqual(60);}
 const h=(english:string)=>final.find(h=>h.english===english)!;
 expect(h('SECRET').translations.slice(0,2).map(t=>t.partOfSpeech)).toEqual(['noun','adjective']);
 expect(h('BAT').translations[1].sense).not.toBe(h('BAT').translations[2].sense);
 expect(h('FALLS').translations[2].sense).toBe('falling');expect(h('TASTE').translations[1].sense).toBeUndefined();
});
it('samples rejections, current domain contributions, POS/sense, register and nonpreference and logs every disagreement',()=>{
 expect(sample).toEqual(json(root+'qa/sample.json'));expect(sample).toHaveLength(100);
 for(const stratum of ['rejected','english-large-domain','arabic-domain','sense','register','nonpreferred'])expect(sample.some(s=>s.stratum===stratum)).toBe(true);
 for(const d of decisions.filter(d=>d.status==='rejected'))expect(sample.some(s=>relationshipKey(s)===relationshipKey(d))).toBe(true);
 const result=applyBatch003Qa(initial,sample,reviews);expect(result.disagreements).toHaveLength(13);expect(new Set(result.disagreements.map(d=>d.sourceId)).size).toBe(3);
 expect(summary.qa.agreements.status.percent).toBe(98);expect(summary.qa.agreements.sense).toEqual({agree:11,total:12,percent:91.67});
 const changed=structuredClone(reviews);changed.find(r=>r.originalDecision.english==='GENRE')!.confidence='medium';
 expect(applyBatch003Qa(initial,sample,changed).dictionary.find(h=>h.english==='GENRE')!.translations[0].status).toBe('review');
});
for(const mode of ['en_to_ar','ar_to_en']as const)it(`excludes rejected and dialect records and preserves valid nonpreferred relationships in ${mode}`,()=>{
 for(const h of final)for(const t of h.translations){if(t.status==='rejected'||t.register==='dialect')expect(eligibleTranslation(h,t,'compatibility',mode)).toBe(false);
 if(h.status==='approved'&&t.status==='approved'&&t.register==='msa'&&(mode==='ar_to_en'?t.allowedForArToEn:t.allowedForEnToAr)===true)expect(eligibleTranslation(h,t,'approved-only',mode)).toBe(true);}
 const uncle=final.find(h=>h.english==='UNCLE')!;const pairs=[...createCandidateIndex([uncle],'compatibility').get(`13:${mode}:advanced`)!.values()].flat(2);
 expect(pairs.some(p=>p.answer==='عمو'||p.clue==='عمو')).toBe(false);
 const genre=final.find(h=>h.english==='GENRE')!;expect(genre.translations[0].preferredForArToEn).toBe(false);expect(eligibleTranslation(genre,genre.translations[0],'approved-only',mode)).toBe(true);
});
it('keeps allowance independent across directions and retains natural multiword clues',()=>{
 const h:DictionaryHeadword={english:'PROPERLY',status:'approved',translations:[{arabic:'بشكل صحيح',status:'approved',register:'msa',allowedForEnToAr:true,allowedForArToEn:false,preferredForEnToAr:false,preferredForArToEn:false}]};
 const pairs=(mode:string)=>[...createCandidateIndex([h],'approved-only').get(`13:${mode}:advanced`)!.values()].flat(2);
 expect(pairs('en_to_ar')).toContainEqual({answer:'بشكلصحيح',clue:'PROPERLY'});expect(pairs('ar_to_en')).toHaveLength(0);
 h.translations[0].allowedForEnToAr=false;h.translations[0].allowedForArToEn=true;expect(pairs('en_to_ar')).toHaveLength(0);expect(pairs('ar_to_en')).toContainEqual({answer:'PROPERLY',clue:'بشكل صحيح'});
});
it('reports actual availability and keeps compatibility explicit',()=>{
 for(const policy of ['compatibility','approved-only']as const){const index=createCandidateIndex(final,policy);for(const size of [7,9,11,13])for(const mode of ['en_to_ar','ar_to_en'])expect(summary.availabilityAfter.find((r:{policy:string;size:number;mode:string})=>r.policy===policy&&r.size===size&&r.mode===mode).indexedCandidates).toBe([...index.get(`${size}:${mode}:advanced`)!.values()].flat(2).length);}
 expect(read('api/generate.ts')).toMatch(/createCandidateIndex\(DICTIONARY_BATCH\d+_QA, 'compatibility'\)/);expect(summary.batch006Started).toBe(false);
});
