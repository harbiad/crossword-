import { it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { cpus, platform, release, arch } from 'node:os';
import { execFileSync } from 'node:child_process';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import handler from '../api/generate';
import legacyHandler from './fixtures/legacy-generate';
import { generateCrossword, validatePuzzle, type WordClue } from '../src/lib/generateCrossword';
import { metrics, resetMetrics, setCandidateLimit } from './metrics';
import { summarize } from './statistics';

function seeded(seed: number) {
  let state = seed >>> 0;
  return () => { state = (state * 1664525 + 1013904223) >>> 0; return state / 0x100000000; };
}
const hash = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');
const fields = ['apiPreparationMs', 'apiTotalMs', 'apiCandidateCount', 'responseBytes', 'clientCandidateCount',
  'clientPreparationMs', 'templatesMs', 'constructMs', 'validationMs', 'gridBuildMs', 'totalMs',
  'solverAttempts', 'validationCalls', 'entries', 'intersections'] as const;
type Sample = { pool: string; candidatesByLength: Record<string, number>; seed: number; size: number; mode: string; answerDirection: 'rtl' | 'ltr'; band: string;
  success: boolean; payloadSha256: string; puzzleSha256: string; error: string | null } & Record<typeof fields[number], number>;

it('benchmarks the real local API and unmocked generation pipeline', async () => {
  const count = Number(process.env.CROSSWORD_BENCH_SEEDS ?? (process.env.CROSSWORD_BENCH_STRESS ? 50 : 10));
  if (!Number.isInteger(count) || count < 1) throw new Error('CROSSWORD_BENCH_SEEDS must be a positive integer');
  const pools = (process.env.CROSSWORD_BENCH_POOLS ?? 'default').split(',');
  if (pools.some(pool => !['default', 'legacy'].includes(pool) && (!Number.isInteger(Number(pool)) || Number(pool) < 24))) throw new Error('Invalid CROSSWORD_BENCH_POOLS');
  const band = process.env.CROSSWORD_BENCH_BAND ?? 'beginner';
  if (!['beginner', 'intermediate', 'advanced'].includes(band)) throw new Error('Invalid CROSSWORD_BENCH_BAND');
  const output = resolve(process.env.CROSSWORD_BENCH_OUTPUT ?? 'benchmarks/results/current.json');
  mkdirSync(resolve(output, '..'), { recursive: true });
  const sourceFiles = ['api/generate.ts', 'api/_lib/candidates.ts', 'api/_lib/dictionary.ts', 'api/_lib/dictionary.generated.ts', 'api/_lib/dictionary.stage2.generated.ts', 'api/_lib/dictionary.stage3a.generated.ts', 'api/_lib/dictionary.stage3b.generated.ts', 'api/_lib/dictionary.stage3b.qa.generated.ts', 'api/_lib/dictionary.stage3b.methodology.generated.ts', 'benchmarks/fixtures/legacy-generate.ts', 'api/cefr_levels.ts', 'api/DICT_COMMON_30000_non_empty.ts',
    'src/lib/generateCrossword.ts', 'src/lib/construct.ts', 'src/lib/preparedCandidates.ts', 'src/lib/preparedTemplate.ts', 'src/App.tsx', 'src/lib/generateWithRetry.ts', 'src/lib/templates.ts', 'src/lib/crossword.ts',
    'benchmarks/crossword.benchmark.ts', 'benchmarks/instrumentation.ts', 'benchmarks/metrics.ts'];
  const metadata = {
    startedAt: new Date().toISOString(), gitCommit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
    sourceHashes: Object.fromEntries(sourceFiles.map(file => [file, hash(readFileSync(file))])),
    node: process.version, platform: platform(), osRelease: release(), arch: arch(), cpu: cpus()[0]?.model,
    seedsPerConfiguration: count, pools, budgetScale: Number(process.env.CROSSWORD_BENCH_BUDGET_SCALE ?? 1), band, warmups: 1, rng: 'LCG 1664525/1013904223 uint32; independent API/client streams reset to seed',
    timing: 'Real wall-clock production deadlines preserved; seeds reproduce inputs, not exact timeout-dependent solver outcomes',
    network: false, percentiles: 'median midpoint; p95 nearest rank; includes successes and failures',
  };
  const samples: Sample[] = [];
  const originalRandom = Math.random;
  const run = async (seed: number, size: number, mode: string, pool: string): Promise<Sample> => {
    resetMetrics();
    setCandidateLimit(pool === 'default' || pool === 'legacy' ? undefined : Number(pool));
    Math.random = seeded(seed);
    let body = '', status = 0;
    const response = {
      status(value: number) { status = value; return this; }, setHeader() { return this; },
      send(value: string) { body = value; return this; },
    };
    const apiStart = performance.now();
    await (pool === 'legacy' ? legacyHandler : handler)({ method: 'POST', body: { size, mode, band } } as VercelRequest, response as unknown as VercelResponse);
    const apiTotalMs = performance.now() - apiStart;
    if (status !== 200) throw new Error(`Local API returned ${status}: ${body}`);
    const payload = JSON.parse(body) as { entries: WordClue[] };
    const answerDirection = mode === 'en_to_ar' ? 'rtl' : 'ltr';
    Math.random = seeded(seed);
    const start = performance.now();
    const puzzle = generateCrossword(size, payload.entries, answerDirection);
    const totalMs = performance.now() - start;
    const timedMetrics = { ...metrics };
    const validation = puzzle.entries.length ? validatePuzzle(puzzle.grid, puzzle.entries, answerDirection) : null;
    const error = validation && !validation.ok ? validation.errors.join(' | ') : null;
    const sample: Sample = {
      pool, candidatesByLength: payload.entries.reduce<Record<string, number>>((counts, entry) => { counts[entry.answer.length] = (counts[entry.answer.length] ?? 0) + 1; return counts; }, {}),
      seed, size, mode, answerDirection, band, success: puzzle.entries.length > 0 && !error, error,
      payloadSha256: hash(body), puzzleSha256: hash(JSON.stringify(puzzle.entries)),
      apiTotalMs, apiPreparationMs: timedMetrics.apiPreparationMs ?? 0,
      apiCandidateCount: payload.entries.length, responseBytes: Buffer.byteLength(body, 'utf8'),
      clientCandidateCount: timedMetrics.clientCandidateCount ?? 0,
      clientPreparationMs: timedMetrics.clientPreparationMs ?? 0, templatesMs: timedMetrics.templatesMs ?? 0,
      constructMs: timedMetrics.constructMs ?? 0, validationMs: timedMetrics.validationMs ?? 0,
      gridBuildMs: (timedMetrics.gridBuildIncludingValidationMs ?? 0) - (timedMetrics.validationMs ?? 0),
      totalMs, solverAttempts: timedMetrics.solverAttempts ?? 0, validationCalls: timedMetrics.validationCalls ?? 0,
      entries: puzzle.entries.length,
      intersections: puzzle.grid.flat().filter(cell => cell.type === 'letter' && cell.entries.size === 2).length,
    };
    expect(sample.apiPreparationMs).toBeGreaterThan(0);
    expect(sample.clientPreparationMs).toBeGreaterThan(0);
    expect(sample.templatesMs).toBeGreaterThan(0);
    return sample;
  };
  try {
    console.info('Warmup: seed 0, 7x7 RTL (excluded from results)');
    for (const pool of pools) await run(0, 7, 'en_to_ar', pool);
    // Alternate modes each seed to reduce systematic drift from grouping languages.
    for (let seed = 1; seed <= count; seed++) for (const size of [7, 9, 11, 13]) for (const mode of ['en_to_ar', 'ar_to_en']) for (const pool of pools) {
      const sample = await run(seed, size, mode, pool);
      samples.push(sample);
      writeFileSync(output, JSON.stringify({ metadata, samples }, null, 2) + '\n');
      console.info(`${samples.length}/${count * 8 * pools.length} pool=${pool} seed=${seed} ${size} ${sample.answerDirection}: ${sample.success ? 'OK' : 'FAIL'} ${sample.totalMs.toFixed(0)}ms entries=${sample.entries} attempts=${sample.solverAttempts}`);
    }
  } finally { Math.random = originalRandom; setCandidateLimit(undefined); }
  const summary = pools.flatMap(pool => [7, 9, 11, 13].flatMap(size => ['rtl', 'ltr'].map(answerDirection => {
    const group = samples.filter(sample => sample.pool === pool && sample.size === size && sample.answerDirection === answerDirection);
    return { pool, size, answerDirection, candidatesByLength: Object.fromEntries(Array.from({ length: size - 1 }, (_, i) => [i + 2, summarize(group.map(s => s.candidatesByLength[i + 2] ?? 0))])), runs: group.length, successRate: group.filter(s => s.success).length / group.length,
      generationFailures: group.filter(s => !s.entries).length, invalidPuzzles: group.filter(s => s.error).length,
      metrics: Object.fromEntries(fields.map(field => [field, summarize(group.map(s => s[field]))])),
      successfulTotalMs: summarize(group.filter(s => s.success).map(s => s.totalMs)),
      failedTotalMs: summarize(group.filter(s => !s.success).map(s => s.totalMs)),
    };
  })));
  writeFileSync(output, JSON.stringify({ metadata: { ...metadata, completedAt: new Date().toISOString() }, summary, samples }, null, 2) + '\n');
  const lines = ['# Crossword generation benchmark', '', `Commit: ${metadata.gitCommit}`, `Band: ${band}; seeds: 1–${count}; CPU: ${metadata.cpu}; Node: ${metadata.node}`, '',
    'Times below are total generateCrossword milliseconds, including failures. API is measured locally, without network.', '',
    '| Pool | Size | Answers | Success | Median ms | p95 ms | Slowest ms |', '|---|---|---|---:|---:|---:|---:|',
    ...summary.map(s => { const t = s.metrics.totalMs; return `| ${s.pool} | ${s.size} | ${s.answerDirection} | ${(s.successRate * 100).toFixed(0)}% | ${t.median?.toFixed(1)} | ${t.p95?.toFixed(1)} | ${t.slowest?.toFixed(1)} |`; }),
    '', '## Warm API preparation and uncompressed payload', '',
    '| Pool | Size | Answers | Preparation median ms | Preparation p95 ms | Payload median bytes | Candidates median |',
    '|---|---|---|---:|---:|---:|---:|',
    ...summary.map(s => `| ${s.pool} | ${s.size} | ${s.answerDirection} | ${s.metrics.apiPreparationMs.median?.toFixed(3)} | ${s.metrics.apiPreparationMs.p95?.toFixed(3)} | ${s.metrics.responseBytes.median} | ${s.metrics.apiCandidateCount.median} |`),
    '', '## Candidates by answer length (median across seeds)', '',
    '| Pool | Size | Answers | Length: count |', '|---|---|---|---|',
    ...summary.map(s => `| ${s.pool} | ${s.size} | ${s.answerDirection} | ${Object.entries(s.candidatesByLength).map(([length, value]) => `${length}: ${value.median}`).join(', ')} |`),
    '', 'Full per-phase distributions, counts, hashes, machine metadata, and raw seeded samples are in the adjacent JSON file.',
    'Real production wall-clock deadlines remain enabled, so machine load can change outcomes despite identical seeded inputs.', '',
  ];
  writeFileSync(output.replace(/\.json$/, '') + '.md', lines.join('\n'));
  console.info(lines.join('\n'));
  expect(samples.filter(s => s.error), 'Generated puzzles must be structurally valid').toEqual([]);
});
