import { test, expect } from 'vitest';
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { DICTIONARY_BATCH003_QA as dictionary } from '../api/_lib/dictionary.stage3b.batch003.qa.generated';
import { createCandidateIndex, selectCandidates, type Mode } from '../api/_lib/candidates';
import type { DictionaryPolicy } from '../api/_lib/dictionary';
import { generateCrossword, validatePuzzle } from '../src/lib/generateCrossword';
import { prepareCandidates, lookupCandidates } from '../src/lib/preparedCandidates';
import { diagnostic, control, resetDiagnostic } from './diagnostic-state';
function random(seed:number){let state=seed>>>0;return()=>((state=(Math.imul(state,1664525)+1013904223)>>>0)/4294967296);}
test('controlled generator failure investigation',()=>{
 const indexes=new Map((['compatibility','approved-only'] as const).map(p=>[p,createCandidateIndex(dictionary,p)]));
 const configurations: {size:number;mode:Mode;policy:DictionaryPolicy}[] = [
 ...[7,9,11,13].flatMap(size=>(['compatibility','approved-only'] as const).map(policy=>({size,mode:'ar_to_en' as const,policy}))),
 ...(['compatibility','approved-only'] as const).map(policy=>({size:13,mode:'en_to_ar' as const,policy})),
 ];
 const experiments = (process.env.DIAGNOSTIC_EXPERIMENTS ?? 'baseline').split(',');
 const seeds=process.env.DIAGNOSTIC_SEED_LIST?process.env.DIAGNOSTIC_SEED_LIST.split(',').map(Number):Array.from({length:Number(process.env.DIAGNOSTIC_SEEDS??3)},(_,i)=>i+1);
 const fixedRuns=JSON.parse(readFileSync('generator_failure_analysis/diagnostic_runs.json','utf8')) as {seed:number;size:number;mode:Mode;policy:DictionaryPolicy;templates:{signature:string}[]}[];
 const rows:object[]=[]; const original=Math.random;mkdirSync('generator_failure_analysis',{recursive:true});
 try{for(const experiment of experiments)for(const seed of seeds)for(const config of configurations){
  if(process.env.DIAGNOSTIC_CONFIG && `${config.size}:${config.mode}:${config.policy}`!==process.env.DIAGNOSTIC_CONFIG)continue;
  if(experiment!=='baseline' && config.mode==='ar_to_en' && ((config.size===7&&config.policy==='compatibility')||(config.size===9&&config.policy==='approved-only')))continue;
  Object.assign(control,{fixedTemplates:undefined,budget:1,templates:0,strategy:'fill',pool:2000,minWords:undefined,minIntersectionPct:undefined,ranking:'density',minRun:0});
  if(process.env.DIAGNOSTIC_FIXED_TEMPLATES){const base=fixedRuns.find(r=>r.seed===seed&&r.size===config.size&&r.mode===config.mode&&r.policy===config.policy)!;control.fixedTemplates=base.templates.map(t=>t.signature.split('/').map(row=>Array.from(row,Number)));}
  if(experiment==='budget4')control.budget=4;
  if(experiment==='templates48')control.templates=48;
  if(experiment==='templates6')control.templates=6;
  if(experiment==='arc')control.strategy='arc';
  if(/^arc[0-9]+$/.test(experiment)){control.strategy='arc';control.pool=Number(experiment.slice(3));}
  if(experiment==='word')control.strategy='word';
  if(experiment==='backtracking')control.strategy='backtracking';
  if(experiment==='minWords')control.minWords=1;
  if(experiment==='minIntersection')control.minIntersectionPct=0;
  if(experiment==='poolAll')control.pool=100000;
  if(/^pool[0-9]+$/.test(experiment))control.pool=Number(experiment.slice(4));
  if(experiment==='minRun2')control.minRun=2;
  Math.random=random(seed);let pairs=selectCandidates(indexes.get(config.policy)!,config.size,config.mode,'advanced',control.pool);
  if(experiment==='poolShort'||experiment==='poolLong'){const length=experiment==='poolShort'?3:config.size;const all=selectCandidates(indexes.get(config.policy)!,config.size,config.mode,'advanced',100000,random(seed));if(process.env.DIAGNOSTIC_REPLACE_LENGTH){pairs=[...pairs.filter(p=>p.answer.length!==length),...all.filter(p=>p.answer.length===length)];}else{const seen=new Set(pairs.map(p=>JSON.stringify(p)));pairs=[...pairs,...all.filter(p=>p.answer.length===length&&!seen.has(JSON.stringify(p)))];}}
  Math.random=random(seed);resetDiagnostic();const started=performance.now();const cw=generateCrossword(config.size,pairs,config.mode==='ar_to_en'?'ltr':'rtl');const ms=performance.now()-started;
  if(cw.entries.length)expect(validatePuzzle(cw.grid,cw.entries,cw.answerDirection).errors).toEqual([]);
  const prepared=prepareCandidates(pairs,config.size,random(seed));
  const patterns=diagnostic.patterns.map(value=>{const p=value as {pattern:string;used:string[]};const pattern=Array.from(p.pattern,c=>c==='?'?null:c);const prefix:(string|null)[]=pattern.map(()=>null);const counts=[];for(let i=0;i<pattern.length;i++){if(pattern[i]){prefix[i]=pattern[i];counts.push({position:i,letter:pattern[i],remaining:[...lookupCandidates(prepared,prefix,new Set(p.used))].length});}}return{...value,prefixCounts:counts};});
  const row={experiment:process.env.DIAGNOSTIC_FIXED_TEMPLATES?`${experiment}-fixedTemplates`:experiment,seed,...config,candidateCount:pairs.length,ms,success:!!cw.entries.length,entries:cw.entries.length,intersections:cw.grid.flat().filter(c=>c.type==='letter'&&c.entries.size===2).length,...structuredClone(diagnostic),patterns};rows.push(row);
  writeFileSync(`generator_failure_analysis/${process.env.DIAGNOSTIC_OUTPUT??'diagnostic_runs'}.json`,JSON.stringify(rows,null,2)+'\n');
  console.log(experiment,seed,config,!!cw.entries.length,Math.round(ms));
 }}finally{Math.random=original;}
});
