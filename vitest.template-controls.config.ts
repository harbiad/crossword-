import {defineConfig} from 'vitest/config';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
export default defineConfig({plugins:[{name:'frozen-template-controls',enforce:'pre',transform(_source,id){
 const name=id.split('/').pop();if(!id.includes('/src/lib/')||!['generateCrossword.ts','arcConsistency.ts','templates.ts'].includes(name??''))return;
 let code=readFileSync('template_feasibility_13x13/baseline/'+name!.replace('.ts','.txt'),'utf8');
 const imports=`import {controlTemplates,compare,record} from ${JSON.stringify(resolve('benchmarks/template-feasibility/control.ts'))};\n`;
 if(name==='generateCrossword.ts'){
 code=code.replace("getTemplates(size, answerDirection === 'ltr' ? 3 : 2, templateCount)","controlTemplates(getTemplates(size, answerDirection === 'ltr' ? 3 : 2, templateCount))");
 code=code.replace('.sort((a, b) => b.quality - a.quality || b.score - a.score)', '.sort(compare)');
 }else if(name==='arcConsistency.ts'){
 code=code.replace('export function constructArc(', 'function originalConstructArc(');
 code+='\nexport function constructArc(...args: Parameters<typeof originalConstructArc>) { const start=performance.now();const result=originalConstructArc(...args);record(args[2],performance.now()-start);return result; }\n';
 }
 return {code:imports+code,map:null};
}}],test:{include:['benchmarks/template-feasibility/filtering.benchmark.ts'],testTimeout:7200000,fileParallelism:false}});
