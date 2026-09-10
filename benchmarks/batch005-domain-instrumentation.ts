import { fileURLToPath } from 'node:url';
import type { Plugin } from 'vite';
export function batch005DomainInstrumentation():Plugin{
 return {name:'batch005-observe-current-domains',enforce:'pre',transform(source,id){
  if(!['/src/lib/arcConsistency.ts','/src/lib/construct.ts','/src/lib/generateCrossword.ts'].some(p=>id.endsWith(p)))return;
  let code=source;
  const replace=(a:string,b:string)=>{if(code.split(a).length!==2)throw Error(`Domain observer marker: ${a}`);code=code.replace(a,b);};
  if(id.endsWith('/generateCrossword.ts'))replace('      const placements = constructCrossword(', '      beginDomainAttempt(template);\n      const placements = constructCrossword(');
  else if(id.endsWith('/arcConsistency.ts')){
   replace('  const trail:', '  const observedUsed=new Set<string>();\n  const observeArc=(index:number,next:OrientedWord[],reason:string)=>{if(next.length>3)return;const constraints=neighbors[index].map(edge=>({position:edge.here,characters:[...new Set(domains[edge.other].map(word=>char(word,edge.there)))].sort()}));observeDomain(slots[index],constraints,observedUsed,next.length,new Set(next.map(w=>w.answer)).size,reason);};\n  const trail:');
   replace('        setDomain(edge.other, next);', "        observeArc(edge.other,next,'arc-support');\n        setDomain(edge.other, next);");
   replace('          setDomain(index, next);', "          observeArc(index,next,'all-different');\n          setDomain(index, next);");
   replace('      used.add(word.answer);','      used.add(word.answer); observedUsed.add(word.answer);');
   replace('      used.delete(word.answer);','      used.delete(word.answer); observedUsed.delete(word.answer);');
  }else{
   const start=code.indexOf('function constructCrosswordFillAllSlots('),end=code.indexOf('type WordPlacement =');const before=code.slice(0,start),after=code.slice(end);code=code.slice(start,end);
   replace('  const candidatesForSlot =', "  const observeFill=(slot:Slot,count:number,reason:string)=>observeDomain(slot,geometry.cells.get(slot)!.flatMap(({r,c},position)=>grid[r][c]?[{position,characters:[grid[r][c]!]}]:[]),usedWords,count,count,reason);\n  const candidatesForSlot =");
   replace('      if (candidates.length === 0) return false;', "      if(candidates.length<=3)observeFill(slot,candidates.length,'fill-mrv');\n      if (candidates.length === 0) return false;");
   replace('        if (!hasCandidateForSlot(neighbor)) { feasible = false; break; }', "        if (!hasCandidateForSlot(neighbor)) {observeFill(neighbor,0,'fill-forward'); feasible = false; break; }");
   code=before+code+after;
  }
  return {code:`import { observeDomain,beginDomainAttempt } from ${JSON.stringify(fileURLToPath(new URL('./batch005-domain-state.ts',import.meta.url)))};\n${code}`,map:null};
 }};
}
