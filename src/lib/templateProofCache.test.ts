import {expect,it} from 'vitest';
import {indexCandidates} from './preparedCandidates';
import {createTemplateProofCache} from './templateProofCache';
const pool=(answers:string[])=>indexCandidates(answers.map(answer=>({answer,clue:answer})));
it('reuses exact canonical membership proofs across order, clue and object changes',()=>{
 const cache=createTemplateProofCache(),t=[[1,1],[1,1]];
 cache.add(pool(['AB','CD']),t,'ltr');
 expect(cache.has(pool(['CD','AB']),t.map(r=>[...r]),'ltr')).toBe(true);
 expect(cache.has(indexCandidates([{answer:'AB',clue:'different'},{answer:'CD',clue:'display'}]),t,'ltr')).toBe(true);
 expect(cache.has(pool(['AB','CD','EF']),t,'ltr')).toBe(false);
 expect(cache.has(pool(['AB']),t,'ltr')).toBe(false);
 expect(cache.has(pool(['AB','CD']),t,'rtl')).toBe(false);
 expect(cache.has(pool(['AB','CD']),[[1,0],[1,1]],'ltr')).toBe(false);
});
it('bounds cross-request memory and never aliases distinct answer sets',()=>{
 const cache=createTemplateProofCache(1,1),t=[[1,1],[1,1]],a=pool(['AB','CD']),b=pool(['ABC','D']);
 cache.add(a,t,'ltr');cache.add(b,t,'ltr');
 expect(cache.has(a,t,'ltr')).toBe(false);expect(cache.has(b,t,'ltr')).toBe(true);
 cache.add(b,[[1,1]],'ltr');expect(cache.has(b,t,'ltr')).toBe(false);
});
