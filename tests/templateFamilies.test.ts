import {expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {configure,getTemplate,findSlots} from '../benchmarks/template-families/layouts';
import {validateBlockRuns,type Placement} from '../src/lib/construct';
import {buildCrosswordFromPlacements,validatePuzzle} from '../src/lib/generateCrossword';
import {DICTIONARY_BATCH006_QA as dictionary} from '../api/_lib/dictionary.stage3b.batch006.qa.generated';
import {createCandidateIndex} from '../api/_lib/candidates';
it('experimental 3+ layouts cover every white cell and retain the block-run limit',()=>{
 configure({density:.30,unchecked:true});
 const original=Math.random;let seed=71;Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
 try{for(let n=0;n<10;n++){
  const t=getTemplate(13,3),slots=findSlots(t),covered=new Set<string>();
  expect(slots.every(s=>s.length>=3)).toBe(true);
  for(const s of slots)for(let i=0;i<s.length;i++)covered.add(`${s.row+(s.direction==='down'?i:0)},${s.col+(s.direction==='across'?i:0)}`);
  for(let r=0;r<13;r++)for(let c=0;c<13;c++)if(t[r][c])expect(covered.has(`${r},${c}`)).toBe(true);
  expect(validateBlockRuns(t.map(row=>row.map(c=>c?'A':'#')),13)).toBe(true);
  expect(t.flat().filter(c=>!c).length).toBeLessThanOrEqual(Math.floor(169*.30));
 }}finally{Math.random=original;configure({density:.30});}
});
it('a 3+ witness with no 13-letter slots passes the unchanged validator using approved canonical answers',()=>{
 const data=JSON.parse(readFileSync('template_family_13x13/feasible.json','utf8'))as{t:number[][];p:Placement[]}[];
 const witness=data.find(x=>findSlots(x.t).every(s=>s.length<13))!;
 expect(witness).toBeDefined();
 const cw=buildCrosswordFromPlacements(13,witness.t,witness.p,'ltr')!;
 expect(cw).not.toBeNull();expect(validatePuzzle(cw.grid,cw.entries,'ltr').errors).toEqual([]);
 expect(cw.entries.every(e=>e.answer.length>=3)).toBe(true);
 expect(cw.grid.flat().some(c=>c.type==='letter'&&c.entries.size===1)).toBe(true);
 const pool=[...createCandidateIndex(dictionary,'approved-only').get('13:ar_to_en:advanced')!.values()].flatMap(g=>g.flat());
 const eligible=new Set(pool.map(p=>JSON.stringify([p.answer,p.clue])));
 expect(new Set(cw.entries.map(e=>e.answer)).size).toBe(cw.entries.length);
 for(const e of cw.entries)expect(eligible.has(JSON.stringify([e.answer,e.clue]))).toBe(true);
});
it('the balanced approved-only cohort preserves 3+ entries, quality limits and validation',()=>{
 const data=JSON.parse(readFileSync('template_family_13x13/balanced-solutions.json','utf8'))as{policy:string;cw:import('../src/lib/crossword').Crossword}[];
 const approved=data.filter(r=>r.policy==='approved-only');expect(approved).toHaveLength(30);
 for(const {cw}of approved){
  const template=cw.grid.map(row=>row.map(c=>Number(c.type==='letter')));
  const replay=buildCrosswordFromPlacements(13,template,cw.entries,'ltr')!;
  expect(replay).not.toBeNull();expect(validatePuzzle(replay.grid,replay.entries,'ltr').errors).toEqual([]);
  expect(replay.entries.every(e=>e.answer.length>=3)).toBe(true);
  expect(replay.entries.filter(e=>e.answer.length===3).length/replay.entries.length).toBeLessThanOrEqual(.60);
 }
});
