import {readFileSync} from 'node:fs';
type Row={id:string;classification:string;survival:number;depth:number;propagatedSmall:number;ms:number};
const rows=JSON.parse(readFileSync('template_feasibility_13x13/census.json','utf8')) as Row[];
const templates=JSON.parse(readFileSync('template_feasibility_13x13/templates.json','utf8')) as Record<string,number[][]>;
const key=(t:number[][])=>t.map(r=>r.join('')).join('/');
const records=new Map(rows.map(r=>[key(templates[r.id]),r]));
export let variant='A';
export const measurements={attempts:0,impossibleMs:0};
export function begin(value:string){variant=value;measurements.attempts=0;measurements.impossibleMs=0;}
export function controlTemplates(ts:number[][][]){
 if(variant==='B'||variant==='D')return ts.filter(t=>!['A','B','C'].includes(records.get(key(t))?.classification??'E'));
 return ts;
}
export function score(t:number[][]){
 const r=records.get(key(t));if(!r)return -Infinity;
 // Proof dominates all surrogate signals. Unknown/feasible outrank impossible.
 return (r.classification==='D'?1e6:r.classification==='E'?1e5:0)+r.depth*100+r.survival*10-r.propagatedSmall;
}
export function compare(a:{template:number[][];quality:number;score:number},b:typeof a){
 return (variant==='C'?score(b.template)-score(a.template):0)||b.quality-a.quality||b.score-a.score;
}
export function record(template:number[][],ms:number){measurements.attempts++;if(['A','B','C'].includes(records.get(key(template))?.classification??''))measurements.impossibleMs+=ms;}
