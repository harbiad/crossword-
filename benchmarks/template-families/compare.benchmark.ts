import {test,expect,vi} from 'vitest';
import {writeFileSync,readFileSync} from 'node:fs';
import {DICTIONARY_BATCH006_QA as dictionary} from '../../api/_lib/dictionary.stage3b.batch006.qa.generated';
import {createCandidateIndex,selectCandidates} from '../../api/_lib/candidates';
import {candidatePoolLimit} from '../../api/_lib/candidatePool';
import {generateCrossword,validatePuzzle} from '../../src/lib/generateCrossword';
import * as productionTemplates from '../../src/lib/templates';
import {getTemplate,getNYTTemplate,configure,findSlots} from './layouts';
const random=(seed:number)=>{let s=seed>>>0;return()=>((s=(Math.imul(s,1664525)+1013904223)>>>0)/4294967296);};
test.runIf(process.env.FAMILY_COMPARE==='1')('same 30 seeds, unchanged runtime budgets, alternative layouts only',()=>{
 const root='template_family_13x13';const original=Math.random,originalTemplates=productionTemplates.getTemplates;
 const families=(process.env.COMPARE_FAMILIES??'current,unchecked,symmetric-unchecked').split(',');
 const policies=['approved-only','compatibility'] as const;
 const indexes=new Map(policies.map(p=>[p,createCandidateIndex(dictionary,p)]));
 const rows:object[]=[],solutions:object[]=[],templateCalls:object[]=[];
 const twoLetter=families.some(f=>f.includes('two'));
 if(twoLetter){const prior=JSON.parse(readFileSync(root+'/comparison.json','utf8'))as{family:string;policy:string}[];
  for(const family of ['current','unchecked','symmetric-unchecked'])for(const policy of policies)expect(prior.filter(r=>r.family===family&&r.policy===policy)).toHaveLength(30);}
 try{for(const seed of [0,...Array.from({length:30},(_,i)=>i+1)])for(const policy of seed%2?policies:[...policies].reverse()){
  Math.random=random(seed);const pairs=selectCandidates(indexes.get(policy)!,13,'ar_to_en','advanced',candidatePoolLimit(13,'ar_to_en'));
  const identities=new Set(pairs.map(p=>JSON.stringify([p.answer,p.clue.trim()])));
  for(const family of families){
   let signatures:string[]=[];
   const spy=vi.spyOn(productionTemplates,'getBalancedEnglishTemplates13').mockImplementation((count,rng)=>{
    const size=13,min=3;
    if(family==='current'){const t=originalTemplates(size,min,count,rng);signatures=t.map(t=>t.map(r=>r.join('')).join('/'));return t;}
    const old=Math.random;Math.random=rng??old;
    try{
     configure({density:.30,unchecked:family!=='two-fully-checked'});
     const t=Array.from({length:count??24},()=>family.includes('symmetric')?getNYTTemplate(size,family.includes('two')?2:3):getTemplate(size,family.includes('two')?2:3));
     const selected=family==='balanced-symmetric'?t.filter(grid=>{const slots=findSlots(grid);return slots.filter(s=>s.length===3).length/slots.length<=.60;}):t;
     signatures=selected.map(t=>t.map(r=>r.join('')).join('/'));return selected;
    }finally{Math.random=old;}
   });
   Math.random=random(seed);const start=performance.now();const cw=generateCrossword(13,pairs,'ltr');const ms=performance.now()-start;spy.mockRestore();
   const white=cw.grid.flat().filter(c=>c.type==='letter').length,crossings=cw.grid.flat().filter(c=>c.type==='letter'&&c.entries.size===2).length;
   if(cw.entries.length){
    expect(validatePuzzle(cw.grid,cw.entries,'ltr').errors).toEqual([]);
    expect(new Set(cw.entries.map(e=>e.answer)).size).toBe(cw.entries.length);
    for(const e of cw.entries){expect(e.answer.length).toBeGreaterThanOrEqual(family.includes('two')?2:3);expect(identities.has(JSON.stringify([e.answer,e.clue]))).toBe(true);}
   }
   const signature=cw.grid.map(row=>row.map(c=>c.type==='letter'?'1':'0').join('')).join('/');
   if(seed){
    const two=cw.entries.filter(e=>e.answer.length===2).map(e=>({answer:e.answer,clue:e.clue}));
    rows.push({seed,policy,family,success:!!cw.entries.length,ms,words:cw.entries.length,intersections:crossings,whitePct:cw.entries.length?white/169*100:null,checkedPct:cw.entries.length?crossings/white*100:null,averageLength:cw.entries.length?cw.entries.reduce((n,e)=>n+e.answer.length,0)/cw.entries.length:null,shortPct:cw.entries.length?cw.entries.filter(e=>e.answer.length<=3).length/cw.entries.length*100:null,three:cw.entries.filter(e=>e.answer.length===3).length,long:cw.entries.filter(e=>e.answer.length>=11).length,fullLength:cw.entries.filter(e=>e.answer.length===13).length,twoCount:two.length,two,signature:cw.entries.length?signature:null});
    templateCalls.push({seed,policy,family,signatures});
    if(cw.entries.length)solutions.push({seed,policy,family,cw});
    const suffix=process.env.FAMILY_COMPARE_OUTPUT??(twoLetter?'two-letter':'comparison');
    writeFileSync(root+'/'+suffix+'.json',JSON.stringify(rows));
    writeFileSync(root+'/'+suffix+'-solutions.json',JSON.stringify(solutions,(_,v)=>v instanceof Set?[...v]:v));
    writeFileSync(root+'/'+suffix+'-templates.json',JSON.stringify(templateCalls));
   }
   console.log(seed,policy,family,cw.entries.length,ms.toFixed(0));
  }
 }}finally{Math.random=original;vi.restoreAllMocks();}
 expect(rows).toHaveLength(30*policies.length*families.length);
});
