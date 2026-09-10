import{readFileSync,writeFileSync,existsSync}from'node:fs';
import{gunzipSync}from'node:zlib';
import{registerHooks}from'node:module';
import{DICTIONARY_BATCH005_QA as before}from'../api/_lib/dictionary.stage3b.batch005.qa.generated.ts';
import{gridForm,matchesDomain}from'./stage3b-batch005.ts';
import{classifyDomain,canonicalConstraints,type ResidualDomain}from'./residual-analysis.ts';
import{reviewCsv}from'./stage3a.ts';
import{parseReferenceCsv}from'./stage3b.ts';
import type{Attempt}from'../benchmarks/residual-domain-state.ts';
registerHooks({resolve(specifier,context,next){if(specifier.endsWith('.js')&&specifier.startsWith('.')&&context.parentURL?.startsWith(new URL('../api/',import.meta.url).href)){const ts=new URL(specifier.slice(0,-3)+'.ts',context.parentURL);if(existsSync(ts))return next(ts.href,context);}return next(specifier,context);}});
const{DICTIONARY_BATCH006_QA:after}=await import('../api/_lib/dictionary.stage3b.batch006.qa.generated.ts');
const{createCandidateIndex}=await import('../api/_lib/candidates.ts');
const root='dictionary/stage3b/batch006/',analysis='dictionary/stage3b/batch006_analysis/',json=(p:string)=>JSON.parse(readFileSync(p,'utf8'));
const targets=new Set((json(analysis+'proposed_candidates.json')as{domainIds:string[]}[]).flatMap(c=>c.domainIds));if(targets.size!==788)throw Error('Frozen target identity drift');
const frozen=(JSON.parse(gunzipSync(readFileSync(analysis+'residual_domains.json.gz')).toString())as ResidualDomain[]).filter(d=>targets.has(d.id));
const indexes=[before,after].map(d=>createCandidateIndex(d,'approved-only'));
const buckets=indexes.map(index=>new Map<string,string[]>([...index].filter(([k])=>k.endsWith(':advanced')).flatMap(([key,groups])=>[...groups].map(([length,tiers])=>[`${key}:${length}`,[...new Set(tiers.flat().map(p=>gridForm(p.answer)))]]as const))));
const coverage=frozen.map(d=>{const key=`${d.size}:${d.mode}:advanced:${d.length}`,old=(buckets[0].get(key)??[]).filter(a=>matchesDomain(a,d)),next=(buckets[1].get(key)??[]).filter(a=>matchesDomain(a,d));if(JSON.stringify([...old].sort())!==JSON.stringify([...d.fullMatches].sort()))throw Error('Frozen approved domain changed');
 return{id:d.id,size:d.size,mode:d.mode,type:d.type,length:d.length,pattern:d.pattern,constraints:d.constraints,before:old.length,after:next.length,addedAnswers:next.filter(a=>!old.includes(a)),improved:next.length>old.length,zeroToSupported:old.length===0&&next.length>0,remainsZero:next.length===0,criticalToHealthy:old.length>=1&&old.length<=3&&next.length>=5};});
