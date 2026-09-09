import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { DICTIONARY_STAGE3A as before } from '../../api/_lib/dictionary.stage3a.generated';
import { DICTIONARY_STAGE3B as after } from '../../api/_lib/dictionary.stage3b.generated';
import { applyBatch001, selectBatch001, parseReferenceCsv, type BatchDecision } from '../../scripts/stage3b';
import { createCandidateIndex } from '../../api/_lib/candidates';
import { buildReverseIndex, normalizeArabicWord, eligibleTranslation, type DictionaryHeadword } from '../../api/_lib/dictionary';

const read=(name:string)=>JSON.parse(readFileSync(`dictionary/stage3b/batch001/${name}`,'utf8'));
const reference=parseReferenceCsv(readFileSync('api/english_arabic_10000_v3.csv','utf8'));
const prior=JSON.parse(readFileSync('dictionary/stage3a/decisions.json','utf8')) as {english:string}[];
const selection=selectBatch001(before,reference,new Set(prior.map(d=>d.english)),new Set(Object.keys(read('deferred.json'))));
const manifest=read('decisions.json') as BatchDecision[];
const result=applyBatch001(before,selection,manifest);

it('selects exactly 500 unresolved reference headwords reproducibly in source order, outside Stage 3A review',()=>{
  expect(selection).toEqual(read('selection.json'));
  expect(selection).toHaveLength(500);
  expect(selection.map(h=>h.headwordIndex)).toEqual(selection.map(h=>h.headwordIndex).sort((a,b)=>a-b));
  for(const h of selection){expect(reference.has(h.english)).toBe(true);expect(prior.some(d=>d.english===h.english)).toBe(false);}
  expect(selection.some(h=>['EBAY','YAHOO','YORK','INFO'].includes(h.english))).toBe(false);
});

it('replays all decisions without relationship losses, CEFR changes, source mutation or unreported text changes',()=>{
  expect(result.dictionary).toEqual(after);
  const selected=new Set(selection.map(h=>h.headwordIndex));
  let total=0, reviewed=0;
  before.forEach((h,i)=>{
    const next=after[i];
    expect(next.english).toBe(h.english);expect(next.cefr).toBe(h.cefr);
    expect(next.translations).toHaveLength(h.translations.length);
    total+=h.translations.length;
    if(!selected.has(i))expect(next).toEqual(h);
    else {
      expect(manifest.filter(d=>d.headwordIndex===i)).toHaveLength(h.translations.length);
      reviewed+=h.translations.length;
      expect(next.status).toBe(next.translations.some(t=>t.status==='approved'&&t.register==='msa')?'approved':'review');
    }
    h.translations.forEach((t,j)=>{
      expect(next.translations[j].arabic).toBe(t.arabic); // Batch 001 applies no text corrections.
      expect(normalizeArabicWord(next.translations[j].arabic)).toBe(normalizeArabicWord(t.arabic));
      if(t.status==='rejected')expect(next.translations[j].status).toBe('rejected');
    });
  });
  expect(total).toBe(29467);expect(reviewed).toBe(1526);
});

it.each(['missing','duplicate','stale','outside','uncertain-approval','unsafe-correction','non-msa'])('rejects %s decisions',kind=>{
  const changed=structuredClone(manifest);
  const approved=changed.find(d=>d.status==='approved')!;
  if(kind==='missing')changed.pop();
  if(kind==='duplicate')changed.push(changed[0]);
  if(kind==='stale')changed[0].original='different';
  if(kind==='outside')changed[0].headwordIndex=16017;
  if(kind==='uncertain-approval')approved.confidence='medium';
  if(kind==='unsafe-correction'){approved.applied=true;approved.replacement=null;}
  if(kind==='non-msa')approved.register='uncertain';
  expect(()=>applyBatch001(before,selection,changed)).toThrow();
});

