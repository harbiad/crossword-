import {test,expect} from 'vitest';
import{DICTIONARY_BATCH005_QA as beforeDictionary}from'../api/_lib/dictionary.stage3b.batch005.qa.generated';
import {readFileSync,writeFileSync}from'node:fs';
import {gzipSync}from'node:zlib';
import {DICTIONARY_BATCH006_QA as afterDictionary}from'../api/_lib/dictionary.stage3b.batch006.qa.generated';
import {createCandidateIndex,selectCandidates,type Mode}from'../api/_lib/candidates';
import {candidatePoolLimit}from'../api/_lib/candidatePool';
import {generateCrossword,validatePuzzle}from'../src/lib/generateCrossword';
import {normalizeAnswer}from'../src/lib/preparedCandidates';
import {trace,resetTrace}from'./residual-domain-state';
const random=(seed:number)=>{let state=seed>>>0;return()=>((state=(Math.imul(state,1664525)+1013904223)>>>0)/4294967296);};
test('fresh residual diagnostics with unchanged production settings',()=>{
 const baselineControls=process.env.BATCH006_DIAGNOSTIC_BASELINE_CONTROLS==='1';
 const dictionary=baselineControls?beforeDictionary:afterDictionary;
 const root=baselineControls?'dictionary/stage3b/batch006/diagnostics_before_controls/':'dictionary/stage3b/batch006/diagnostics/';
 const configurations:readonly{size:number;mode:Mode}[]=baselineControls?[{size:7,mode:'en_to_ar'},{size:7,mode:'ar_to_en'},{size:9,mode:'ar_to_en'}]:[{size:13,mode:'ar_to_en'},{size:11,mode:'ar_to_en'},{size:13,mode:'en_to_ar'},{size:11,mode:'en_to_ar'},{size:9,mode:'en_to_ar'},{size:7,mode:'en_to_ar'},{size:7,mode:'ar_to_en'},{size:9,mode:'ar_to_en'}];
 const baseline=JSON.parse(readFileSync(baselineControls?'dictionary/stage3b/batch005/generation/runs.json':'dictionary/stage3b/batch006/generation/runs.json','utf8'))as{size:number;mode:Mode;seed:number;success:boolean}[];
 const cases=configurations.flatMap(c=>baseline.filter(r=>r.size===c.size&&r.mode===c.mode&&!r.success).sort((a,b)=>a.seed-b.seed));
 const index=createCandidateIndex(dictionary,'approved-only'),original=Math.random,summary:object[]=[];
 try{for(const c of cases){
  Math.random=random(c.seed);const pairs=selectCandidates(index,c.size,c.mode,'advanced',candidatePoolLimit(c.size,c.mode));
  Math.random=random(c.seed);resetTrace();const start=performance.now();const cw=generateCrossword(c.size,pairs,c.mode==='ar_to_en'?'ltr':'rtl');const elapsed=performance.now()-start;
  if(cw.entries.length)expect(validatePuzzle(cw.grid,cw.entries,cw.answerDirection).errors).toEqual([]);
  const file=`traces/${c.size}-${c.mode}-${c.seed}.json.gz`;
  const run={...c,diagnosticSuccess:!!cw.entries.length,candidateCount:pairs.length,sampledAnswers:[...new Set(pairs.map(p=>normalizeAnswer(p.answer)))],elapsed,attempts:trace.attempts};
  writeFileSync(root+file,gzipSync(JSON.stringify(run)));
  summary.push({...c,diagnosticSuccess:run.diagnosticSuccess,elapsed,candidateCount:pairs.length,attempts:trace.attempts.length,file});writeFileSync(root+'runs.json',JSON.stringify(summary,null,2)+'\n');
  console.log(`${summary.length}/${cases.length}: ${c.size} ${c.mode} seed ${c.seed}, ${trace.attempts.length} attempts, ${run.diagnosticSuccess?'returned puzzle':'failed'}`);
 }}finally{Math.random=original;}
 writeFileSync(root+'runs.json',JSON.stringify(summary,null,2)+'\n');expect(summary).toHaveLength(cases.length);
});
