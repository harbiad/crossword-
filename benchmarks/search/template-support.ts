import type{PreparedCandidates}from'../../src/lib/preparedCandidates';
import type{PreparedTemplate}from'../../src/lib/preparedTemplate';
export function templateSupport(prepared:PreparedCandidates,geometry:PreparedTemplate){
 const distributions=new Map<string,Map<string,number>>();
 const distribution=(length:number,position:number)=>{const key=length+':'+position;let d=distributions.get(key);if(d)return d;d=new Map();for(const word of prepared.byLength.get(length)!.words)for(const p of[position,length-1-position])d.set(word.answer[p],(d.get(word.answer[p])??0)+1);distributions.set(key,d);return d;};
 let score=geometry.slots.reduce((s,slot)=>s+Math.log(2*prepared.byLength.get(slot.length)!.words.length),0);
 const owner=new Map<string,{length:number;position:number}>();
 for(const slot of geometry.slots)geometry.cells.get(slot)!.forEach((cell,position)=>{const key=cell.r+':'+cell.c,previous=owner.get(key);if(!previous){owner.set(key,{length:slot.length,position});return;}
 const a=distribution(previous.length,previous.position),b=distribution(slot.length,position);let support=0;for(const[ch,count]of a)support+=count*(b.get(ch)??0);
 score+=Math.log(support/(4*prepared.byLength.get(slot.length)!.words.length*prepared.byLength.get(previous.length)!.words.length));});return score;
}
