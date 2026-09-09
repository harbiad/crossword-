import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { DICTIONARY_STAGE3B as before } from '../../api/_lib/dictionary.stage3b.generated';
import { DICTIONARY_STAGE3B_QA as after } from '../../api/_lib/dictionary.stage3b.qa.generated';
import { sampleBatchQa, applyBatchQa, qaKey, type QaReview } from '../../scripts/stage3b-qa';
import { normalizeArabicWord, buildReverseIndex, eligibleTranslation } from '../../api/_lib/dictionary';
import { createCandidateIndex } from '../../api/_lib/candidates';
import { parseReferenceCsv, type BatchDecision } from '../../scripts/stage3b';

const read=(p:string)=>readFileSync(`dictionary/stage3b/batch001/${p}`,'utf8');
const baseline=JSON.parse(read('decisions.json')) as BatchDecision[];
const ref=parseReferenceCsv(readFileSync('api/english_arabic_10000_v3.csv','utf8'));
const conflicts=new Set(baseline.filter(d=>d.status!=='approved'&&normalizeArabicWord(ref.get(d.english)!)===normalizeArabicWord(d.original)).map(qaKey));
const sample=sampleBatchQa(baseline,conflicts), reviews=JSON.parse(read('qa/reviews.json')) as QaReview[];
const result=applyBatchQa(before,sample,reviews);

it('pins the baseline and reproduces 150 distinct sampled relationships with every required stratum',()=>{
  expect(createHash('sha256').update(read('decisions.json')).digest('hex')).toBe(JSON.parse(read('qa/selection.json')).baselineSha256);
  expect(sample).toEqual(JSON.parse(read('qa/sample-baseline.json')));
  expect(sample).toHaveLength(150);expect(new Set(sample.map(qaKey)).size).toBe(150);
  for(const [stratum,n] of [['approved',40],['rejected',20],['review',20],['reverse-restricted',30],['reverse-preferred',10],['sense',10],['reference-conflict',10],['multiword',5],['function-verb-adverb',5]] as const)
    expect(sample.filter(d=>d.sampleStratum===stratum)).toHaveLength(n);
  expect(sample.every(d=>baseline.some(b=>qaKey(d)===qaKey(b)))).toBe(true);
});

it('applies only individually logged high-confidence metadata, preserving baseline text, all other records and CEFR',()=>{
  expect(result.dictionary).toEqual(after);
  const changes=new Map(reviews.map(r=>[qaKey(r),r.changes.filter(c=>c.applied)]));
  let relations=0;
  before.forEach((h,i)=>{
    expect(after[i].english).toBe(h.english);expect(after[i].cefr).toBe(h.cefr);expect(after[i].status).toBe(h.status);
    expect(after[i].translations).toHaveLength(h.translations.length);
    h.translations.forEach((t,j)=>{
      relations++;
      const expected={...t};
      for(const c of changes.get(`${i}:${j}`)??[]){
        expect(c.confidence).toBe('high');
        if(c.after===null)delete expected[c.field];else Object.assign(expected,{[c.field]:c.after});
      }
      expect(after[i].translations[j]).toEqual(expected);
      expect(after[i].translations[j].arabic).toBe(t.arabic);
      expect(normalizeArabicWord(after[i].translations[j].arabic)).toBe(normalizeArabicWord(t.arabic));
    });
  });
  expect(relations).toBe(29467);expect(buildReverseIndex(after)).toEqual(buildReverseIndex(before));
});

it.each(['missing','duplicate','stale','outside','medium-applied','unlogged-status','invalid-field','invalid-value','bad-agreement'])('rejects %s QA manifests',kind=>{
  const changed=structuredClone(reviews);
  if(kind==='missing')changed.pop();
  if(kind==='duplicate')changed[1]=changed[0];
  if(kind==='stale')changed[0].arabic='changed';
  if(kind==='outside')changed[0].headwordIndex=16017;
  if(kind==='medium-applied'){const c=changed.flatMap(r=>r.changes).find(c=>c.confidence==='medium')!;c.applied=true;}
  if(kind==='unlogged-status')changed[0].qaStatus='rejected';
  if(kind==='invalid-field')Object.assign(changed.flatMap(r=>r.changes)[0],{field:'arabic'});
  if(kind==='invalid-value')changed.flatMap(r=>r.changes).find(c=>c.field==='status')!.after='bad-status';
  if(kind==='bad-agreement')changed[0].posAgreement=false;
  expect(()=>applyBatchQa(before,sample,changed)).toThrow();
});

it('restores legitimate multiword senses and holds context-bound approvals for review without changing text',()=>{
  const translation=(en:string,ar:string)=>after.find(h=>h.english===en)!.translations.find(t=>t.arabic===ar)!;
  expect(translation('CART','عربة التسوق')).toMatchObject({status:'approved',register:'msa',sense:'shopping cart (US usage)'});
  expect(translation('GALLERY','معرض الصور').status).toBe('approved');
  expect(translation('SAY','نقول')).toMatchObject({status:'review',preferredForEnToAr:false,preferredForArToEn:false});
  expect(translation('WEB','شبكة الإنترنت').status).toBe('review');
  expect(translation('NEW','جدد').status).toBe('approved');
  expect(translation('SET','ضبط')).toMatchObject({partOfSpeech:'verb',sense:'adjust or set equipment'});
});

it('removes only sampled unjustified restrictions and excludes the newly restricted SOURCE relationship independently by direction',()=>{
  const index=createCandidateIndex(after,'compatibility');
  const pairs=(mode:string)=>[...index.get(`13:${mode}:advanced`)!.values()].flat(2);
  expect(pairs('ar_to_en')).toContainEqual({answer:'IF',clue:'لو'});
  expect(pairs('ar_to_en')).not.toContainEqual({answer:'SOURCE',clue:'مصدر'});
  expect(pairs('en_to_ar')).toContainEqual({answer:'مصدر',clue:'SOURCE'});
  // Explicitly expose the compatibility fallback limitation; no unsampled
  // alternative is silently changed by relationship-level QA.
  expect(pairs('ar_to_en')).toContainEqual({answer:'SOURCE',clue:'المصدر'});
  for(const h of after)for(const t of h.translations)if(t.status==='rejected'){
    expect(eligibleTranslation(h,t,'compatibility','en_to_ar')).toBe(false);
    expect(eligibleTranslation(h,t,'compatibility','ar_to_en')).toBe(false);
  }
});

it('computes agreement against the frozen pre-correction baseline with explicit denominators and separate unresolved proposals',()=>{
  const s=JSON.parse(read('qa/summary.json'));
  expect(s.metrics.approvalAgreement).toEqual({agree:96,denominator:98,percent:97.96});
  expect(s.metrics.arRestrictionAgreement).toEqual({agree:22,denominator:68,percent:32.35});
  expect(s.metrics.registerAgreement).toEqual({agree:126,denominator:150,percent:84});
  expect(s.appliedFieldChanges).toBe(reviews.flatMap(r=>r.changes).filter(c=>c.applied).length);
  expect(s.unappliedProposals).toBe(35);
  expect(s.batch002Ready).toBe(false);
  expect(s.after.relationships).toBe(s.before.relationships);
  expect(readFileSync('api/generate.ts','utf8')).toContain("createCandidateIndex(DICTIONARY_STAGE3B_QA, 'compatibility')");
});