const summarize=(rs:typeof coverage)=>({domains:rs.length,improved:rs.filter(r=>r.improved).length,unchanged:rs.filter(r=>r.before===r.after).length,zeroBefore:rs.filter(r=>!r.before).length,zeroToSupported:rs.filter(r=>r.zeroToSupported).length,zeroRemaining:rs.filter(r=>r.remainsZero).length,criticallySmallBefore:rs.filter(r=>r.before>=1&&r.before<=3).length,criticallySmallAfter:rs.filter(r=>r.after>=1&&r.after<=3).length,criticalToHealthy:rs.filter(r=>r.criticalToHealthy).length,exhaustionDomainsImproved:rs.filter(r=>r.type==='B_USED_EXHAUSTION'&&r.improved).length});
writeFileSync(root+'domain_coverage.csv',reviewCsv(coverage));writeFileSync(root+'domain_coverage_summary.json',JSON.stringify({scope:'The same 788 frozen recurring A/B target domains. Distinct full-index canonical matches, without sampling or used-word exclusions. Improved support is not a guaranteed solution.',healthyThreshold:5,...summarize(coverage),byConfiguration:[11,13].map(size=>({size,mode:'ar_to_en',...summarize(coverage.filter(r=>r.size===size))}))},null,2)+'\n');
function collect(directory:string,version:number){
const runs=json(directory+'runs.json')as{size:number;mode:string;seed:number;file:string;diagnosticSuccess:boolean}[];
const cache=new Map<string,string[]>(),observed:Record<string,unknown>[]=[];let attemptCount=0,uncapturedCalls=0,excludedProbes=0;
for(const meta of runs){const run=JSON.parse(gunzipSync(readFileSync(directory+meta.file)).toString())as typeof meta&{sampledAnswers:string[];attempts:Attempt[]};attemptCount+=run.attempts.length;
 for(const a of run.attempts){uncapturedCalls+=a.uncapturedCalls;if(run.diagnosticSuccess)continue;
 for(const e of a.observations){const key=JSON.stringify([run.size,run.mode,e.slot.length,e.constraints]);let full=cache.get(key);if(!full){full=(buckets[version].get(`${run.size}:${run.mode}:advanced:${e.slot.length}`)??[]).filter(a=>matchesDomain(a,{length:e.slot.length,constraints:e.constraints}));cache.set(key,full);}
 const sample=full.filter(a=>run.sampledAnswers.includes(a)),window=sample.filter(w=>(a.windowAnswers[e.slot.length]??[]).includes(w)),liveZero=e.reason.startsWith('fill')?window.every(w=>e.used.includes(w)):e.liveDomain===0;
 const c=classifyDomain(full,sample,window,e.used,liveZero);if(e.reason.startsWith('fill')&&c.windowUnused>3){excludedProbes++;continue;}
 observed.push({size:run.size,mode:run.mode,seed:run.seed,attempt:a.id,row:e.slot.row,col:e.slot.col,slotDirection:e.slot.direction,length:e.slot.length,pattern:e.pattern,constraints:e.constraints,liveZero,critical:e.reason.startsWith('fill')?c.windowUnused>=1&&c.windowUnused<=3:e.liveUnique>=1&&e.liveUnique<=3,...c});
 }}}
const stats=(rs:typeof observed)=>({observations:rs.length,trueGapZeros:rs.filter(r=>r.liveZero&&r.type==='A_TRUE_GAP').length,exhaustionZeros:rs.filter(r=>r.liveZero&&r.type==='B_USED_EXHAUSTION').length,samplingZeros:rs.filter(r=>r.liveZero&&r.type==='C_API_SAMPLING_LOSS').length,criticallySmall:rs.filter(r=>r.critical).length});
const configurations=[...new Set([...runs.map(r=>`${r.size}:${r.mode}`),'11:ar_to_en','13:ar_to_en','9:en_to_ar','11:en_to_ar','13:en_to_ar','7:en_to_ar','7:ar_to_en','9:ar_to_en'])].map(key=>{const [size,mode]=key.split(':'),subset=runs.filter(r=>r.size===Number(size)&&r.mode===mode);return{size:Number(size),mode,failedBenchmarkCalls:subset.length,stillFailed:subset.filter(r=>!r.diagnosticSuccess).length,...stats(observed.filter(r=>r.size===Number(size)&&r.mode===mode))};});
const summary={runs:runs.length,stillFailed:runs.filter(r=>!r.diagnosticSuccess).length,attempts:attemptCount,uncapturedCalls,excludedProbes,...stats(observed),configurations,limitations:'Same per-attempt cap of 128 and current production settings as pre-review analysis. Runs are only remaining benchmark failures. Absolute observation counts are not independent causal failures and change with search choices, deadlines, and failure count.'};
return {summary,observed,configurations};
}
const {summary,observed,configurations}=collect(root+'diagnostics/',1);
const beforeControls=collect(root+'diagnostics_before_controls/',0);
writeFileSync(root+'diagnostics_before_controls/summary.json',JSON.stringify(beforeControls.summary,null,2)+'\n');
// Measure potential support without selecting or reviewing Batch007 vocabulary.
const prior=new Set(['dictionary/stage3a/decisions.json',...[1,2,3,4,5,6].map(n=>`dictionary/stage3b/batch00${n}/decisions.json`)].flatMap(p=>(json(p)as{english:string}[]).map(d=>d.english)));
const reference=parseReferenceCsv(readFileSync('api/english_arabic_10000_v3.csv','utf8')),deferred={...json('dictionary/stage3b/batch005/deferred.json'),...json(analysis+'selection_exclusions.json')};
const potential=new Map<string,Set<string>>();
for(const h of after){if(h.status!=='review'||prior.has(h.english)||!reference.has(h.english)||Object.hasOwn(deferred,h.english)||!/^[A-Z]+$/.test(h.english))continue;
 for(const size of [7,9,11,13])if(h.english.length<=size)for(const mode of ['ar_to_en','en_to_ar'])for(const t of h.translations){if(t.status==='approved'||t.status==='rejected'||t.register==='dialect'||(mode==='ar_to_en'?t.allowedForArToEn:t.allowedForEnToAr)===false)continue;const answer=mode==='ar_to_en'?h.english:gridForm(t.arabic);if(answer.length<2||answer.length>size)continue;const key=`${size}:${mode}:${answer.length}`,bucket=potential.get(key)??new Set<string>();bucket.add(answer);potential.set(key,bucket);}}
