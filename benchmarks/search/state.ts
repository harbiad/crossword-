import type { WordClue } from '../../src/lib/generateCrossword';
export const experiment={dedup:false,lcv:false,hall:false,singleton:false,tie:'degree',order:'current',noWindow:false,allArc:false,memo:false,shareBudget:false,templateOrder:'current',extraBatches:0,pairUniqueness:false,lookahead:0,templateSupport:'off',portfolio:false,portfolioLex:false,secondPass:false};
export const counts={nodes:0,deadEnds:0,backtracks:0,timeouts:0,attempts:0,rootContradictions:0,hallContradictions:0,uniquenessContradictions:0,exhaustiveFailures:0,rootTimeouts:0,cachedFailures:0,probes:0};
export const ranks=new Map<string,number>();
export const depths=new Map<string,number>();
export const proofs:{template:string;reason:string;completePool:boolean}[]=[];
export function reset(){proofs.length=0;depths.clear();for(const k of Object.keys(counts) as (keyof typeof counts)[])counts[k]=0;}
export function order(words:WordClue[]){
 if(experiment.order==='current')return words;
 return words.map((w,i)=>({w,i})).sort((a,b)=>experiment.order==='lexical'?a.w.answer.localeCompare(b.w.answer)||a.i-b.i:(ranks.get(a.w.answer)??1e9)-(ranks.get(b.w.answer)??1e9)||a.i-b.i).map(x=>x.w);
}
export let templateRandom= Math.random;
export const templateSignatures:string[][]=[];
export function setTemplateRandom(r:()=>number){templateRandom=r;templateSignatures.length=0;}
export function templateControl(f:()=>number[][][]){const previous=Math.random;try{if(experiment.templateOrder!=='current')Math.random=templateRandom;const result=f();templateSignatures.push(result.map(t=>t.map(r=>r.join('')).join('/')));return result;}finally{Math.random=previous;}}
