import{gzipSync}from'node:zlib';
import{trace,enableTrace}from'./diagnostics';
import{test,expect}from'vitest';
import{mkdirSync,writeFileSync,readFileSync}from'node:fs';
import{DICTIONARY_BATCH006_QA as dictionary}from'../../api/_lib/dictionary.stage3b.batch006.qa.generated';
import{DICTIONARY_BATCH005_QA as old}from'../../api/_lib/dictionary.stage3b.batch005.qa.generated';
import{createCandidateIndex,selectCandidates,type Mode}from'../../api/_lib/candidates';
import{candidatePoolLimit}from'../../api/_lib/candidatePool';
import{generateCrossword,validatePuzzle}from'../../src/lib/generateCrossword';
import{prepareCandidates,normalizeAnswer}from'../../src/lib/preparedCandidates';
import{experiment,counts,reset,ranks,setTemplateRandom,templateSignatures,proofs}from'./state';
const random=(seed:number)=>{let s=seed>>>0;return()=>((s=(Math.imul(s,1664525)+1013904223)>>>0)/4294967296);};
const defaults={...experiment};
const variants:Record<string,Partial<typeof experiment>>={current:{},dedup:{dedup:true},lcv:{lcv:true},singleton:{singleton:true},hall:{hall:true},remainingDegree:{tie:'remaining-degree'},longest:{tie:'longest'},fixed:{tie:'fixed'},constrained:{tie:'constrained'},stable:{tie:'stable'},noWindow:{noWindow:true},allArc:{allArc:true},lexical:{order:'lexical'},oldOrder:{order:'old'},frequency:{order:'frequency'},shuffle17:{order:'shuffle17'},shuffle71:{order:'shuffle71'},oldTemplates:{templateOrder:'old'},oldBoth:{templateOrder:'old',order:'old'},independentTemplates:{templateOrder:'independent'},independentCombo:{templateOrder:'independent',memo:true,shareBudget:true,lcv:true,singleton:true},replenish48:{memo:true,shareBudget:true,extraBatches:1},replenish96:{memo:true,shareBudget:true,extraBatches:3},pairUniqueness:{pairUniqueness:true},strongUniqueness:{pairUniqueness:true,singleton:true},strongMemo:{pairUniqueness:true,singleton:true,memo:true,shareBudget:true,extraBatches:3},probe8:{lookahead:8},probe32:{lookahead:32},probeMemo:{lookahead:32,memo:true,shareBudget:true},supportTie:{templateSupport:'tie'},supportPrimary:{templateSupport:'primary'},supportMemo:{templateSupport:'primary',memo:true,shareBudget:true},lcvMemo:{lcv:true,memo:true},portfolio:{memo:true,portfolio:true},portfolioLex:{memo:true,portfolio:true,portfolioLex:true},memo:{memo:true},shareBudget:{shareBudget:true},memoShare:{memo:true,shareBudget:true},comboMemo:{memo:true,shareBudget:true,dedup:true,lcv:true,singleton:true,hall:true},combined:{dedup:true,lcv:true,singleton:true,hall:true}};
test('controlled search experiments',()=>{
 const dir=process.env.SEARCH_OUTPUT??'search_feasibility_analysis/experiments';mkdirSync(dir,{recursive:true});
 const selected=(process.env.SEARCH_VARIANTS??'current,dedup,lcv,singleton,hall,remainingDegree,longest,fixed,stable,noWindow,combined').split(',');
 const configs=(process.env.SEARCH_CONFIGS??'11:ar_to_en,13:ar_to_en,13:en_to_ar').split(',').map(v=>{const[s,m]=v.split(':');return{size:Number(s),mode:m as Mode};});
 const seeds=(process.env.SEARCH_SEEDS??'1,10,16').split(',').map(Number),index=createCandidateIndex(dictionary,'approved-only'),oldIndex=createCandidateIndex(old,'approved-only');
 const runs:object[]=[],original=Math.random;
 try{for(const seed of seeds)for(const{size,mode}of configs){
  Math.random=random(seed);const pairs=selectCandidates(index,size,mode,'advanced',candidatePoolLimit(size,mode));
  writeFileSync(`${dir}/pool-${size}-${mode}-${seed}.json`,JSON.stringify(pairs));
  const identities=new Set(pairs.map(p=>JSON.stringify([normalizeAnswer(p.answer),p.clue.trim()])));
  Math.random=random(seed);const oldPairs=selectCandidates(oldIndex,size,mode,'advanced',candidatePoolLimit(size,mode));
  Object.assign(experiment,defaults);Math.random=random(seed);const oldPrepared=prepareCandidates(oldPairs,size);
  for(const variant of selected){
   Object.assign(experiment,defaults,variants[variant]);if(!variants[variant])throw Error(variant);ranks.clear();
   if(variant==='oldOrder')oldPrepared.words.forEach((w,i)=>{if(!ranks.has(w.answer))ranks.set(w.answer,i);});
   if(variant==='frequency')for(let i=0;i<dictionary.length;i++){const h=dictionary[i];const forms=mode==='ar_to_en'?[h.english]:h.translations.map(t=>t.arabic);for(const f of forms){const a=normalizeAnswer(f);if(!ranks.has(a))ranks.set(a,i);}}
   if(variant.startsWith('shuffle')){const rng=random(Number(variant.slice(7)));for(const p of pairs)ranks.set(normalizeAnswer(p.answer),rng());}
   const templateRng=random(seed);if(experiment.templateOrder==='old')prepareCandidates(oldPairs,size,templateRng);setTemplateRandom(templateRng);
   reset();enableTrace(process.env.SEARCH_TRACE==='1');Math.random=random(seed);const start=performance.now();const cw=generateCrossword(size,pairs,mode==='ar_to_en'?'ltr':'rtl');const ms=performance.now()-start;
   if(cw.entries.length){expect(validatePuzzle(cw.grid,cw.entries,cw.answerDirection).errors).toEqual([]);expect(new Set(cw.entries.map(e=>e.answer)).size).toBe(cw.entries.length);for(const e of cw.entries)expect(identities.has(JSON.stringify([e.answer,e.clue]))).toBe(true);writeFileSync(`${dir}/solution-${size}-${mode}-${seed}-${variant}.json`,JSON.stringify(cw,(_,v)=>v instanceof Set?[...v]:v));}
   writeFileSync(`${dir}/templates-${size}-${mode}-${seed}-${variant}.json`,JSON.stringify(templateSignatures));
   writeFileSync(`${dir}/proofs-${size}-${mode}-${seed}-${variant}.json`,JSON.stringify(proofs));
   if(trace.length)writeFileSync(`${dir}/trace-${size}-${mode}-${seed}-${variant}.json.gz`,gzipSync(JSON.stringify(trace)));
   runs.push({seed,size,mode,variant,success:!!cw.entries.length,ms,entries:cw.entries.length,...counts,provenTemplates:new Set(proofs.filter(p=>p.completePool).map(p=>p.template)).size});writeFileSync(dir+'/runs.json',JSON.stringify(runs,null,2));console.log(`${size} ${mode} seed=${seed} ${variant}: ${cw.entries.length} words ${ms.toFixed(0)}ms ${counts.nodes} nodes`);
  }
 }}finally{Math.random=original;Object.assign(experiment,defaults);}
 writeFileSync(dir+'/settings.json',JSON.stringify({seeds,configs,selected,variants,baseline:'Batch006 QA unchanged; all variants use the exact same API candidate pairs; sorting occurs after canonical normalization/per-length shuffle and does not change RNG consumption or templates.'},null,2));
 const oldRuns=JSON.parse(readFileSync('dictionary/stage3b/batch005/generation/runs.json','utf8'))as{seed:number;size:number;mode:string;success:boolean}[];
 const afterRuns=JSON.parse(readFileSync('dictionary/stage3b/batch006/generation/runs.json','utf8'))as typeof oldRuns;
 writeFileSync('search_feasibility_analysis/seed_transitions.json',JSON.stringify(afterRuns.map(a=>{const b=oldRuns.find(b=>b.seed===a.seed&&b.size===a.size&&b.mode===a.mode)!;return{...a,beforeSuccess:b.success,transition:b.success?(a.success?'retained':'regressed'):(a.success?'new-success':'still-failed')};}),null,2));
});
