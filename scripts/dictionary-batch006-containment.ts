import{readFileSync,writeFileSync,existsSync}from'node:fs';
import{registerHooks}from'node:module';
import{DICTIONARY_BATCH005_QA as before}from'../api/_lib/dictionary.stage3b.batch005.qa.generated.ts';
import{gridForm}from'./stage3b-batch005.ts';
import{reviewCsv}from'./stage3a.ts';
registerHooks({resolve(specifier,context,next){if(specifier.endsWith('.js')&&specifier.startsWith('.')&&context.parentURL?.startsWith(new URL('../api/',import.meta.url).href)){const ts=new URL(specifier.slice(0,-3)+'.ts',context.parentURL);if(existsSync(ts))return next(ts.href,context);}return next(specifier,context);}});
const{DICTIONARY_BATCH006_QA:after}=await import('../api/_lib/dictionary.stage3b.batch006.qa.generated.ts');
const{createCandidateIndex,selectCandidates}=await import('../api/_lib/candidates.ts');const{candidatePoolLimit}=await import('../api/_lib/candidatePool.ts');
const root='dictionary/stage3b/batch006/',oldRuns=JSON.parse(readFileSync('dictionary/stage3b/batch005/generation/runs.json','utf8'))as{size:number;mode:string;seed:number;success:boolean}[],newRuns=JSON.parse(readFileSync(root+'generation/runs.json','utf8'))as typeof oldRuns;
const indexes=[before,after].map(d=>createCandidateIndex(d,'approved-only')),original=Math.random,rows: {size:number;mode:string;seed:number;beforeCount:number;afterCount:number;removedCanonicalAnswers:number;removedPairs:number;beforeSuccess:boolean;afterSuccess:boolean;lostSuccess:boolean;gainedSuccess:boolean}[]=[];
const random=(seed:number)=>{let state=seed>>>0;return()=>((state=(Math.imul(state,1664525)+1013904223)>>>0)/4294967296);};
try{for(const size of[7,9,11,13])for(const mode of['ar_to_en','en_to_ar']as const)for(let seed=1;seed<=30;seed++){
 const pairs=indexes.map(index=>{Math.random=random(seed);return selectCandidates(index,size,mode,'advanced',candidatePoolLimit(size,mode));});
 const answers=pairs.map(ps=>new Set(ps.map(p=>gridForm(p.answer)))),identities=pairs.map(ps=>new Set(ps.map(p=>JSON.stringify([gridForm(p.answer),p.clue]))));
 const removedAnswers=[...answers[0]].filter(a=>!answers[1].has(a)),removedPairs=[...identities[0]].filter(p=>!identities[1].has(p));
 if(mode==='ar_to_en'&&(removedAnswers.length||removedPairs.length))throw Error('English containment hypothesis falsified');
 const b=oldRuns.find(r=>r.size===size&&r.mode===mode&&r.seed===seed)!,a=newRuns.find(r=>r.size===size&&r.mode===mode&&r.seed===seed)!;
 rows.push({size,mode,seed,beforeCount:pairs[0].length,afterCount:pairs[1].length,removedCanonicalAnswers:removedAnswers.length,removedPairs:removedPairs.length,beforeSuccess:b.success,afterSuccess:a.success,lostSuccess:b.success&&!a.success,gainedSuccess:!b.success&&a.success});
}}finally{Math.random=original;}
const configurations=[7,9,11,13].map(size=>{const rs=rows.filter(r=>r.size===size&&r.mode==='ar_to_en');return{size,mode:'ar_to_en',allThirtyPoolsContainEveryOldPair:rs.every(r=>!r.removedPairs),lostSeeds:rs.filter(r=>r.lostSuccess).map(r=>r.seed),gainedSeeds:rs.filter(r=>r.gainedSuccess).map(r=>r.seed)};});
writeFileSync(root+'generation/pool_containment.csv',reviewCsv(rows));writeFileSync(root+'generation/pool_containment.json',JSON.stringify({configurations,inference:'For English answers every sampled after-pool contains every old answer/clue pair, and runtime/validation are unchanged. Lost successes therefore cannot be explained by removing vocabulary or losing prior mathematical solutions; bounded search order/time is implicated. This does not establish feasibility for previously unsuccessful 13x13 cases. Arabic pools are capped and are not assumed to contain previous samples.'},null,2)+'\n');console.log(JSON.stringify(configurations,null,2));
