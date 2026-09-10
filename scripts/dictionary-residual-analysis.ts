import {readFileSync,writeFileSync,existsSync,createWriteStream,unlinkSync}from'node:fs';
import {once}from'node:events';
import {gunzipSync,gzipSync,createGzip}from'node:zlib';
import {registerHooks}from'node:module';
import {DICTIONARY_BATCH005_QA as dictionary}from'../api/_lib/dictionary.stage3b.batch005.qa.generated.ts';
import {gridForm,matchesDomain}from'./stage3b-batch005.ts';
import {reviewCsv}from'./stage3a.ts';
import {parseReferenceCsv}from'./stage3b.ts';
import {canonicalConstraints,classifyDomain,domainId,proposeCover,matchRepair,type ResidualDomain}from'./residual-analysis.ts';
import type {Attempt}from'../benchmarks/residual-domain-state.ts';
registerHooks({resolve(specifier,context,next){if(specifier.endsWith('.js')&&specifier.startsWith('.')&&context.parentURL?.startsWith(new URL('../api/',import.meta.url).href)){const ts=new URL(specifier.slice(0,-3)+'.ts',context.parentURL);if(existsSync(ts))return next(ts.href,context);}return next(specifier,context);}});
const {createCandidateIndex}=await import('../api/_lib/candidates.ts');
const root='dictionary/stage3b/batch006_analysis/',json=(p:string)=>JSON.parse(readFileSync(p,'utf8'));
const runs=json(root+'runs.json')as{size:number;mode:'ar_to_en'|'en_to_ar';seed:number;diagnosticSuccess:boolean;file:string}[];
if(runs.length!==81)throw Error('All 81 failed baseline calls must be observed');
const index=createCandidateIndex(dictionary,'approved-only');
const buckets=new Map<string,string[]>([...index].filter(([k])=>k.endsWith(':advanced')).flatMap(([key,groups])=>[...groups].map(([length,tiers])=>[`${key}:${length}`,[...new Set(tiers.flat().map(p=>gridForm(p.answer)))]]as const)));
const cache=new Map<string,string[]>();
const domains=new Map<string,ResidualDomain&{zeroSeeds:number[]}>();
const rows:Record<string,unknown>[]=[],attempts:Record<string,unknown>[]=[];
let captured=0,excludedTruncated=0,uncapturedCalls=0;
for(const meta of runs){
 const run=JSON.parse(gunzipSync(readFileSync(root+meta.file)).toString())as typeof meta&{sampledAnswers:string[];attempts:Attempt[]};
 const sampled=new Set(run.sampledAnswers);
 for(const a of run.attempts){
  uncapturedCalls+=a.uncapturedCalls;captured+=a.observations.length;
  attempts.push({size:run.size,mode:run.mode,seed:run.seed,runFailed:!run.diagnosticSuccess,attempt:a.id,template:a.template,placements:a.placements,captured:a.observations.length,smallOrZeroProbeCalls:a.calls,zeroProbeCalls:a.zeroCalls,uncapturedCalls:a.uncapturedCalls});
  if(run.diagnosticSuccess)continue;
  for(const e of a.observations){
   const constraints=canonicalConstraints(e.slot.length,e.constraints),key=JSON.stringify([run.size,run.mode,e.slot.length,constraints]);
   let full=cache.get(key);if(!full){full=(buckets.get(`${run.size}:${run.mode}:advanced:${e.slot.length}`)??[]).filter(answer=>matchesDomain(answer,{length:e.slot.length,constraints}));cache.set(key,full);}
   const sample=full.filter(x=>sampled.has(x)),window=sample.filter(x=>(a.windowAnswers[e.slot.length]??[]).includes(x));
   const used=new Set(e.used),liveZero=e.reason.startsWith('fill')?window.every(x=>used.has(x)):e.liveDomain===0;
   const result=classifyDomain(full,sample,window,e.used,liveZero);
   // MRV probes are upper bounds, not exact small domains. Recompute before including.
   if(e.reason.startsWith('fill')&&result.windowUnused>3){excludedTruncated++;continue;}
   const critical=e.reason.startsWith('fill')?result.windowUnused>=1&&result.windowUnused<=3:e.liveUnique>=1&&e.liveUnique<=3;
   const id=domainId(run.size,run.mode,e.slot.length,constraints,result.type);
   const row={id,size:run.size,mode:run.mode,seed:run.seed,attempt:a.id,template:a.template,row:e.slot.row,col:e.slot.col,slotDirection:e.slot.direction,length:e.slot.length,pattern:e.pattern,constraints:e.constraints,liveZero,criticallySmall:critical,fullCriticallySmall:full.length>=1&&full.length<=3,liveDomain:e.liveDomain,observedLiveUnique:e.liveUnique,observerReason:e.reason,...result,earlierChoicesConsumedMatches:result.usedMatches.length>0};rows.push(row);
   let d=domains.get(id);if(!d){d={id,size:run.size,mode:run.mode,length:e.slot.length,pattern:Array.from({length:e.slot.length},(_,i)=>{const c=constraints.find(c=>c.position===i);return c?.characters.length===1?c.characters[0]:'?';}).join(''),constraints,type:result.type,fullMatches:full,seeds:[],zeroSeeds:[],templates:[],observations:0,zeroObservations:0,sampleCounts:[],weight:0};domains.set(id,d);}
   d.observations++;if(liveZero){d.zeroObservations++;if(!d.zeroSeeds.includes(run.seed))d.zeroSeeds.push(run.seed);}if(!d.seeds.includes(run.seed))d.seeds.push(run.seed);if(!d.templates.includes(a.template))d.templates.push(a.template);d.sampleCounts.push(sample.length);
  }
 }
}
const all=[...domains.values()];
for(const d of all){const priority=d.mode==='ar_to_en'?(d.size===13?5:4):(d.size===13?3:d.size===11?2:1);d.weight=priority*Math.log2(1+d.zeroSeeds.length)*Math.log2(1+d.templates.length)*(d.type==='A_TRUE_GAP'?1:d.type==='B_USED_EXHAUSTION'?0.75:0);}
all.sort((a,b)=>b.weight-a.weight||b.seeds.length-a.seeds.length||a.id.localeCompare(b.id));
const stats=(rs:typeof rows)=>({observations:rs.length,runs:new Set(rs.map(r=>`${r.size}:${r.mode}:${r.seed}`)).size,zeroObservations:rs.filter(r=>r.liveZero).length,criticallySmall:rs.filter(r=>r.criticallySmall).length});
const types=[...new Set(rows.map(r=>r.type))];
const sampling=rows.filter(r=>Number(r.fullCount)>Number(r.sampledCount));
const exhausted=rows.filter(r=>r.type==='B_USED_EXHAUSTION'&&r.liveZero);
const configurations=[...new Set(runs.map(r=>`${r.size}:${r.mode}`))].map(key=>{
 const rs=rows.filter(r=>`${r.size}:${r.mode}`===key),rr=runs.filter(r=>`${r.size}:${r.mode}`===key);
 return {size:rr[0].size,mode:rr[0].mode,baselineFailed:rr.length,stillFailed:rr.filter(r=>!r.diagnosticSuccess).length,observations:rs.length,byType:Object.fromEntries(types.map(t=>[String(t),stats(rs.filter(r=>r.type===t))])),samplingZero:stats(rs.filter(r=>r.samplingZero)),samplingHealthyToSmall:stats(rs.filter(r=>r.samplingHealthyToSmall)),zeroByLength:[...new Set(rs.map(r=>Number(r.length)))].sort((a,b)=>a-b).map(length=>({length,trueGaps:rs.filter(r=>r.length===length&&r.liveZero&&r.type==='A_TRUE_GAP').length,usedExhaustion:rs.filter(r=>r.length===length&&r.liveZero&&r.type==='B_USED_EXHAUSTION').length,samplingLoss:rs.filter(r=>r.length===length&&r.liveZero&&r.type==='C_API_SAMPLING_LOSS').length})),fullEligibleUnique:[...buckets].filter(([k])=>k.startsWith(`${rr[0].size}:${rr[0].mode}:advanced:`)).reduce((n,[,v])=>n+v.length,0)};
});
const targets=all.filter(d=>['A_TRUE_GAP','B_USED_EXHAUSTION'].includes(d.type)&&d.zeroSeeds.length>=2&&d.constraints.length&&d.constraints.every(c=>c.characters.length>0));
const prior=new Set(['dictionary/stage3a/decisions.json',...[1,2,3,4,5].map(n=>`dictionary/stage3b/batch00${n}/decisions.json`)].flatMap(p=>(json(p)as{english:string}[]).map(d=>d.english)));
const selectionExclusions=json(root+'selection_exclusions.json')as Record<string,string>;
const deferred=json('dictionary/stage3b/batch005/deferred.json')as Record<string,string>,reference=parseReferenceCsv(readFileSync('api/english_arabic_10000_v3.csv','utf8'));
const potential=dictionary.flatMap((h,headwordIndex)=>{
 if(h.status!=='review'||prior.has(h.english)||Object.hasOwn(deferred,h.english)||Object.hasOwn(selectionExclusions,h.english)||!reference.has(h.english)||!/^[A-Z]+$/.test(h.english))return [];
 const unresolved=h.translations.map((t,translationIndex)=>({...t,translationIndex})).filter(t=>t.status!=='approved'&&t.status!=='rejected'&&t.register!=='dialect');
 const matched=targets.filter(d=>h.english.length<=d.size&&unresolved.some(t=>(d.mode==='ar_to_en'?t.allowedForArToEn:t.allowedForEnToAr)!==false&&matchRepair(d.mode==='ar_to_en'?h.english:gridForm(t.arabic),d)));
 if(!matched.length)return [];
 const learnerScore=100+80/(1+headwordIndex/2000),referenceArabic=reference.get(h.english)!;
 const qualityPotential=unresolved.some(t=>gridForm(t.arabic)===gridForm(referenceArabic))?1:0;
 return [{english:h.english,headwordIndex,unresolved,englishLength:h.english.length,arabicLengths:[...new Set(unresolved.map(t=>gridForm(t.arabic).length))],learnerScore,qualityPotential,commonnessBasis:'10k/common reference membership; original dictionary order is a frequency proxy',learnerUsefulnessBasis:'Reference/order/deferred-list proxy only; learner suitability and MSA semantics NOT reviewed',referenceArabic,domainIds:matched.map(d=>d.id),matchedPatterns:matched.map(d=>({id:d.id,size:d.size,mode:d.mode,pattern:d.pattern,constraints:d.constraints})),failedRunsPotentiallyHelped:[...new Set(matched.flatMap(d=>d.zeroSeeds.map(seed=>`${d.size}:${d.mode}:${seed}`)))],repairValue:matched.reduce((n,d)=>n+d.weight,0)}];
}).sort((a,b)=>a.headwordIndex-b.headwordIndex);
writeFileSync(root+'eligible_headwords.txt',potential.map(c=>c.english).join('\n')+'\n');
const cover=proposeCover(potential,targets,0.9);
const selected=cover.selected,selectionIds=new Set(selected.flatMap(c=>c.domainIds));
const curve=selected.map(c=>({headwords:c.rank,weightedReachableDomainPct:c.cumulativeWeightPct,marginalDomains:c.marginalDomains,marginalWeight:c.marginalWeight}));
const tiers=[0.5,0.75,0.8,0.9].map(t=>({targetPercent:100*t,headwords:selected.find(c=>c.cumulativeWeightPct>=100*t)?.rank??null}));
const exhaustedAnswers=new Map<string,{observations:number;runs:Set<string>;patterns:Set<string>}>();
for(const r of exhausted)for(const answer of r.usedMatches as string[]){const x=exhaustedAnswers.get(answer)??{observations:0,runs:new Set<string>(),patterns:new Set<string>()};x.observations++;x.runs.add(`${r.size}:${r.mode}:${r.seed}`);x.patterns.add(String(r.id));exhaustedAnswers.set(answer,x);}
const summary={policy:'approved-only diagnostics; production compatibility unchanged',baseline:'dictionary/stage3b/batch005/generation/runs.json',failedRunsRequested:runs.length,failedRunsAnalyzed:runs.filter(r=>!r.diagnosticSuccess).length,diagnosticReturnedPuzzles:runs.filter(r=>r.diagnosticSuccess).length,solverAttempts:attempts.length,constructNoPlacements:attempts.filter(a=>a.placements===0).length,attemptsWithPlacements:attempts.filter(a=>Number(a.placements)>0).length,captured,excludedTruncated,uncapturedCalls,useful:stats(rows),classification:Object.fromEntries(types.map(t=>[String(t),stats(rows.filter(r=>r.type===t))])),samplingLoss:stats(sampling),samplingZero:stats(rows.filter(r=>r.samplingZero)),samplingHealthyToSmall:stats(rows.filter(r=>r.samplingHealthyToSmall)),configurations,distinctDomains:all.length,recurringDomains:all.filter(d=>d.seeds.length>=2).length,recurringRepairableTypeDomains:targets.length,selectionExclusions:Object.keys(selectionExclusions).length,exhaustionDiversity:[1,2,3].map(count=>({fullDomainSize:count,...stats(exhausted.filter(r=>r.fullCount===count))})),proposal:{headwords:selected.length,eligibleMatchingHeadwords:potential.length,reachableDomains:cover.reachableDomains,coveredDomains:cover.coveredDomains,weightedCoveragePercent:100*cover.coveredWeight/cover.reachableWeight,threshold:0.9,thresholdRationale:'Smallest prefix of the deterministic greedy learner-weighted cover reaching 90% of reachable weighted A/B needs. Disclosed planning tradeoff, not an empirically optimal batch size or generation guarantee.',alternatives:tiers,expectedConfigurations:[...new Set(targets.filter(d=>selectionIds.has(d.id)).map(d=>`${d.size}:${d.mode}`))],unreachableDomains:targets.length-cover.reachableDomains,byConfiguration:configurations.map(c=>{const ds=targets.filter(d=>d.size===c.size&&d.mode===c.mode);return {size:c.size,mode:c.mode,recurringABTargets:ds.length,reachable:ds.filter(d=>potential.some(p=>p.domainIds.includes(d.id))).length,selectedCoverage:ds.filter(d=>selectionIds.has(d.id)).length};})},exhaustedAnswers:[...exhaustedAnswers].map(([answer,x])=>({answer,observations:x.observations,runs:x.runs.size,patterns:x.patterns.size})).sort((a,b)=>b.runs-a.runs||b.observations-a.observations),limitations:['128 distinct observations per solver attempt; all attempts and uncaptured calls reported. Counts are captured branch observations, not independent causal failures.','Same seeds and settings; observer overhead affects wall-clock deadlines. No claims of unchanged runtime or exact replay trajectory.','A full-domain zero proves a gap for a particular branch constraint, not global puzzle unsatisfiability.','Supported small domains and internal-window/propagation restrictions are not falsely forced into A/B/C.','Proposal does not assess semantic validity or approve any relationship; repair estimates are potential unique-answer additions, not forecast success percentages.'],dictionaryReviewed:false,cefrAssignments:0,generatorChanged:false,productionPolicy:'compatibility'};
writeFileSync(root+'summary.json',JSON.stringify(summary,null,2)+'\n');
// Full observations remain lossless in compressed archives; review CSVs avoid enormous duplicate template text.
writeFileSync(root+'residual_domains.json.gz',gzipSync(JSON.stringify(all)));
if(existsSync(root+'residual_domains.json'))unlinkSync(root+'residual_domains.json');
writeFileSync(root+'residual_domains.csv',reviewCsv(all.map((d,i)=>({id:d.id,rank:i+1,size:d.size,mode:d.mode,language:d.mode==='ar_to_en'?'English':'Arabic',length:d.length,pattern:d.pattern,constraints:d.constraints,type:d.type,fullDomainSize:d.fullMatches.length,sampledMin:Math.min(...d.sampleCounts),sampledMax:Math.max(...d.sampleCounts),recurrence:d.seeds.length,seeds:d.seeds,zeroSeeds:d.zeroSeeds.length,templateRecurrence:d.templates.length,observations:d.observations,zeroObservations:d.zeroObservations,repairWeight:d.weight,proposalTargets:selectionIds.has(d.id)}))));
const gzip=createGzip(),destination=createWriteStream(root+'observations.jsonl.gz');gzip.pipe(destination);
for(const r of rows)if(!gzip.write(JSON.stringify(r)+'\n'))await once(gzip,'drain');gzip.end();await once(destination,'finish');
const classified=runs.flatMap(run=>types.map(type=>{const rs=rows.filter(r=>r.size===run.size&&r.mode===run.mode&&r.seed===run.seed&&r.type===type);return {size:run.size,mode:run.mode,seed:run.seed,type,...stats(rs)};}));
writeFileSync(root+'failure_classification.csv',reviewCsv(classified));writeFileSync(root+'sampling_losses.csv',reviewCsv(sampling));writeFileSync(root+'used_word_exhaustion.csv',reviewCsv(exhausted));writeFileSync(root+'attempts.csv',reviewCsv(attempts));
writeFileSync(root+'proposed_candidates.json',JSON.stringify(selected,null,2)+'\n');writeFileSync(root+'proposed_candidates.csv',reviewCsv(selected));writeFileSync(root+'proposed_headwords.txt',selected.map(c=>c.english).join('\n')+'\n');writeFileSync(root+'selection_curve.csv',reviewCsv(curve));writeFileSync(root+'selection_curve.json',JSON.stringify(curve,null,2)+'\n');
console.log(JSON.stringify({...summary,exhaustedAnswers:summary.exhaustedAnswers.slice(0,15)},null,2));
