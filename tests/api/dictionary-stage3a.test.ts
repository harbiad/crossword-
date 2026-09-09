import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { DICTIONARY } from '../../api/_lib/dictionary.generated';
import { DICTIONARY_STAGE2 } from '../../api/_lib/dictionary.stage2.generated';
import { DICTIONARY_STAGE3A } from '../../api/_lib/dictionary.stage3a.generated';
import { DICT_COMMON_3000_ABBREV } from '../../api/dict_common_3000_abbrev';
import { cleanupStage2 } from '../../scripts/stage2';
import { applyStage3a, stage3Scope, type Stage3Decision } from '../../scripts/stage3a';
import { normalizeArabicWord, buildReverseIndex } from '../../api/_lib/dictionary';
import { createCandidateIndex } from '../../api/_lib/candidates';

const stage2 = cleanupStage2(DICTIONARY, new Set(Object.keys(DICT_COMMON_3000_ABBREV)));
const decisions = JSON.parse(readFileSync('dictionary/stage3a/decisions.json','utf8')) as Stage3Decision[];
const result = applyStage3a(stage2, decisions);
const byCoordinate = new Map(result.decisions.map(d=>[`${d.headwordIndex}:${d.translationIndex}`, d]));

it('covers exactly the bounded priority scope and preserves every unreviewed record, count and source snapshot', () => {
  expect(stage3Scope(stage2).size).toBe(706);
  expect(result.decisions).toHaveLength(706);
  expect(result.dictionary).toEqual(DICTIONARY_STAGE3A);
  expect(stage2.dictionary).toEqual(DICTIONARY_STAGE2);
  let untouched=0;
  DICTIONARY_STAGE2.forEach((h,i)=>{
    const after=result.dictionary[i];
    expect(after.english).toBe(h.english);
    expect(after.cefr).toBe(h.cefr);
    expect(after.translations).toHaveLength(h.translations.length);
    h.translations.forEach((t,j)=>{
      const decision=byCoordinate.get(`${i}:${j}`);
      if(!decision){expect(after.translations[j]).toEqual(t);untouched++;}
      else {
        expect(after.translations[j].arabic).toBe(decision.applied ? decision.proposedReplacement : t.arabic);
        expect(after.translations[j]).toEqual({...t,arabic:decision.finalArabic,status:decision.status,register:decision.register});
      }
      if(t.status==='rejected')expect(after.translations[j].status).toBe('rejected');
    });
    if(h.status!==after.status)expect(h.translations.every((_,j)=>byCoordinate.has(`${i}:${j}`))).toBe(true);
  });
  expect(untouched).toBe(28761);
});

it('applies only explicit high-confidence corrections and leaves uncertain proposals unchanged', () => {
  expect(result.decisions.filter(d=>d.applied)).toHaveLength(40);
  for(const d of result.decisions){
    if(d.confidence!=='high'){expect(d.status).toBe('review');expect(d.finalArabic).toBe(d.original);}
    if(d.applied){expect(d.confidence).toBe('high');expect(d.register).toBe('msa');expect(d.reason.length).toBeGreaterThan(0);}
  }
  const step=result.decisions.find(d=>d.english==='STEP')!;
  expect(step).toMatchObject({finalArabic:'خطوة خطوة',applied:false,status:'review',repetitionAssessment:'meaningful'});
  expect(result.decisions.find(d=>d.english==='PROPER')).toMatchObject({original:'السليم السليم',finalArabic:'السليم',applied:true});
});

it.each(['stale','outside','missing','duplicate','medium-correction','medium-rejection'])('rejects an unsafe %s manifest', kind => {
  const changed=structuredClone(decisions);
  const corrected=changed.find(d=>d.applied)!;
  if(kind==='stale')changed[0].original='stale';
  if(kind==='outside')changed[0].sourceId='h99999:t0';
  if(kind==='missing')changed.pop();
  if(kind==='duplicate')changed.push(changed[0]);
  if(kind==='medium-correction')corrected.confidence='medium';
  if(kind==='medium-rejection'){const rejected=changed.find(d=>d.status==='rejected')!;rejected.confidence='medium';}
  expect(()=>applyStage3a(stage2,changed)).toThrow();
});

it('preserves valid natural multiword text, loanwords and lexical meanings of brand homonyms', () => {
  for(const [english,arabic] of [['PROPERLY','بشكل صحيح'],['FOR','من أجل'],['PERCENTAGE','النسبة المئوية']]){
    expect(result.dictionary.find(h=>h.english===english)?.translations.some(t=>t.arabic===arabic)).toBe(true);
    expect(normalizeArabicWord(arabic)).toBe(arabic.replace(/\s/g,''));
  }
  expect(result.decisions.find(d=>d.english==='WINDOWS' && d.original==='نوافذ')?.status).toBe('approved');
  expect(result.decisions.find(d=>d.english==='WINDOWS' && d.original==='ويندوز')?.status).toBe('rejected');
  expect(result.decisions.find(d=>d.english==='COCA' && d.original==='كوكا')?.status).toBe('approved');
  expect(result.decisions.find(d=>d.english==='GEL' && d.original==='جل')?.status).toBe('approved');
});

it.each(['en_to_ar','ar_to_en'])('uses explicit compatibility/strict policies and excludes rejected data in %s', mode=>{
  const index=createCandidateIndex(result.dictionary,'compatibility');
  const pairs=[...index.get(`13:${mode}:advanced`)!.values()].flat(2);
  const english=(p:{answer:string;clue:string})=>mode==='en_to_ar'?p.clue:p.answer;
  expect(pairs.some(p=>english(p)==='LONDON')).toBe(false);
  expect(pairs.some(p=>english(p)==='WINDOWS')).toBe(true);
  expect(pairs.some(p=>p.clue==='ويندوز')).toBe(false);
  const strict=[...createCandidateIndex(result.dictionary,'approved-only').get(`13:${mode}:advanced`)!.values()].flat(2);
  expect(strict.length).toBeLessThan(pairs.length);
  expect(strict.every(p=>result.dictionary.find(h=>h.english===english(p))?.status==='approved')).toBe(true);
});

it('retains many-to-many relationships and exports every decision including actual before/after grids', () => {
  expect([...buildReverseIndex(result.dictionary).values()].some(refs=>new Set(refs.map(r=>r.english)).size>1)).toBe(true);
  const csv=readFileSync('dictionary/stage3a/decisions.csv','utf8');
  for(const d of result.decisions){
    expect(csv).toContain(`"${d.sourceId}"`);
    expect(d.beforeGrid).toBe(normalizeArabicWord(d.original));
    expect(d.afterGrid).toBe(normalizeArabicWord(d.finalArabic));
  }
});
