import type{OrientedWord}from'../../src/lib/preparedCandidates';
import type{Slot}from'../../src/lib/templates';
export const trace:object[]=[];
export let traceEnabled=false;
export function enableTrace(value:boolean){traceEnabled=value;trace.length=0;}
export function snapshot(stage:string,slots:Slot[],domains:OrientedWord[][],neighbors:{other:number;here:number;there:number}[][],chosen?:Map<number,OrientedWord>){
 if(!traceEnabled||trace.length>=12)return;
 trace.push({stage,slots,neighbors,domains:domains.map(d=>d.map(w=>[w.answer,w.isInverted])),chosen:chosen?[...chosen].map(([i,w])=>({slot:i,answer:w.answer,isInverted:w.isInverted})):[]});
}
