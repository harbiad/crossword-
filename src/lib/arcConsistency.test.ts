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
