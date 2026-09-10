import {expect,it} from 'vitest';
import {generationRandom} from './generationRandom';
import {prepareCandidates} from './preparedCandidates';
import {getBalancedEnglishTemplates13} from './templates';
it('keeps layouts identical when candidate membership and ordering change',()=>{
 const words=['CAT','DOG','BIRD','PLANT'].map(answer=>({answer,clue:answer}));
 const a=generationRandom(42), b=generationRandom(42);
 prepareCandidates(words,13,a.candidates);
 prepareCandidates([...words].reverse().concat({answer:'ADDITION',clue:'addition'}),13,b.candidates);
 expect(getBalancedEnglishTemplates13(4,a.templates)).toEqual(getBalancedEnglishTemplates13(4,b.templates));
});
it('varies layouts between seeds and keeps candidate and template streams independent',()=>{
 const a=generationRandom(42), b=generationRandom(42);
 for(let i=0;i<1000;i++)a.templates();
 expect(a.candidates()).toBe(b.candidates());
 expect(getBalancedEnglishTemplates13(2,generationRandom(42).templates)).not.toEqual(getBalancedEnglishTemplates13(2,generationRandom(43).templates));
});
