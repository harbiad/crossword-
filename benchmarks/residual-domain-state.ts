import type {Slot} from '../src/lib/templates';
import type {PreparedCandidates,CandidateWindow} from '../src/lib/preparedCandidates';
export type Observation={attempt:number;slot:Slot;pattern:string;constraints:{position:number;characters:string[]}[];used:string[];liveDomain:number;liveUnique:number;reason:string;occurrences:number};
export type Attempt={id:number;template:string;windowAnswers:Record<number,string[]>;placements:number|null;calls:number;zeroCalls:number;uncapturedCalls:number;observations:Observation[]};
export const trace={attempts:[]as Attempt[],seen:new Map<string,Observation>()};
export function resetTrace(){trace.attempts=[];trace.seen.clear();}
export function beginDomainAttempt(template:number[][],prepared:PreparedCandidates,windows:Map<number,CandidateWindow>){
 const windowAnswers:Record<number,string[]>={};
 for(const [length,w]of windows){const bucket=prepared.byLength.get(length)!;windowAnswers[length]=[...new Set(Array.from({length:Math.min(w.count,bucket.words.length)},(_,i)=>bucket.words[(i+w.offset)%bucket.words.length].answer))];}
 trace.attempts.push({id:trace.attempts.length+1,template:template.map(r=>r.join('')).join('/'),windowAnswers,placements:null,calls:0,zeroCalls:0,uncapturedCalls:0,observations:[]});trace.seen.clear();
}
export function finishDomainAttempt(placements:number){trace.attempts.at(-1)!.placements=placements;}
export function observeDomain(slot:Slot,constraints:Observation['constraints'],used:Set<string>,liveDomain:number,liveUnique:number,reason:string){
 if(liveDomain>3)return;const a=trace.attempts.at(-1)!;a.calls++;if(liveDomain===0)a.zeroCalls++;
 // Bound capture separately for EVERY attempt, rather than exhausting a run-wide cap on its first template.
 const key=JSON.stringify([slot,constraints,[...used].sort(),reason]);const old=trace.seen.get(key);if(old){old.occurrences++;return;}
 if(a.observations.length>=128){a.uncapturedCalls++;return;}
 const pattern=Array.from({length:slot.length},(_,i)=>{const c=constraints.find(c=>c.position===i);return c?.characters.length===1?c.characters[0]:'?';}).join('');
 const event={attempt:a.id,slot:{...slot},pattern,constraints,used:[...used],liveDomain,liveUnique,reason,occurrences:1};a.observations.push(event);trace.seen.set(key,event);
}
