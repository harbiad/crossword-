import {test,expect} from 'vitest';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {prepareCandidates} from '../../src/lib/preparedCandidates';
import {getTemplate,getNYTTemplate,findSlots,configure} from './layouts';
import {constructArc} from '../search/arc-experiment';
import {counts,reset,proofs} from '../search/state';
import {buildCrosswordFromPlacements,validatePuzzle} from '../../src/lib/generateCrossword';
import {templateSupport} from '../search/template-support';
import {prepareTemplate} from '../../src/lib/preparedTemplate';
test.runIf(process.env.FAMILY_DISCOVERY==='1')('discover alternative 3+ template families',()=>{
 const root='template_family_13x13',full=JSON.parse(readFileSync('template_feasibility_13x13/full-pool.json','utf8'));
 const prepared=prepareCandidates(full,13,()=>.5);
 const families=(process.env.FAMILIES??'unchecked,symmetric-unchecked,fully-checked,block-run-3').split(',');
 const original=Math.random;const rows:object[]=[],found:object[]=[];
 try{for(const family of families){
  let state=81281;Math.random=()=>((state=(Math.imul(state,1664525)+1013904223)>>>0)/4294967296);
  for(let batch=0;batch<Number(process.env.FAMILY_BATCHES??10);batch++){
   const density=[.30,.26,.22,.18][batch%4];configure({density,unchecked:family.includes('unchecked'),blockRun:family==='block-run-3'?3:2});
   const templates=Array.from({length:50},()=>family==='symmetric-unchecked'?getNYTTemplate(13,3):getTemplate(13,3)).map(t=>({t,score:templateSupport(prepared,prepareTemplate(t,'ltr'))})).sort((a,b)=>b.score-a.score);
   for(const {t,score}of templates){
    const slots=findSlots(t),signature=t.map(r=>r.join('')).join('/'),id=createHash('sha256').update(signature).digest('hex').slice(0,16);
    const white=t.flat().filter(Boolean).length,letters=slots.reduce((n,s)=>n+s.length,0),crossings=letters-white;
    reset();const start=performance.now();const p=constructArc(13,prepared.words,t,'ltr',{preparedCandidates:prepared,timeBudgetMs:150});const ms=performance.now()-start;
    const cw=p.length?buildCrosswordFromPlacements(13,t,p,'ltr'):null;
    if(cw){expect(validatePuzzle(cw.grid,cw.entries,'ltr').errors).toEqual([]);expect(cw.entries.every(e=>e.answer.length>=3)).toBe(true);found.push({family,density,id,t,p,score});writeFileSync(root+'/feasible.json',JSON.stringify(found));}
    rows.push({family,batch,density,id,signature,score,ms,slots:slots.length,white,whitePct:white/169*100,crossings,checkedPct:crossings/white*100,averageLength:letters/slots.length,shortPct:slots.filter(s=>s.length<=3).length/slots.length*100,three:slots.filter(s=>s.length===3).length,long:slots.filter(s=>s.length>=11).length,fullLength:slots.filter(s=>s.length===13).length,solutionFound:!!p.length,validatorPassed:!!cw,proof:proofs[0]?.reason??'',...counts});
   }
   writeFileSync(root+'/discovery.json',JSON.stringify(rows));console.log(family,batch,'solutions',found.length);
  }
 }}finally{Math.random=original;}
});
