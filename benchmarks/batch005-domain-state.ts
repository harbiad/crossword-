import type { Slot } from '../src/lib/templates';
export type DomainObservation={template:string;attempt:number;slot:Slot;pattern:string;constraints:{position:number;characters:string[]}[];used:string[];liveDomain:number;liveUnique:number;reason:string;occurrences:number};
export const domainTrace={template:'',attempt:0,events:[] as DomainObservation[],seen:new Map<string,DomainObservation>(),dropped:0};
export function resetDomainTrace(){domainTrace.template='';domainTrace.attempt=0;domainTrace.events=[];domainTrace.seen.clear();domainTrace.dropped=0;}
export function beginDomainAttempt(template:number[][]){domainTrace.template=template.map(r=>r.join('')).join('/');domainTrace.attempt++;}
export function observeDomain(slot:Slot,constraints:{position:number;characters:string[]}[],used:Set<string>,liveDomain:number,liveUnique:number,reason:string){
 if(liveDomain>3)return;
 const pattern=Array.from({length:slot.length},(_,i)=>{const c=constraints.find(c=>c.position===i);return c?.characters.length===1?c.characters[0]:'?';}).join('');
 const key=JSON.stringify([domainTrace.template,slot,pattern,constraints,reason]);
 const old=domainTrace.seen.get(key);if(old){old.occurrences++;return;}
 if(domainTrace.events.length>=600){domainTrace.dropped++;return;}
 const event={template:domainTrace.template,attempt:domainTrace.attempt,slot:{...slot},pattern,constraints,used:[...used],liveDomain,liveUnique,reason,occurrences:1};domainTrace.events.push(event);domainTrace.seen.set(key,event);
}
