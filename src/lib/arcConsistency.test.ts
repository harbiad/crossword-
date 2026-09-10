import { describe, it, expect, vi } from 'vitest';
import { constructArc } from './arcConsistency';
import { getEntryCellAt } from './crossword';

describe('arc-consistency solver',()=>{
 for(const direction of ['ltr','rtl'] as const)for(const arabic of [false,true])it(`preserves canonical words and crossings ${direction} Arabic=${arabic}`,()=>{
  const answers=arabic?['جبا','زهد','دا','به','زج']:['CBA','FED','DA','BE','FC'];
  const words=answers.map(answer=>({answer,clue:answer}));
  const template=[[1,1,1],[1,1,1],[0,0,0]];
  const placements=constructArc(3,words,template,direction,{timeBudgetMs:1000});
  expect(placements).toHaveLength(5);
  expect(new Set(placements.map(p=>p.answer))).toEqual(new Set(answers));
  const cells=new Map<string,string>();
  for(const entry of placements)for(let i=0;i<entry.answer.length;i++){
   const {r,c}=getEntryCellAt(entry,i,direction),key=`${r},${c}`;
   expect(template[r][c]).toBe(1);
   if(cells.has(key))expect(cells.get(key)).toBe(entry.answer[i]);
   cells.set(key,entry.answer[i]);
  }
  expect(cells.size).toBe(6);
  expect(placements.some(p=>p.isInverted)).toBe(true);
  expect(words.map(w=>w.answer)).toEqual(answers);
 });
 it('does not reuse canonical answers with different clues or orientations',()=>{
  expect(constructArc(2,[{answer:'AA',clue:'first'},{answer:'AA',clue:'second'}],[[1,1],[1,1]],'ltr',{timeBudgetMs:1000})).toEqual([]);
 });
 it('rejects crossing-incompatible domains without returning partial placements',()=>{
  expect(constructArc(3,['ABC','DEF','ZZ','YY','XX'].map(answer=>({answer,clue:answer})),[[1,1,1],[1,1,1],[0,0,0]],'ltr',{timeBudgetMs:1000})).toEqual([]);
 });
 it('restores domains after an initially supported choice fails all-different propagation',()=>{
  const placements=constructArc(2,['AA','AB','AC','CD','BD'].map(answer=>({answer,clue:answer})),[[1,1],[1,1]],'ltr',{timeBudgetMs:1000});
  expect(placements).toHaveLength(4);
  expect(placements.some(p=>p.answer==='AA')).toBe(false);
  const cells=new Map<string,string>();
  for(const entry of placements)for(let i=0;i<entry.answer.length;i++){
   const {r,c}=getEntryCellAt(entry,i,'ltr'),key=`${r},${c}`;
   if(cells.has(key))expect(cells.get(key)).toBe(entry.answer[i]);
   cells.set(key,entry.answer[i]);
  }
 });
 it('respects the attempt deadline',()=>{
  let time=0;const spy=vi.spyOn(performance,'now').mockImplementation(()=>time+=10);
  try{expect(constructArc(2,['AB','CD','AC','BD'].map(answer=>({answer,clue:answer})),[[1,1],[1,1]],'ltr',{timeBudgetMs:1})).toEqual([]);}finally{spy.mockRestore();}
 });
});

it('reuses complete impossibility proofs, but never poisons a larger candidate domain', async () => {
 const { indexCandidates } = await import('./preparedCandidates');
 const prepared=indexCandidates(['AA','AB','AC','CD','BD'].map(answer=>({answer,clue:answer})));
 const template=[[1,1],[1,1]];
 expect(constructArc(2,prepared.words,template,'ltr',{preparedCandidates:prepared,candidateWindows:new Map([[2,{offset:0,count:1}]]),timeBudgetMs:1000})).toEqual([]);
 expect(constructArc(2,prepared.words,template,'ltr',{preparedCandidates:prepared,timeBudgetMs:1000})).toHaveLength(4);
 const impossible=indexCandidates([{answer:'AA',clue:'only one canonical answer'}]);
 const clock=performance.now.bind(performance);let calls=0;
 const spy=vi.spyOn(performance,'now').mockImplementation(()=>{calls++;return clock();});
 try {
  expect(constructArc(2,impossible.words,template,'ltr',{preparedCandidates:impossible,timeBudgetMs:1000})).toEqual([]);
  const first=calls;calls=0;
  expect(constructArc(2,impossible.words,template,'ltr',{preparedCandidates:impossible,timeBudgetMs:1000})).toEqual([]);
  expect(calls).toBeLessThan(first);
 } finally {spy.mockRestore();}
});

it('does not remember a deadline failure as an impossibility proof',async()=>{
 const {indexCandidates}=await import('./preparedCandidates');
 const prepared=indexCandidates(['AA','AB','AC','CD','BD'].map(answer=>({answer,clue:answer})));
 let time=0;const spy=vi.spyOn(performance,'now').mockImplementation(()=>time+=10);
 try {expect(constructArc(2,prepared.words,[[1,1],[1,1]],'ltr',{preparedCandidates:prepared,timeBudgetMs:1})).toEqual([]);}finally{spy.mockRestore();}
 expect(constructArc(2,prepared.words,[[1,1],[1,1]],'ltr',{preparedCandidates:prepared,timeBudgetMs:1000})).toHaveLength(4);
});

it('agrees with an independent exhaustive 2x2 oracle across all small vocabulary subsets',()=>{
 const universe=['AA','AB','AC','BB','BC','CC'];
 for(let mask=0;mask<1<<universe.length;mask++){
  const answers=universe.filter((_,i)=>mask&(1<<i));
  const values=answers.flatMap(answer=>[{answer,text:answer},{answer,text:answer[1]+answer[0]}]);
  const feasible=values.some(top=>values.some(bottom=>top.answer!==bottom.answer&&values.some(left=>left.answer!==top.answer&&left.answer!==bottom.answer&&left.text===top.text[0]+bottom.text[0]&&values.some(right=>right.answer!==top.answer&&right.answer!==bottom.answer&&right.answer!==left.answer&&right.text===top.text[1]+bottom.text[1]))));
  const result=constructArc(2,answers.map(answer=>({answer,clue:answer})),[[1,1],[1,1]],'ltr',{timeBudgetMs:1000});
  expect(result.length>0,`subset ${answers.join(',')}`).toBe(feasible);
 }
});

it('preserves crossing and canonical identity with 9x9 value ordering and distractors',()=>{
 const template=Array.from({length:9},(_,r)=>Array.from({length:9},(_,c)=>Number(r<2&&c<3)));
 const answers=['AAA','CBA','FED','DA','BE','FC'];
 const result=constructArc(9,answers.map(answer=>({answer,clue:answer})),template,'ltr',{timeBudgetMs:1000});
 expect(result).toHaveLength(5);expect(new Set(result.map(p=>p.answer)).size).toBe(5);
 const cells=new Map<string,string>();
 for(const entry of result)for(let i=0;i<entry.answer.length;i++){
  const {r,c}=getEntryCellAt(entry,i,'ltr'),key=`${r},${c}`;
  expect(template[r][c]).toBe(1);if(cells.has(key))expect(cells.get(key)).toBe(entry.answer[i]);cells.set(key,entry.answer[i]);
 }
 expect(cells.size).toBe(6);
});
