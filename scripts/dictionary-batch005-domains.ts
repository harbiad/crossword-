import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {registerHooks} from 'node:module';
import {DICTIONARY_BATCH004_QA as source} from '../api/_lib/dictionary.stage3b.batch004.qa.generated.ts';
import {gridForm,matchesDomain,type DomainNeed} from './stage3b-batch005.ts';
import {reviewCsv} from './stage3a.ts';
import type {DomainObservation} from '../benchmarks/batch005-domain-state.ts';
registerHooks({resolve(specifier,context,next){if(specifier.endsWith('.js')&&specifier.startsWith('.')&&context.parentURL?.startsWith(new URL('../api/',import.meta.url).href)){const ts=new URL(specifier.slice(0,-3)+'.ts',context.parentURL);if(existsSync(ts))return next(ts.href,context);}return next(specifier,context);}});
const {createCandidateIndex}=await import('../api/_lib/candidates.ts');
const root='dictionary/stage3b/batch005/';
const runs=JSON.parse(readFileSync(root+'diagnostics/runs.json','utf8')) as {seed:number;size:number;mode:'en_to_ar'|'ar_to_en';diagnosticSuccess:boolean;events:(DomainObservation&{sampledUnusedSupportUnique:number})[];dropped:number}[];
if(runs.length!==133)throw Error('Collect all 133 pre-Batch005 failed-seed configurations first');
const index=createCandidateIndex(source,'approved-only');
const pool=new Map<string,string[]>();for(const size of [7,9,11,13])for(const mode of ['en_to_ar','ar_to_en'])pool.set(`${size}:${mode}`,[...new Set([...index.get(`${size}:${mode}:advanced`)!.values()].flat(2).map(p=>gridForm(p.answer)))]);
const groups=new Map<string,DomainNeed&{templates:Set<string>}>();
for(const r of runs.filter(r=>!r.diagnosticSuccess))for(const e of r.events){
 // Fill MRV probes may be truncated. Recomputed matching counts, not the probe bound, establish a small domain.
 if(e.reason.startsWith('fill')&&e.sampledUnusedSupportUnique>3)continue;
 const constraints=e.constraints.toSorted((a,b)=>a.position-b.position);
 const key=JSON.stringify([r.size,r.mode,e.slot.length,constraints]);
 if(!groups.has(key)){const matchingAnswers=pool.get(`${r.size}:${r.mode}`)!.filter(a=>matchesDomain(a,{length:e.slot.length,constraints}));
  groups.set(key,{id:createHash('sha256').update(key).digest('hex').slice(0,16),size:r.size,mode:r.mode,length:e.slot.length,pattern:e.pattern,constraints,failedSeeds:[],templateCount:0,observations:0,zeroEvents:0,matchingApproved:matchingAnswers.length,matchingAnswers,slotDirections:[],priority:r.mode==='ar_to_en'&&r.size>=11?1:r.mode==='en_to_ar'?2:3,templates:new Set()});}
 const g=groups.get(key)!;if(!g.slotDirections!.includes(e.slot.direction))g.slotDirections!.push(e.slot.direction);if(!g.failedSeeds.includes(r.seed))g.failedSeeds.push(r.seed);g.templates.add(e.template);g.observations+=e.occurrences;
 if(e.reason.startsWith('fill')?e.sampledUnusedSupportUnique===0:e.liveDomain===0)g.zeroEvents++;
}
const needs=[...groups.values()].map(({templates,...g})=>({...g,failedSeeds:g.failedSeeds.sort((a,b)=>a-b),templateCount:templates.size})).sort((a,b)=>a.priority-b.priority||b.failedSeeds.length-a.failedSeeds.length||a.matchingApproved-b.matchingApproved||a.id.localeCompare(b.id));
writeFileSync(root+'domain_needs.json',JSON.stringify(needs,null,2)+'\n');writeFileSync(root+'domain_needs.csv',reviewCsv(needs.map(n=>({...n,knownPositions:n.constraints.filter(c=>c.characters.length===1).map(c=>c.position),knownCharacters:n.constraints.filter(c=>c.characters.length===1).map(c=>c.characters[0]),recurrent:n.failedSeeds.length>=2,zeroApproved:n.matchingApproved===0}))));
writeFileSync(root+'diagnostics/summary.json',JSON.stringify({runs:runs.length,stillFailed:runs.filter(r=>!r.diagnosticSuccess).length,observations:runs.reduce((n,r)=>n+r.events.length,0),uncapturedObservationCalls:runs.reduce((n,r)=>n+r.dropped,0),needs:needs.length,recurrent:needs.filter(n=>n.failedSeeds.length>=2).length,recurrentZero:needs.filter(n=>n.failedSeeds.length>=2&&n.matchingApproved===0).length,recurrentSmall:needs.filter(n=>n.failedSeeds.length>=2&&n.matchingApproved>0&&n.matchingApproved<=3).length,limits:'First 600 distinct template/slot/support-set/reason records per run; uncaptured calls may repeat and are not distinct-domain counts; observed occurrences are not unbiased search frequencies. Recurrence counts distinct failed seeds. Observer overhead may change deadline outcomes. No solver settings changed.'},null,2)+'\n');
console.log(needs.length,'needs');
