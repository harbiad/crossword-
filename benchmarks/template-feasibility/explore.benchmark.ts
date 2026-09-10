import {test,expect} from 'vitest';
import {readFileSync,writeFileSync} from 'node:fs';
import {prepareCandidates} from '../../src/lib/preparedCandidates';
import {getTemplates,findSlots} from './layouts';
import {setBlockRatio} from './layouts';
import {constructArc} from '../search/arc-experiment';
import {counts,reset,proofs} from '../search/state';
import {buildCrosswordFromPlacements} from '../../src/lib/generateCrossword';
import {templateSupport} from '../search/template-support';
import {prepareTemplate} from '../../src/lib/preparedTemplate';
test.runIf(process.env.TEMPLATE_EXPLORE==='1')('explore additional unchanged-constraint layouts',()=>{
 const dir='template_feasibility_13x13';const full=JSON.parse(readFileSync(dir+'/full-pool.json','utf8'));const prepared=prepareCandidates(full,13,()=>.5);
 let state=73519;const original=Math.random;Math.random=()=>((state=(Math.imul(state,1664525)+1013904223)>>>0)/4294967296);
 const results:object[]=[],found:object[]=[];
 try{for(let batch=0;batch<Number(process.env.TEMPLATE_BATCHES??55);batch++){
  const ratios=(process.env.TEMPLATE_DENSITIES??'.18,.22,.26,.30').split(',').map(Number);
  setBlockRatio(ratios[batch%ratios.length]);
  const templates=getTemplates(13,3,100).map(t=>({t,score:templateSupport(prepared,prepareTemplate(t,'ltr'))})).sort((a,b)=>b.score-a.score);
  for(const {t,score}of templates){
   reset();const start=performance.now();const p=constructArc(13,prepared.words,t,'ltr',{preparedCandidates:prepared,timeBudgetMs:100});
   results.push({batch,signature:t.map(r=>r.join('')).join('/'),score,ms:performance.now()-start,slots:findSlots(t).length,success:!!p.length,proof:proofs[0]?.reason??'',...counts});
   if(p.length){const cw=buildCrosswordFromPlacements(13,t,p,'ltr');expect(cw).not.toBeNull();found.push({t,p,score});writeFileSync(dir+'/discovered.json',JSON.stringify(found));console.log('FOUND',found.length,results.length);}
  }
  writeFileSync(dir+'/'+(process.env.TEMPLATE_EXPLORATION_OUTPUT??'exploration.json'),JSON.stringify(results));console.log('explore',batch,found.length);
  if(found.length>=12)break;
 }}finally{Math.random=original;}
});
