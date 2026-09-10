import {createHash}from'node:crypto';
import {matchesDomain,type DomainNeed}from'./stage3b-batch005.ts';
export type Constraint=DomainNeed['constraints'][number];
export function canonicalConstraints(length:number,constraints:Constraint[]){
 const a=constraints.map(c=>({position:c.position,characters:[...c.characters].sort()})).sort((a,b)=>a.position-b.position);
 const b=a.map(c=>({...c,position:length-1-c.position})).sort((a,b)=>a.position-b.position);
 return JSON.stringify(a)<=JSON.stringify(b)?a:b;
}
export function classifyDomain(full:string[],sample:string[],window:string[],used:string[],liveZero:boolean){
 const occupied=new Set(used),fullUnused=full.filter(a=>!occupied.has(a)),sampleUnused=sample.filter(a=>!occupied.has(a)),windowUnused=window.filter(a=>!occupied.has(a));
 const type=full.length===0?'A_TRUE_GAP':fullUnused.length===0?'B_USED_EXHAUSTION':sampleUnused.length===0?'C_API_SAMPLING_LOSS':windowUnused.length===0?'WINDOW_RESTRICTION':liveZero?'PROPAGATION_RESTRICTION':'SUPPORTED_SMALL_DOMAIN';
 return {type,fullCount:full.length,sampledCount:sample.length,windowCount:window.length,fullUnused:fullUnused.length,sampledUnused:sampleUnused.length,windowUnused:windowUnused.length,usedMatches:full.filter(a=>occupied.has(a)),omittedAnswers:full.filter(a=>!sample.includes(a)),retainedPct:full.length?100*sample.length/full.length:null,samplingZero:full.length>0&&sample.length===0,samplingHealthyToSmall:full.length>=5&&sample.length>=1&&sample.length<=3};
}
export type ResidualDomain={id:string;size:number;mode:'ar_to_en'|'en_to_ar';length:number;pattern:string;constraints:Constraint[];type:string;fullMatches:string[];seeds:number[];templates:string[];observations:number;zeroObservations:number;sampleCounts:number[];weight:number};
export const domainId=(size:number,mode:string,length:number,constraints:Constraint[],type:string)=>createHash('sha256').update(JSON.stringify([size,mode,length,canonicalConstraints(length,constraints),type])).digest('hex').slice(0,16);
export function matchRepair(answer:string,n:ResidualDomain){return !n.fullMatches.includes(answer)&&matchesDomain(answer,n);}
export type RepairCandidate={english:string;learnerScore:number;qualityPotential:number;domainIds:string[]};
// Greedy weighted cover: a transparent review-cost heuristic, not an optimality claim.
export function proposeCover<T extends RepairCandidate>(candidates:T[],domains:ResidualDomain[],target=0.9){
 const weights=new Map(domains.map(d=>[d.id,d.weight]));
 const reachable=new Set(candidates.flatMap(c=>c.domainIds));const total=[...reachable].reduce((n,id)=>n+(weights.get(id)??0),0);
 const covered=new Set<string>(),remaining=new Set(candidates),selected:(T&{rank:number;marginalDomains:number;marginalWeight:number;selectionScore:number;cumulativeWeightPct:number})[]=[];
 let weight=0;
 while(total>0&&weight/total<target){
  let best:T|undefined,bestScore=-1,bestGain=0,bestIds:string[]=[];
  for(const c of remaining){const ids=c.domainIds.filter(id=>!covered.has(id)),gain=ids.reduce((n,id)=>n+(weights.get(id)??0),0);
   const score=gain*(c.learnerScore/100)*(1+c.qualityPotential*0.05);
   if(score>bestScore){best=c;bestScore=score;bestGain=gain;bestIds=ids;}}
  if(!best||bestGain===0)break;
  bestIds.forEach(id=>covered.add(id));weight+=bestGain;remaining.delete(best);
  selected.push({...best,rank:selected.length+1,marginalDomains:bestIds.length,marginalWeight:bestGain,selectionScore:bestScore,cumulativeWeightPct:100*weight/total});
 }
 return {selected,reachableDomains:reachable.size,reachableWeight:total,coveredDomains:covered.size,coveredWeight:weight,target};
}
