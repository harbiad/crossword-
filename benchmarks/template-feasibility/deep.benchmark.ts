import {test,expect} from 'vitest';
import {readFileSync,writeFileSync} from 'node:fs';
import {prepareCandidates} from '../../src/lib/preparedCandidates';
import {constructArc} from '../search/arc-experiment';
import {counts,reset,proofs} from '../search/state';
import {buildCrosswordFromPlacements} from '../../src/lib/generateCrossword';
test.runIf(process.env.TEMPLATE_DEEP==='1')('resolve unknown exploration layouts offline',()=>{
 const dir='template_feasibility_13x13';const full=JSON.parse(readFileSync(dir+'/full-pool.json','utf8'));const prepared=prepareCandidates(full,13,()=>.5);
 const input=JSON.parse(readFileSync(dir+'/exploration.json','utf8')) as {signature:string;proof:string;score:number}[];
 const unique=[...new Map(input.filter(r=>!r.proof).map(r=>[r.signature,r])).values()].sort((a,b)=>b.score-a.score);
 const rows:object[]=[],found:object[]=[];
 for(const r of unique){
  const t=r.signature.split('/').map(row=>[...row].map(Number));reset();const start=performance.now();
  const p=constructArc(13,prepared.words,t,'ltr',{preparedCandidates:prepared,timeBudgetMs:5000});
  rows.push({...r,ms:performance.now()-start,success:!!p.length,...counts,proof:proofs[0]?.reason??''});
  if(p.length){expect(buildCrosswordFromPlacements(13,t,p,'ltr')).not.toBeNull();found.push({t,p});writeFileSync(dir+'/discovered.json',JSON.stringify(found));}
  writeFileSync(dir+'/deep.json',JSON.stringify(rows));console.log('deep',rows.length,unique.length,found.length);
 }
});
