import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
const baseline = JSON.parse(readFileSync(new URL('../generator_failure_analysis/baseline_sources.json', import.meta.url), 'utf8')) as {sources:Record<string,string>};
import type { Plugin } from 'vite';
export function diagnosticInstrumentation(): Plugin {
 return {name:'generation-diagnostics',enforce:'pre',transform(source,id){
  if(!id.endsWith('/src/lib/construct.ts')&&!id.endsWith('/src/lib/generateCrossword.ts'))return;
  let code=baseline.sources[id.endsWith('/construct.ts')?'src/lib/construct.ts':'src/lib/generateCrossword.ts'] ?? source;
  const replace=(a:string,b:string)=>{if(code.split(a).length!==2)throw new Error(`Diagnostic marker: ${a}`);code=code.replace(a,b);};
  if(id.endsWith('/generateCrossword.ts')) {
   replace("const templateCount = answerDirection === 'ltr' ? 24 : 6;", "const templateCount = control.templates || (answerDirection === 'ltr' ? 24 : 6);");
   replace("getTemplates(size, answerDirection === 'ltr' ? 3 : 2, templateCount)", "(control.fixedTemplates ?? getTemplates(size, control.minRun || (answerDirection === 'ltr' ? 3 : 2), templateCount))");
   for(const name of ['timeBudgetMs','innerBudgetMs']) { const marker=code.match(new RegExp(`  const ${name} = answerDirection[\\s\\S]*?;`))![0]; replace(marker,marker.replace('= answerDirection','= (answerDirection').replace(/;$/,') * control.budget;')); }
   replace('      return { template, geometry, score, viable, quality };', "      diagnostic.templates.push({signature:template.map(row=>row.join('')).join('/'),slots:geometry.slots.length,lengths:Object.fromEntries([...lengths].map(len=>[len,{slots:geometry.slots.filter(s=>s.length===len).length,candidates:buckets.get(len)?.words.length??0}])),score,viable,quality});\n      return { template, geometry, score, viable, quality };");
   replace('  for (const ranked of rankedTemplates) {', "  if(control.ranking === 'coverage') rankedTemplates.sort((a,b)=> a.geometry.slots.reduce((n,s)=>n+Math.log(1+(buckets.get(s.length)?.words.length??0)),0)/a.geometry.slots.length - b.geometry.slots.reduce((n,s)=>n+Math.log(1+(buckets.get(s.length)?.words.length??0)),0)/b.geometry.slots.length);\n  for (const ranked of rankedTemplates) {\n    diagnostic.rank++; ");
   replace('      const placements = constructCrossword(', '      beginAttempt(slots.length); const diagnosticStarted=performance.now();\n      const placements = (control.strategy === \'arc\' ? constructArc : constructCrossword)(');
   replace('          useFillAllSlots: true,', "          useFillAllSlots: control.strategy === 'fill', useWordCentric: control.strategy === 'word', useBacktracking:control.strategy === 'backtracking', minWords:control.minWords,minIntersectionPct:control.minIntersectionPct,");
   replace('      if (!placements.length) {', '      attempt().ms=performance.now()-diagnosticStarted; attempt().placements=placements.length;\n      if (!placements.length) {');
   replace('    if (hasConflict || wordCells.length !== answer.length) {', "    if (hasConflict || wordCells.length !== answer.length) { diagnostic.buildRejections.push('placement_conflict');");
   replace('  if (emptyCount > 0) {', "  if (emptyCount > 0) { diagnostic.buildRejections.push(`unfilled_white_cells:${emptyCount}`);");
   replace('  const validation = validatePuzzle(grid, entries, answerDirection);', '  const validationStart=performance.now();\n  const validation = validatePuzzle(grid, entries, answerDirection); diagnostic.validationMs+=performance.now()-validationStart;');
   replace('  if (!validation.ok) {', '  if (!validation.ok) { diagnostic.validationErrors.push(...validation.errors);');
  }else {
   const start=code.indexOf('function constructCrosswordFillAllSlots('); const end=code.indexOf('type WordPlacement =');
   const prefix=code.slice(0,start), suffix=code.slice(end); code=code.slice(start,end);
   replace('    return lookupCandidates(prepared, pattern, usedWords, options.candidateWindows?.get(slot.length));','    const lookupStats={examined:0}; return measuredLookup(lookupCandidates(prepared, pattern, usedWords, options.candidateWindows?.get(slot.length),lookupStats),lookupStats);');
   replace('    const changed: Array<{ r: number; c: number }> = [];', '    const placementStart=performance.now();\n    const changed: Array<{ r: number; c: number }> = [];');
   replace('    return changed;', '    attempt().placementMs+=performance.now()-placementStart; return changed;');
   if(code.split('if (getNow() > deadline) return false;').length!==3)throw new Error('deadline markers');
   code=code.replaceAll('if (getNow() > deadline) return false;','if (getNow() > deadline) {attempt().deadlines++; return false;}');
   replace('    if (remaining.length === 0) return true;', '    attempt().maxDepth=Math.max(attempt().maxDepth,slots.length-remaining.length);\n    if (remaining.length === 0) return true;');
   replace('      if (candidates.length === 0) return false;', "      if (candidates.length === 0) {attempt().deadEnds++;collapse(slot,geometry.cells.get(slot)!.map(({r,c})=>grid[r][c]),usedWords,'mrv_zero');return false;}");
   replace('    const slot = remaining[bestIdx];', '    const slot = remaining[bestIdx]; attempt().selections++;attempt().selectedDomainTotal+=bestCandidates.length; attempt().domainHistogram[bestCandidates.length]=(attempt().domainHistogram[bestCandidates.length]??0)+1; if(diagnostic.selections.length<100)diagnostic.selections.push({rank:diagnostic.rank,slot,depth:usedWords.size,candidates:bestCandidates.length}); attempt().selectedLengths[slot.length]=(attempt().selectedLengths[slot.length]??0)+1;');
   replace('        if (!hasCandidateForSlot(neighbor)) { feasible = false; break; }', "        if (!hasCandidateForSlot(neighbor)) {attempt().forwardFailures++;collapse(neighbor,geometry.cells.get(neighbor)!.map(({r,c})=>grid[r][c]),usedWords,'forward_zero'); feasible = false; break; }");
   replace('    for (const wc of bestCandidates) {', "    const visitedCandidates=new Set<string>();\n    for (const wc of bestCandidates) {\n      attempt().candidateVisits++; const candidateKey=wc.answer+':'+wc.isInverted; if(visitedCandidates.has(candidateKey))attempt().duplicateVisits++;visitedCandidates.add(candidateKey);");
   replace('        placements.pop();', '        attempt().backtracks++; placements.pop();');
   code=prefix+code+suffix;
  }
  return {code:`import { constructArc } from ${JSON.stringify(fileURLToPath(new URL('./arc-solver.ts',import.meta.url)))};\nimport { control,diagnostic,attempt,beginAttempt,measuredLookup,collapse } from ${JSON.stringify(fileURLToPath(new URL('./diagnostic-state.ts',import.meta.url)))};\n${code}`,map:null};
 }};
}
