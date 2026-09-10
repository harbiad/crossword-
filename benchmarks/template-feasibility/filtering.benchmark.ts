import {test,expect} from 'vitest';
import {writeFileSync} from 'node:fs';
import {DICTIONARY_BATCH006_QA as dictionary} from '../../api/_lib/dictionary.stage3b.batch006.qa.generated';
import {createCandidateIndex,selectCandidates} from '../../api/_lib/candidates';
import {candidatePoolLimit} from '../../api/_lib/candidatePool';
import {generateCrossword,validatePuzzle} from '../../src/lib/generateCrossword';
import {begin,measurements} from './control';
const random=(seed:number)=>{let s=seed>>>0;return()=>((s=(Math.imul(s,1664525)+1013904223)>>>0)/4294967296);};
test('paired template-only ordering and proof filtering controls',()=>{
 const index=createCandidateIndex(dictionary,'approved-only'),original=Math.random,rows:object[]=[];
 try{for(let seed=1;seed<=30;seed++){
  Math.random=random(seed);const pairs=selectCandidates(index,13,'ar_to_en','advanced',candidatePoolLimit(13,'ar_to_en'));
  for(const variant of ['A','B','C','D']){
   begin(variant);Math.random=random(seed);const start=performance.now();const cw=generateCrossword(13,pairs,'ltr');
   const ms=performance.now()-start;if(cw.entries.length)expect(validatePuzzle(cw.grid,cw.entries,'ltr').errors).toEqual([]);
   rows.push({seed,variant,success:!!cw.entries.length,ms,words:cw.entries.length,intersections:cw.grid.flat().filter(c=>c.type==='letter'&&c.entries.size===2).length,...measurements});
  }
  writeFileSync('template_feasibility_13x13/filtering.json',JSON.stringify(rows));console.log('controls',seed);
 }}finally{Math.random=original;}
});