it('preserves multiword display, existing senses and many-to-many reverse relationships',()=>{
  for(const [en,ar] of [['FOR','من أجل'],['PROPERLY','بشكل صحيح'],['AGAIN','مرة أخرى']]) {
    expect(after.find(h=>h.english===en)!.translations.some(t=>t.arabic===ar)).toBe(true);
    expect(normalizeArabicWord(ar)).toBe(ar.replace(/ /g,''));
  }
  const senses=after.find(h=>h.english==='PARTY')!.translations.filter(t=>t.status==='approved').map(t=>t.sense);
  expect(senses).toContain('political organization');expect(senses).toContain('social celebration');
  expect([...buildReverseIndex(after).values()].some(refs=>new Set(refs.map(r=>r.english)).size>1)).toBe(true);
  expect(buildReverseIndex(after)).toEqual(buildReverseIndex(before));
});

const pairs=(data:DictionaryHeadword[],mode:'en_to_ar'|'ar_to_en',policy:'compatibility'|'approved-only'='compatibility')=>[...createCandidateIndex(data,policy).get(`13:${mode}:advanced`)!.values()].flat(2);
it('handles direction exclusions independently, prefers allowed forms and retains review compatibility explicitly',()=>{
  const sample:DictionaryHeadword[]=[{english:'BOOK',status:'approved',translations:[
    {arabic:'كتاب',status:'approved',register:'msa',allowedForEnToAr:true,allowedForArToEn:false,preferredForEnToAr:true,preferredForArToEn:false},
    {arabic:'الكتاب',status:'approved',register:'msa',allowedForEnToAr:false,allowedForArToEn:true,preferredForEnToAr:false,preferredForArToEn:true},
    {arabic:'مرفوض',status:'rejected',register:'msa'},
  ]},{english:'HOUSE',status:'review',translations:[{arabic:'منزل',status:'review',register:'uncertain'}]}];
  expect(pairs(sample,'en_to_ar')).toEqual(expect.arrayContaining([{answer:'كتاب',clue:'BOOK'},{answer:'منزل',clue:'HOUSE'}]));
  expect(pairs(sample,'en_to_ar').some(p=>p.answer==='الكتاب')).toBe(false);
  expect(pairs(sample,'ar_to_en')).toEqual(expect.arrayContaining([{answer:'BOOK',clue:'الكتاب'}]));
  expect(pairs(sample,'ar_to_en').some(p=>p.clue==='كتاب')).toBe(false);
  expect(pairs(sample,'en_to_ar','approved-only').some(p=>p.clue==='HOUSE')).toBe(false);
});

it.each(['en_to_ar','ar_to_en'] as const)('never emits rejected/dialect data and retains eligible approvals in %s',mode=>{
  const list=pairs(after,mode), byEnglish=new Map(after.map(h=>[h.english,h]));
  for(const p of list){
    const h=byEnglish.get(mode==='en_to_ar'?p.clue:p.answer)!;
    expect(h.status).not.toBe('rejected');
    expect(h.translations.some(t=>eligibleTranslation(h,t,'compatibility',mode)&&(mode==='ar_to_en'?t.arabic===p.clue:t.arabic.split(/[/،;|]/).some(v=>normalizeArabicWord(v)===p.answer)))).toBe(true);
  }
  const car=after.find(h=>h.english==='CAR')!;
  expect(car.status).toBe('approved');
  expect(pairs([car],mode,'approved-only').length).toBeGreaterThan(0);
  expect(list.some(p=>(mode==='en_to_ar'?p.clue:p.answer)==='ARE')).toBe(false);
});

it('reports exact before/after counts and every reviewed relationship, including reference conflicts',()=>{
  const summary=read('summary.json');
  expect(summary.before.relationshipStatus).toEqual({review:29011,rejected:307,approved:149});
  expect(summary.batchCounts.relationships).toBe(manifest.length);
  expect(summary.after.relationships).toBe(29467);
  expect(summary.textCorrections).toBe(0);expect(summary.cefrAssignments).toBe(0);
  const csv=readFileSync('dictionary/stage3b/batch001/decisions.csv','utf8');
  for(const d of manifest)expect(csv).toContain(`"stage3a:h${d.headwordIndex}:t${d.translationIndex}"`);
  expect(readFileSync('dictionary/stage3b/batch001/reference_conflicts.csv','utf8')).toContain('ENGLISH');
  expect(readFileSync('api/generate.ts','utf8')).toContain("createCandidateIndex(DICTIONARY_BATCH003_QA, 'compatibility')");
});
