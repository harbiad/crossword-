import { test,expect } from 'vitest';
import {readFileSync,writeFileSync} from 'node:fs';
import { DICTIONARY_BATCH004_QA as beforeDictionary } from '../api/_lib/dictionary.stage3b.batch004.qa.generated';
import { DICTIONARY_BATCH005_QA as afterDictionary } from '../api/_lib/dictionary.stage3b.batch005.qa.generated';
import {createCandidateIndex,selectCandidates,type Mode} from '../api/_lib/candidates';
import {candidatePoolLimit} from '../api/_lib/candidatePool';
import {generateCrossword,validatePuzzle} from '../src/lib/generateCrossword';
import {prepareCandidates,lookupCandidates} from '../src/lib/preparedCandidates';
import {domainTrace,resetDomainTrace} from './batch005-domain-state';
const random=(seed:number)=>{let state=seed>>>0;return()=>((state=(Math.imul(state,1664525)+1013904223)>>>0)/4294967296);};
test('observe current approved-only failed domains without changing search options',()=>{
 const after=process.env.BATCH005_DOMAINS_PHASE==='after';
 const dictionary=after?afterDictionary:beforeDictionary;
 const base=after?'dictionary/stage3b/batch005/':'dictionary/stage3b/batch004/';
 const seen=new Map<string,number>();
 const cases=(JSON.parse(readFileSync(base+'generation/runs.json','utf8')) as {seed:number;size:number;mode:Mode;success:boolean}[]).filter(r=>!r.success).filter(r=>{if(!after)return true;const key=`${r.size}:${r.mode}`,n=seen.get(key)??0;seen.set(key,n+1);return n<5;});
 const index=createCandidateIndex(dictionary,'approved-only'),original=Math.random,rows:object[]=[];
 try{for(const c of cases){
  Math.random=random(c.seed);const pairs=selectCandidates(index,c.size,c.mode,'advanced',candidatePoolLimit(c.size,c.mode));
  Math.random=random(c.seed);resetDomainTrace();const cw=generateCrossword(c.size,pairs,c.mode==='ar_to_en'?'ltr':'rtl');
  if(cw.entries.length)expect(validatePuzzle(cw.grid,cw.entries,cw.answerDirection).errors).toEqual([]);
  const prepared=prepareCandidates(pairs,c.size,random(c.seed));
  const events=domainTrace.events.map(e=>{const pattern=[...e.pattern].map(c=>c==='?'?null:c);const matches=[...lookupCandidates(prepared,pattern,new Set())];const valid=(answer:string,inverted:boolean)=>e.constraints.every(c=>c.characters.includes(answer[inverted?answer.length-1-c.position:c.position]));
   const compatible=matches.filter(w=>valid(w.answer,w.isInverted));return {...e,sampledPatternUnique:new Set(matches.map(w=>w.answer)).size,sampledSupportUnique:new Set(compatible.map(w=>w.answer)).size,sampledUnusedSupportUnique:new Set(compatible.filter(w=>!e.used.includes(w.answer)).map(w=>w.answer)).size};});
  rows.push({seed:c.seed,size:c.size,mode:c.mode,baselineSuccess:false,diagnosticSuccess:!!cw.entries.length,attempts:domainTrace.attempt,dropped:domainTrace.dropped,candidateCount:pairs.length,events});
  writeFileSync(`dictionary/stage3b/batch005/diagnostics/${after?'after-runs':'runs'}.json`,JSON.stringify(rows)+'\n');console.log(c.seed,c.size,c.mode,events.length,'domains',cw.entries.length?'success':'failed');
 }}finally{Math.random=original;}
 expect(rows).toHaveLength(cases.length);
});
