// Experimental maintaining-arc-consistency solver. Not imported by production.
import { getEntryCellAt } from '../src/lib/crossword';
import { prepareTemplate, type PreparedTemplate } from '../src/lib/preparedTemplate';
import { indexCandidates, lookupCandidates, type OrientedWord, type PreparedCandidates, type CandidateWindow } from '../src/lib/preparedCandidates';
import type { WordClue } from '../src/lib/generateCrossword';
import type { Placement } from '../src/lib/construct';

type Options = {preparedCandidates?:PreparedCandidates;preparedTemplate?:PreparedTemplate;candidateWindows?:ReadonlyMap<number,CandidateWindow>;timeBudgetMs?:number};
export function constructArc(size:number, words:WordClue[], template:number[][], direction:'ltr'|'rtl', options:Options={}):Placement[]{
 if(template.length!==size)return[];
 const end=performance.now()+(options.timeBudgetMs??400);
 const geometry=options.preparedTemplate??prepareTemplate(template,direction);
 const prepared=options.preparedCandidates??indexCandidates(words);
 const slots=geometry.slots;
 const domains=slots.map(s=>[...lookupCandidates(prepared,Array(s.length).fill(null),new Set(),options.candidateWindows?.get(s.length))]);
 const neighbors:{other:number;here:number;there:number}[][]=slots.map(()=>[]);
 const owners=new Map<string,{slot:number;position:number}>();
 slots.forEach((s,i)=>geometry.cells.get(s)!.forEach(({r,c},position)=>{
  const key=`${r},${c}`,old=owners.get(key);
  if(old){neighbors[i].push({other:old.slot,here:position,there:old.position});neighbors[old.slot].push({other:i,here:old.position,there:position});}
  else owners.set(key,{slot:i,position});
 }));
 const char=(word:OrientedWord,position:number)=>word.answer[word.isInverted?word.answer.length-1-position:position];
 const trail:{index:number;previous:OrientedWord[]}[]=[];
 const set=(index:number,value:OrientedWord[])=>{trail.push({index,previous:domains[index]});domains[index]=value;};
 const restore=(mark:number)=>{while(trail.length>mark){const old=trail.pop()!;domains[old.index]=old.previous;}};
 const propagate=(initial:number[])=>{
  const queue=[...initial],queued=new Set(queue);
  for(let head=0;head<queue.length;head++){
   if(performance.now()>end)return false;
   const i=queue[head];queued.delete(i);
   if(!domains[i].length)return false;
   for(const edge of neighbors[i]){
    const supported=new Set(domains[i].map(word=>char(word,edge.here)));
    const next=domains[edge.other].filter(word=>supported.has(char(word,edge.there)));
    if(next.length===domains[edge.other].length)continue;
    set(edge.other,next);if(!next.length)return false;
    if(!queued.has(edge.other)){queue.push(edge.other);queued.add(edge.other);}
   }
  }
  return true;
 };
 if(!propagate(slots.map((_,i)=>i)))return[];
 const chosen=new Map<number,OrientedWord>(),used=new Set<string>();
 const search=():boolean=>{
  if(performance.now()>end)return false;
  if(chosen.size===slots.length)return true;
  let best=-1;
  for(let i=0;i<slots.length;i++)if(!chosen.has(i)&&(best<0||domains[i].length<domains[best].length||domains[i].length===domains[best].length&&neighbors[i].length>neighbors[best].length))best=i;
  if(best<0||!domains[best].length)return false;
  for(const word of domains[best]){
   if(performance.now()>end)return false;
   if(used.has(word.answer))continue;
   const mark=trail.length;set(best,[word]);chosen.set(best,word);used.add(word.answer);
   const changed=[best];let feasible=true;
   for(let i=0;i<slots.length;i++)if(!chosen.has(i)&&slots[i].length===word.answer.length){
    const next=domains[i].filter(w=>w.answer!==word.answer);
    if(next.length<domains[i].length){set(i,next);changed.push(i);if(!next.length){feasible=false;break;}}
   }
   if(feasible&&propagate(changed)&&search())return true;
   used.delete(word.answer);chosen.delete(best);restore(mark);
  }
  return false;
 };
 if(!search())return[];
 return slots.map((slot,i)=>{
  const word=chosen.get(i)!;
  const entry={...slot,answer:word.answer,isInverted:false,col:slot.col+(slot.direction==='across'&&direction==='rtl'?slot.length-1:0)};
  const {r,c}=getEntryCellAt(entry,0,direction);
  return {...word,row:r,col:c,direction:slot.direction};
 });
}