const gaps=new Map<string,{size:number;mode:string;length:number;constraints:ResidualDomain['constraints'];seeds:Set<number>}>();
for(const r of observed.filter(r=>r.liveZero&&r.type==='A_TRUE_GAP')){const length=Number(r.length),constraints=canonicalConstraints(length,r.constraints as ResidualDomain['constraints']);const key=JSON.stringify([r.size,r.mode,length,constraints]);let g=gaps.get(key);if(!g){g={size:Number(r.size),mode:String(r.mode),length,constraints,seeds:new Set<number>()};gaps.set(key,g);}g.seeds.add(Number(r.seed));}
const recurring=[...gaps.values()].filter(g=>g.seeds.size>=2).map(g=>({size:g.size,mode:g.mode,length:g.length,seeds:[...g.seeds],constraints:g.constraints,hasPotential:[...(potential.get(`${g.size}:${g.mode}:${g.length}`)??[])].some(a=>matchesDomain(a,g))}));
const potentialCounts=(rs:typeof recurring)=>({recurringDomains:rs.length,withPotential:rs.filter(r=>r.hasPotential).length,withoutPotential:rs.filter(r=>!r.hasPotential).length});
const remainingCommonCoverage={...potentialCounts(recurring),byConfiguration:configurations.map(c=>({size:c.size,mode:c.mode,...potentialCounts(recurring.filter(r=>r.size===c.size&&r.mode===c.mode))})),scope:'Only mechanical pattern matching in new unresolved, never-linguistically-reviewed common-reference headwords, retaining prior selection deferrals and existing direction flags. No Batch007 selection, review, or approval.'};
writeFileSync(root+'diagnostics/remaining_common_coverage.csv',reviewCsv(recurring));
Object.assign(summary,{remainingCommonCoverage});
writeFileSync(root+'diagnostics/summary.json',JSON.stringify(summary,null,2)+'\n');
writeFileSync(root+'diagnostics/failure_classification.csv',reviewCsv(configurations));
// Original detailed states and candidate windows remain in compressed traces; export representative classified zero cases for inspection.
writeFileSync(root+'diagnostics/zero_examples.csv',reviewCsv(observed.filter(r=>r.liveZero).slice(0,1000)));
console.log(JSON.stringify(summary,null,2));
