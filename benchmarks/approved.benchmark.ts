import { test, expect } from 'vitest';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { cpus, platform, release } from 'node:os';
import { execFileSync } from 'node:child_process';
import { DICTIONARY_BATCH006_QA as dictionary } from '../api/_lib/dictionary.stage3b.batch006.qa.generated';
import { candidatePoolLimit } from '../api/_lib/candidatePool';
import { createCandidateIndex, selectCandidates, type Mode } from '../api/_lib/candidates';
import { eligibleTranslation, normalizeArabicWord, type DictionaryPolicy } from '../api/_lib/dictionary';
import { generateCrossword, validatePuzzle } from '../src/lib/generateCrossword';
import { normalizeAnswer } from '../src/lib/preparedCandidates';
import { getEntryCellAt } from '../src/lib/crossword';
import { metrics, resetMetrics } from './metrics';
import { observations, resetObservations } from './approved-metrics';
import { summarize } from './statistics';

const directory = process.env.APPROVED_BENCH_OUTPUT ?? 'benchmarks/results/approved-current';
const seeds = Array.from({ length: 30 }, (_, i) => i + 1);
const policies: DictionaryPolicy[] = process.env.APPROVED_BENCH_POLICY === 'approved-only' ? ['approved-only'] : ['compatibility', 'approved-only'];
if (process.env.APPROVED_BENCH_POLICY && process.env.APPROVED_BENCH_POLICY !== 'approved-only') throw new Error('Unsupported benchmark policy filter');
const modes: Mode[] = ['en_to_ar', 'ar_to_en'];
const sizes = [7, 9, 11, 13];
function random(seed: number) { let state = seed >>> 0; return () => ((state = (Math.imul(state, 1664525) + 1013904223) >>> 0) / 4294967296); }
function csv(rows: object[]) {
  if (!rows.length) return '';
  const keys = Object.keys(rows[0]);
  const quote = (v: unknown) => JSON.stringify(typeof v === 'object' ? JSON.stringify(v) : String(v ?? '')).replace(/\\"/g, '""');
  return [keys.join(','), ...rows.map(row => keys.map(k => quote((row as Record<string, unknown>)[k])).join(','))].join('\n') + '\n';
}
const key = (answer: string, clue: string) => JSON.stringify([normalizeAnswer(answer), clue.trim()]);
function provenance(policy: DictionaryPolicy, mode: Mode) {
  const result = new Set<string>();
  for (const h of dictionary) for (const t of h.translations) {
    // Independently enforce the critical production invariants as well as the shared filter.
    if (!eligibleTranslation(h, t, policy, mode)) continue;
    if (h.status === 'rejected' || t.status === 'rejected' || t.register === 'dialect') throw new Error('Rejected provenance');
    if (policy === 'approved-only' && (h.status !== 'approved' || t.status !== 'approved' || t.register !== 'msa')) throw new Error('Unapproved provenance');
    if ((mode === 'en_to_ar' ? t.allowedForEnToAr : t.allowedForArToEn) === false) throw new Error('Disallowed provenance');
    const english = h.english.trim().replace(/[^a-zA-Z]/g, '').toUpperCase();
    if (mode === 'ar_to_en') result.add(key(english, t.arabic));
    else for (const variant of t.arabic.split(/[/،;|]/)) result.add(key(normalizeArabicWord(variant), english));
  }
  return result;
}

test('paired approved dictionary generation measurement', () => {
  const api = readFileSync('api/generate.ts', 'utf8');
  expect(api).toContain('candidatePoolLimit(gridSize, mode)');
  expect(api).toContain("createCandidateIndex(DICTIONARY_BATCH006_QA, 'compatibility')");
  const indexes = new Map(policies.map(p => [p, createCandidateIndex(dictionary, p)]));
  const sources = new Map(policies.flatMap(p => modes.map(m => [`${p}:${m}`, provenance(p, m)] as const)));
  const coverage: object[] = [];
  for (const policy of policies) for (const mode of modes) for (const size of sizes) {
    const groups = indexes.get(policy)!.get(`${size}:${mode}:advanced`)!;
    for (let length = 2; length <= 13; length++) {
      const pairs = (groups.get(length) ?? []).flat();
      coverage.push({ policy, mode, size, length, indexedCandidates: pairs.length, uniqueCanonicalAnswers: new Set(pairs.map(p => normalizeAnswer(p.answer))).size });
    }
  }
  mkdirSync(directory, { recursive: true });
  writeFileSync(`${directory}/candidate_length_distribution.csv`, csv(coverage));
  type Run = { whitePct: number; crossedPct: number; signature: string; seed: number; size: number; mode: Mode; policy: DictionaryPolicy; success: boolean; generationMs: number; entries: number; intersections: number; candidateCount: number; candidateLengths: Record<number, number>; solverAttempts: number; timeoutChecks: number; viableTemplates: number; totalTemplates: number; validationErrors: string[]; qualityErrors: string[]; failureReason: string };
  const runs: Run[] = [];
  const originalRandom = Math.random;
  const started = new Date().toISOString();
  try {
    // One excluded warm-up per configuration. No network, concurrent solver, or reduced budget.
    for (const seed of [0, ...seeds]) for (const size of sizes) for (const mode of modes) for (const policy of seed % 2 ? policies : [...policies].reverse()) {
      Math.random = random(seed);
      const pairs = selectCandidates(indexes.get(policy)!, size, mode, 'advanced', process.env.APPROVED_BENCH_CURRENT_API !== '0' ? candidatePoolLimit(size, mode) : 2000);
      const source = sources.get(`${policy}:${mode}`)!;
      for (const pair of pairs) expect(source.has(key(pair.answer, pair.clue))).toBe(true);
      const selected = new Set(pairs.map(p => key(p.answer, p.clue)));
      const candidateLengths: Record<number, number> = {};
      for (const pair of pairs) candidateLengths[pair.answer.length] = (candidateLengths[pair.answer.length] ?? 0) + 1;
      Math.random = random(seed);
      resetMetrics(); resetObservations();
      const began = performance.now();
      const cw = generateCrossword(size, pairs, mode === 'en_to_ar' ? 'rtl' : 'ltr');
      const generationMs = performance.now() - began;
      const qualityErrors: string[] = [];
      if (cw.entries.length) {
        qualityErrors.push(...validatePuzzle(cw.grid, cw.entries, cw.answerDirection).errors);
        for (const entry of cw.entries) {
          if (!selected.has(key(entry.answer, entry.clue)) || !source.has(key(entry.answer, entry.clue))) qualityErrors.push(`Invalid provenance ${entry.id}`);
          if (mode === 'ar_to_en' && entry.answer.length < 3) qualityErrors.push(`English answer below minimum ${entry.id}`);
          if (typeof entry.isInverted !== 'boolean') qualityErrors.push(`Missing inversion metadata ${entry.id}`);
          for (let i = 0; i < entry.answer.length; i++) {
            const { r, c } = getEntryCellAt(entry, i, cw.answerDirection);
            const cell = cw.grid[r]?.[c];
            if (!cell || cell.type !== 'letter' || cell.char !== entry.answer[i] || !cell.entries.has(entry.id)) qualityErrors.push(`Traversal ${entry.id} index ${i} at ${r},${c}`);
          }
        }
      }
      const success = cw.entries.length > 0 && !qualityErrors.length;
      const failureReason = success ? '' : qualityErrors.length ? 'returned_puzzle_quality_failure' : !observations.viableTemplates ? 'no_template_with_all_required_lengths' : observations.validationErrors.length ? 'validation_rejections_observed' : observations.timeouts ? 'solver_deadline_observed_root_cause_unestablished' : 'bounded_search_no_solution_reason_unestablished';
      const white = cw.grid.flat().filter(c => c.type === 'letter').length;
      const crossed = cw.grid.flat().filter(c => c.type === 'letter' && c.entries.size === 2).length;
      const run: Run = { whitePct: white / (size * size) * 100, crossedPct: white ? crossed / white * 100 : 0, signature: cw.grid.map(row => row.map(c => c.type === 'letter' ? '1' : '0').join('')).join('/'), seed, size, mode, policy, success, generationMs, entries: cw.entries.length, intersections: cw.grid.flat().filter(c => c.type === 'letter' && c.entries.size === 2).length, candidateCount: pairs.length, candidateLengths, solverAttempts: metrics.solverAttempts ?? 0, timeoutChecks: observations.timeouts, viableTemplates: observations.viableTemplates, totalTemplates: observations.totalTemplates, validationErrors: [...observations.validationErrors], qualityErrors, failureReason };
      if (seed) runs.push(run);
      if (seed) writeFileSync(`${directory}/runs.json`, JSON.stringify(runs, null, 2) + '\n');
      console.log(`${seed ? 'MEASURE' : 'WARMUP'} seed=${seed} ${size} ${mode} ${policy}: ${success ? 'OK' : failureReason} ${generationMs.toFixed(0)}ms words=${run.entries}`);
    }
  } finally { Math.random = originalRandom; }
  const configurations = policies.flatMap(policy => modes.flatMap(mode => sizes.map(size => {
    const group = runs.filter(r => r.policy === policy && r.mode === mode && r.size === size);
    const successful = group.filter(r => r.success);
    const successRate = successful.length / group.length * 100;
    return { size, mode, policy, attempts: group.length, successful: successful.length, failed: group.length - successful.length, successRate, generationMs: summarize(group.map(r => r.generationMs)), entries: summarize(successful.map(r => r.entries)), minimumEntries: successful.length ? Math.min(...successful.map(r => r.entries)) : null, intersections: summarize(successful.map(r => r.intersections)), whitePct: summarize(successful.map(r => r.whitePct)), crossedPct: summarize(successful.map(r => r.crossedPct)), distinctLayouts: new Set(successful.map(r => r.signature)).size, candidateCount: summarize(group.map(r => r.candidateCount)), solverAttempts: summarize(group.map(r => r.solverAttempts)), recommendation: successRate >= 95 ? 'READY' : successRate >= 80 ? 'NEARLY READY' : 'NOT READY' };
  })));
  writeFileSync(`${directory}/runs.csv`, csv(runs));
  writeFileSync(`${directory}/failure_analysis.csv`, csv(runs.filter(r => !r.success).map(r => ({ seed: r.seed, size: r.size, mode: r.mode, policy: r.policy, reason: r.failureReason, solverAttempts: r.solverAttempts, timeoutChecks: r.timeoutChecks, viableTemplates: r.viableTemplates, validationErrors: r.validationErrors, qualityErrors: r.qualityErrors }))));
  writeFileSync(`${directory}/summary.json`, JSON.stringify({ started, finished: new Date().toISOString(), commit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), runtime: process.version, machine: { platform: platform(), release: release(), cpu: cpus()[0]?.model }, seeds, band: 'advanced', candidateLimit: process.env.APPROVED_BENCH_CURRENT_API !== '0' ? 'production-size-specific' : 2000, warmups: policies.length * modes.length * sizes.length, configurations, returnedPuzzleQualityFailures: runs.filter(r => r.qualityErrors.length).length }, null, 2) + '\n');
  expect(runs).toHaveLength(seeds.length * sizes.length * modes.length * policies.length);
  expect(runs.filter(r => r.qualityErrors.length)).toEqual([]);
});
