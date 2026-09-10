import {snapshot} from './diagnostics';
import { experiment, counts, proofs, depths } from './state';
import { getEntryCellAt } from '../../src/lib/crossword';
import { prepareTemplate, type PreparedTemplate } from '../../src/lib/preparedTemplate';
import { indexCandidates, lookupCandidates, type OrientedWord, type PreparedCandidates, type CandidateWindow } from '../../src/lib/preparedCandidates';
import type { WordClue } from '../../src/lib/generateCrossword';
import type { Placement } from '../../src/lib/construct';

type Options = {
  preparedCandidates?: PreparedCandidates;
  preparedTemplate?: PreparedTemplate;
  candidateWindows?: ReadonlyMap<number, CandidateWindow>;
  timeBudgetMs?: number;
};
const impossible = new WeakMap<PreparedCandidates,Set<string>>();
type Crossing = { other: number; here: number; there: number };

// Maintain support at every crossing, including between unassigned slots.
// Immutable domain arrays and a rollback trail avoid copying the entire search
// state. Answers remain canonical; orientation only changes character lookup.
export function constructArc(
  size: number, words: WordClue[], template: number[][],
  direction: 'ltr' | 'rtl', options: Options = {},
): Placement[] {
  if (template.length !== size) return [];
  const end = performance.now() + (options.timeBudgetMs ?? 400);
  const geometry = options.preparedTemplate ?? prepareTemplate(template, direction);
  const prepared = options.preparedCandidates ?? indexCandidates(words);
  const slots = geometry.slots;
  const complete=slots.every(s=>!options.candidateWindows?.get(s.length)||options.candidateWindows.get(s.length)!.count>=prepared.byLength.get(s.length)!.words.length);
  const cacheKey=direction+':'+template.map(r=>r.join('')).join('/');
  let failures=impossible.get(prepared);if(!failures){failures=new Set();impossible.set(prepared,failures);}
  if(experiment.memo&&complete&&failures.has(cacheKey)){counts.cachedFailures++;return [];}
  const remember=(reason:string)=>{if(performance.now()<=end){proofs.push({template:cacheKey,reason,completePool:complete});if(experiment.memo&&complete)failures!.add(cacheKey);}};
  const domains = slots.map(slot => [...lookupCandidates(
    prepared, Array(slot.length).fill(null), new Set(), options.candidateWindows?.get(slot.length),
  )]);
  const neighbors: Crossing[][] = slots.map(() => []);
  const owners = new Map<string, { slot: number; position: number }>();
  slots.forEach((slot, index) => geometry.cells.get(slot)!.forEach(({ r, c }, position) => {
    const key = `${r},${c}`;
    const old = owners.get(key);
    if (old) {
      neighbors[index].push({ other: old.slot, here: position, there: old.position });
      neighbors[old.slot].push({ other: index, here: old.position, there: position });
    } else {
      owners.set(key, { slot: index, position });
    }
  }));
  const char = (word: OrientedWord, position: number) =>
    word.answer[word.isInverted ? word.answer.length - 1 - position : position];

  if (experiment.dedup) for (let i=0;i<domains.length;i++) {
    const seen=new Set<string>(); domains[i]=domains[i].filter(w=>{const key=w.answer+':'+w.isInverted;if(seen.has(key))return false;seen.add(key);return true;});
  }
  const trail: { index: number; previous: OrientedWord[] }[] = [];
  const setDomain = (index: number, value: OrientedWord[]) => {
    trail.push({ index, previous: domains[index] });
    domains[index] = value;
  };
  const restore = (mark: number) => {
    while (trail.length > mark) {
      const old = trail.pop()!;
      domains[old.index] = old.previous;
    }
  };
  const propagate = (initial: number[]) => {
    const queue = [...initial];
    const queued = new Set(queue);
    for (let head = 0; head < queue.length; head++) {
      if (performance.now() > end) { counts.timeouts++; return false; }
      const index = queue[head];
      queued.delete(index);
      if (!domains[index].length) return false;
      if(experiment.singleton && domains[index].every(w=>w.answer===domains[index][0].answer)) {
        const answer=domains[index][0].answer;
        for(let other=0;other<slots.length;other++) {
          if(other===index||slots[other].length!==answer.length)continue;
          const next=domains[other].filter(w=>w.answer!==answer);
          if(next.length===domains[other].length)continue;
          setDomain(other,next);
          if(!next.length){counts.uniquenessContradictions++;return false;}
          if(!queued.has(other)){queue.push(other);queued.add(other);}
        }
      }
      for (const edge of neighbors[index]) {
        const supported = new Set(domains[index].map(word => char(word, edge.here)));
        const distinct = experiment.pairUniqueness && slots[index].length===slots[edge.other].length ? new Map<string,Set<string>>() : undefined;
        if(distinct)for(const w of domains[index]){const c=char(w,edge.here);const s=distinct.get(c)??new Set<string>();s.add(w.answer);distinct.set(c,s);}
        const next = domains[edge.other].filter(word => {const c=char(word,edge.there);if(!supported.has(c))return false;const s=distinct?.get(c);return !s || s.size>1 || !s.has(word.answer);});
        if (next.length === domains[edge.other].length) continue;
        setDomain(edge.other, next);
        if (!next.length) { counts.deadEnds++; return false; }
        if (!queued.has(edge.other)) {
          queue.push(edge.other);
          queued.add(edge.other);
        }
      }
    }
    return true;
  };
  counts.attempts++;
  snapshot('before-propagation',slots,domains,neighbors);
  if (!propagate(slots.map((_, index) => index))) { if(performance.now()>end)counts.rootTimeouts++;else counts.rootContradictions++; snapshot('root-arc-contradiction',slots,domains,neighbors);remember('root-arc'); return []; }
  if (experiment.hall) {
    for(const length of geometry.lengths){const indexes=slots.map((s,i)=>s.length===length?i:-1).filter(i=>i>=0);
      const match=new Map<string,number>();
      const augment=(index:number,seen:Set<string>):boolean=>{for(const w of domains[index]){if(seen.has(w.answer))continue;seen.add(w.answer);const old=match.get(w.answer);if(old===undefined||augment(old,seen)){match.set(w.answer,index);return true;}}return false;};
      if(!indexes.every(i=>augment(i,new Set()))){counts.hallContradictions++;remember('hall');return [];}
    }
  }

  snapshot('after-propagation',slots,domains,neighbors);
  const chosen = new Map<number, OrientedWord>();
  const used = new Set<string>();
  const search = (): boolean => {
    if (performance.now() > end) { counts.timeouts++; return false; }
    counts.nodes++;
    if(experiment.portfolio)depths.set(cacheKey,Math.max(depths.get(cacheKey)??0,chosen.size/slots.length));
    if (chosen.size === slots.length) return true;
    const tie=(i:number)=>experiment.tie==='remaining-degree'?neighbors[i].filter(e=>!chosen.has(e.other)).length:experiment.tie==='constrained'?neighbors[i].filter(e=>!chosen.has(e.other)).reduce((n,e)=>n+1/domains[e.other].length,0):experiment.tie==='longest'?slots[i].length:experiment.tie==='fixed'?neighbors[i].filter(e=>domains[e.other].length===1).length:experiment.tie==='stable'?-i:neighbors[i].length;
    let best = -1;
    for (let index = 0; index < slots.length; index++) {
      if (chosen.has(index)) continue;
      if (best < 0 || domains[index].length < domains[best].length ||
          (domains[index].length === domains[best].length && tie(index) > tie(best))) {
        best = index;
      }
    }
    if (best < 0 || !domains[best].length) return false;
    let values=domains[best];
    if(experiment.portfolioLex&&experiment.secondPass)values=[...values].sort((a,b)=>a.answer.localeCompare(b.answer));
    if(experiment.lcv){
      const support=neighbors[best].filter(e=>!chosen.has(e.other)).map(e=>{const counts=new Map<string,number>();for(const w of domains[e.other]){const c=char(w,e.there);counts.set(c,(counts.get(c)??0)+1);}return {e,counts};});
      const score=(w:OrientedWord)=>support.reduce((sum,{e,counts})=>sum+Math.log(counts.get(char(w,e.here))??0),0);
      values=values.map((w,i)=>({w,i,score:score(w)})).sort((a,b)=>b.score-a.score||a.i-b.i).map(v=>v.w);
    }
    if(experiment.lookahead && values.length<=experiment.lookahead){
      const until=performance.now()+Math.max(1,(end-performance.now())*.2);
      const scored=new Map<OrientedWord,number>();
      for(const w of values){
        if(performance.now()>until)break;
        counts.probes++;
        const mark=trail.length,changed=[best];setDomain(best,[w]);let ok=true;
        for(let i=0;i<slots.length;i++)if(i!==best&&!chosen.has(i)&&slots[i].length===w.answer.length){const next=domains[i].filter(v=>v.answer!==w.answer);if(next.length!==domains[i].length){setDomain(i,next);changed.push(i);if(!next.length){ok=false;break;}}}
        ok=ok&&propagate(changed);
        const timedOut=performance.now()>end;
        const score=ok?domains.reduce((sum,d,i)=>sum+(chosen.has(i)||i===best?0:Math.log(d.length)),0):-Infinity;
        restore(mark);if(timedOut)break;scored.set(w,score);
      }
      values=values.filter(w=>scored.get(w)!==-Infinity).map((w,i)=>({w,i,score:scored.get(w)??0})).sort((a,b)=>b.score-a.score||a.i-b.i).map(x=>x.w);
    }
    for (const word of values) {
      if (performance.now() > end) { counts.timeouts++; return false; }
      if (used.has(word.answer)) continue;
      const mark = trail.length;
      setDomain(best, [word]);
      chosen.set(best, word);
      used.add(word.answer);
      const changed = [best];
      let feasible = true;
      // All-different is by canonical spelling, across clues and orientations.
      for (let index = 0; index < slots.length; index++) {
        if (chosen.has(index) || slots[index].length !== word.answer.length) continue;
        const next = domains[index].filter(candidate => candidate.answer !== word.answer);
        if (next.length < domains[index].length) {
          setDomain(index, next);
          changed.push(index);
          if (!next.length) { feasible = false; break; }
        }
      }
      if (feasible && propagate(changed) && search()) return true;
      snapshot('branch-rollback',slots,domains,neighbors,chosen);
      counts.backtracks++;
      used.delete(word.answer);
      chosen.delete(best);
      restore(mark);
    }
    return false;
  };
  if (!search()) {if(performance.now()<=end){counts.exhaustiveFailures++;remember('exhaustive-search');}return [];}
  return slots.map((slot, index) => {
    const word = chosen.get(index)!;
    // Retain geometric numbering anchors even when typing begins at the far end.
    const entry = {
      ...slot, answer: word.answer, isInverted: false,
      col: slot.col + (slot.direction === 'across' && direction === 'rtl' ? slot.length - 1 : 0),
    };
    const { r, c } = getEntryCellAt(entry, 0, direction);
    return { ...word, row: r, col: c, direction: slot.direction };
  });
}
