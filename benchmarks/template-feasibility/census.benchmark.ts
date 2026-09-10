import {test,expect} from 'vitest';
import {mkdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {DICTIONARY_BATCH006_QA as dictionary} from '../../api/_lib/dictionary.stage3b.batch006.qa.generated';
import {createCandidateIndex,selectCandidates} from '../../api/_lib/candidates';
import {candidatePoolLimit} from '../../api/_lib/candidatePool';
import {prepareCandidates} from '../../src/lib/preparedCandidates';
import {generationRandom} from '../../src/lib/generationRandom';
import {getTemplates,findSlots} from '../../src/lib/templates';
import {constructArc} from '../search/arc-experiment';
import {counts,reset,proofs,experiment,depths} from '../search/state';
import {buildCrosswordFromPlacements} from '../../src/lib/generateCrossword';
import {enableTrace,trace} from '../search/diagnostics';
export const random=(seed:number)=>{let state=seed>>>0;return()=>((state=(Math.imul(state,1664525)+1013904223)>>>0)/4294967296);};
test('classify production templates against the full approved pool',()=>{
 const dir=process.env.TEMPLATE_CENSUS_OUTPUT??'template_feasibility_13x13';mkdirSync(dir,{recursive:true});
 const index=createCandidateIndex(dictionary,'approved-only');
 const full=[...index.get('13:ar_to_en:advanced')!.values()].flatMap(g=>g.flat());
 const prepared=prepareCandidates(full,13,random(1));
 const original=Math.random,rows:object[]=[],templates=new Map<string,number[][]>();
 try{for(let seed=1;seed<=30;seed++){
  Math.random=random(seed);const pairs=selectCandidates(index,13,'ar_to_en','advanced',candidatePoolLimit(13,'ar_to_en'));
  expect(new Set(pairs.map(p=>p.answer))).toEqual(new Set(full.map(p=>p.answer)));
  Math.random=random(seed);
  const streams=process.env.TEMPLATE_INDEPENDENT==='1'?generationRandom(Math.floor(Math.random()*4294967296)):undefined;
  prepareCandidates(pairs,13,streams?.candidates);
  for(const template of getTemplates(13,3,24,streams?.templates)){
   const signature=template.map(r=>r.join('')).join('/'),id=createHash('sha256').update(signature).digest('hex').slice(0,16);
   const slots=findSlots(template),sizes=slots.map(s=>prepared.byLength.get(s.length)?.words.length??0).sort((a,b)=>a-b);
   const lengths:Record<number,number>={};for(const s of slots)lengths[s.length]=(lengths[s.length]??0)+1;
   reset();enableTrace(true);experiment.portfolio=true;const start=performance.now();const result=constructArc(13,prepared.words,template,'ltr',{preparedCandidates:prepared,timeBudgetMs:500});const ms=performance.now()-start;
   const classification=!sizes[0]?'A':result.length?'D':proofs.some(p=>p.reason==='root-arc')?'B':proofs.some(p=>p.reason==='exhaustive-search')?'C':'E';
   if(result.length)expect(buildCrosswordFromPlacements(13,template,result,'ltr')).not.toBeNull();
   const root=trace.find(t=>(t as {stage:string}).stage==='after-propagation') as {domains:unknown[][]}|undefined;
   const propagated=root?.domains.map(d=>d.length)??[];
   const survival=propagated.reduce((a,b)=>a+b,0)/(2*sizes.reduce((a,b)=>a+b,0));
   rows.push({seed,id,survival,propagatedMinimum:propagated.length?Math.min(...propagated):0,propagatedSmall:propagated.filter(n=>n<=6).length,depth:Math.max(0,...depths.values()),slots:slots.length,lengths,min:sizes[0],median:sizes[Math.floor(sizes.length/2)],max:sizes.at(-1),smallSlots:sizes.filter(n=>n<=3).length,classification,ms,...counts});templates.set(id,template);
  }
  writeFileSync(dir+'/census.json',JSON.stringify(rows));console.log('census',seed,rows.length);
 }}finally{Math.random=original;}
 writeFileSync(dir+'/templates.json',JSON.stringify(Object.fromEntries(templates)));
 writeFileSync(dir+'/full-pool.json',JSON.stringify(full));
});
