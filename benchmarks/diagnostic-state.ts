import type { Slot } from '../src/lib/templates';
import type { OrientedWord } from '../src/lib/preparedCandidates';
export const control = { fixedTemplates: undefined as number[][][] | undefined, budget: 1, templates: 0, strategy: 'fill', pool: 2000, minIntersectionPct: undefined as number | undefined, minWords: undefined as number | undefined, ranking: 'density', minRun: 0 };
export type Attempt = { rank: number; slots: number; ms: number; placements: number; selections: number; selectedDomainTotal: number; maxDepth: number; backtracks: number; forwardFailures: number; deadEnds: number; deadlines: number; lookupCalls: number; lookupMs: number; placementMs: number; duplicateVisits: number; candidateVisits: number; examined: number; domainHistogram: Record<number,number>; selectedLengths: Record<number, number> };
export const diagnostic = { selections: [] as object[], templates: [] as object[], attempts: [] as Attempt[], patterns: [] as object[], validationErrors: [] as string[], buildRejections: [] as string[], validationMs: 0, rank: -1 };
export function resetDiagnostic() { diagnostic.selections=[]; diagnostic.templates=[]; diagnostic.attempts=[];diagnostic.patterns=[]; diagnostic.validationErrors=[];diagnostic.buildRejections=[];diagnostic.validationMs=0;diagnostic.rank=-1; }
export function attempt() { return diagnostic.attempts[diagnostic.attempts.length-1]; }
export function beginAttempt(slots: number) { diagnostic.attempts.push({rank:diagnostic.rank,slots,ms:0,placements:0,selections:0,selectedDomainTotal:0,maxDepth:0,backtracks:0,forwardFailures:0,deadEnds:0,deadlines:0,lookupCalls:0,lookupMs:0,placementMs:0,duplicateVisits:0,candidateVisits:0,examined:0,domainHistogram:{},selectedLengths:{}}); }
export function* measuredLookup(iterator: Generator<OrientedWord>, stats: {examined:number}) {
  const a=attempt(); if (a) a.lookupCalls++;
  while (true) { const start=performance.now(),before=stats.examined; const result=iterator.next(); if(a) {a.lookupMs+=performance.now()-start;a.examined+=stats.examined-before;} if(result.done)return; yield result.value; }
}
export function collapse(slot: Slot, pattern: (string|null)[], used: Set<string>, reason: string) {
  if(diagnostic.patterns.length<20) diagnostic.patterns.push({rank:diagnostic.rank,slot,pattern:pattern.map(c=>c??'?').join(''),used:[...used],reason,depth:used.size});
}
