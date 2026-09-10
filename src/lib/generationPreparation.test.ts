import { expect, it, vi } from 'vitest';
import { generateCrossword } from './generateCrossword';
import * as candidates from './preparedCandidates';
import * as construction from './construct';
import * as templates from './templates';

it('prepares once and reuses candidate postings and geometry across attempts and identical templates', () => {
  const grid = Array.from({ length: 7 }, () => Array<number>(7).fill(1));
  const prepare = vi.spyOn(candidates, 'prepareCandidates');
  const construct = vi.spyOn(construction, 'constructCrossword').mockReturnValue([]);
  vi.spyOn(templates, 'getTemplates').mockReturnValue([grid, grid.map(row => row.slice())]);
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  try {
    expect(generateCrossword(7, [{ answer: 'EXAMPLE', clue: 'word' }], 'ltr').entries).toEqual([]);
    expect(prepare).toHaveBeenCalledTimes(1);
    expect(construct.mock.calls.length).toBeGreaterThan(2);
    const first = construct.mock.calls[0][4]!;
    for (const call of construct.mock.calls) {
      expect(call[4]!.preparedCandidates).toBe(first.preparedCandidates);
      expect(call[4]!.preparedTemplate).toBe(first.preparedTemplate);
    }
  } finally { vi.restoreAllMocks(); }
});

it('keeps every received candidate in solver windows when a length bucket grows',()=>{
 const grid=Array.from({length:7},()=>Array<number>(7).fill(1));
 const words=Array.from({length:1500},(_,i)=>({answer:'WORD'+[Math.floor(i/676),Math.floor(i/26)%26,i%26].map(n=>String.fromCharCode(65+n)).join(''),clue:'fixture'}));
 const construct=vi.spyOn(construction,'constructCrossword').mockReturnValue([]);
 vi.spyOn(templates,'getTemplates').mockReturnValue([grid]);vi.spyOn(console,'warn').mockImplementation(()=>{});
 try {
  generateCrossword(7,words,'ltr');
  expect(construct).toHaveBeenCalled();
  for(const call of construct.mock.calls)expect(call[4]!.candidateWindows!.get(7)!.count).toBe(words.length);
 }finally{vi.restoreAllMocks();}
});

it('revisits promising 11x11 layouts with a different value order without changing candidates',()=>{
 const make=(offset:number)=>Array.from({length:11},(_,r)=>Array.from({length:11},(_,c)=>Number(r<2&&c>=offset&&c<offset+3)));
 const a=make(0),b=make(4);
 const construct=vi.spyOn(construction,'constructCrossword').mockImplementation((_size,_words,template,_direction,options)=>{
  if(options?.searchProgress)options.searchProgress.maxDepth=template===b?3:1;
  return [];
 });
 vi.spyOn(templates,'getTemplates').mockReturnValue([a,b]);vi.spyOn(console,'warn').mockImplementation(()=>{});
 try{
  generateCrossword(11,[{answer:'ABC',clue:'one'},{answer:'AB',clue:'two'}],'ltr');
  const first=construct.mock.calls.find(c=>c[4]?.valueOrder==='input')!;
  const revisit=construct.mock.calls.find(c=>c[4]?.valueOrder==='lexical')!;
  expect(first[2]).toBe(a);expect(revisit[2]).toBe(b);
  expect(revisit[4]!.preparedCandidates).toBe(first[4]!.preparedCandidates);
  expect(revisit[4]!.timeBudgetMs).toBeLessThanOrEqual(350);
 }finally{vi.restoreAllMocks();}
});
