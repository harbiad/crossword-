import { expect, it } from 'vitest';
import { Worker } from 'node:worker_threads';
import { once } from 'node:events';
import { readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import handler from '../api/generate';
import { PuzzleLookAhead, type PuzzleSettings } from '../src/lib/puzzleLookAhead';
import { generateWithRetry } from '../src/lib/generateWithRetry';
import { validatePuzzle, type WordClue } from '../src/lib/generateCrossword';
import type { GenerationResponse } from '../src/workers/crosswordProtocol';
import { summarize } from './statistics';

const assets = resolve('dist/assets');
const file = readdirSync(assets).find(name => /^crossword\.worker-.*\.js$/.test(name));
if (!file) throw new Error('Build before benchmarking the look-ahead cache.');
const entry = pathToFileURL(resolve(assets, file)).href;
function rng(seed: number) {
  let state = seed >>> 0;
  return () => { state = (state * 1664525 + 1013904223) >>> 0; return state / 0x100000000; };
}
async function fetchPool(settings: PuzzleSettings, seed: number): Promise<WordClue[]> {
  let raw = '', status = 0;
  const random = Math.random;
  Math.random = rng(seed);
  try {
    await handler({ method: 'POST', body: settings } as VercelRequest, {
      status(code: number) { status = code; return this; }, setHeader() { return this; }, send(body: string) { raw = body; return this; },
    } as unknown as VercelResponse);
  } finally { Math.random = random; }
  if (status !== 200) throw new Error(`Local API status ${status}`);
  return (JSON.parse(raw) as { entries: WordClue[] }).entries;
}
async function build(settings: PuzzleSettings, entries: WordClue[], signal: AbortSignal, seed: number) {
  const worker = new Worker(`
    const { parentPort, workerData } = require('node:worker_threads');
    let state = workerData.seed >>> 0;
    Math.random = () => { state = (state * 1664525 + 1013904223) >>> 0; return state / 0x100000000; };
    globalThis.self = globalThis;
    globalThis.postMessage = value => parentPort.postMessage(value);
    parentPort.on('message', data => globalThis.onmessage({ data }));
    import(workerData.entry).then(() => parentPort.postMessage({ type: 'ready' }));
  `, { eval: true, workerData: { entry, seed } });
  const cancel = () => { void worker.terminate(); };
  signal.addEventListener('abort', cancel, { once: true });
  try {
    await once(worker, 'message', { signal });
    const pending = once(worker, 'message', { signal });
    worker.postMessage({ type: 'generate', requestId: 1, size: settings.size, entries,
      answerDirection: settings.mode === 'en_to_ar' ? 'rtl' : 'ltr' });
    const [response] = await pending as [GenerationResponse];
    if (response.type !== 'result') throw new Error('Worker exception');
    if (response.puzzle.entries.length) {
      const validation = validatePuzzle(response.puzzle.grid, response.puzzle.entries, response.puzzle.answerDirection);
      if (!validation.ok) throw new Error(validation.errors.join(' | '));
    }
    return response.puzzle;
  } finally {
    signal.removeEventListener('abort', cancel);
    await worker.terminate();
  }
}

it('measures existing request-to-ready latency versus consuming one prefetched puzzle', async () => {
  const seeds = Number(process.env.CROSSWORD_LOOKAHEAD_SEEDS ?? 5);
  const samples: { seed: number; size: number; mode: string; beforeMs: number; displaySuccess: boolean;
    backgroundMs: number | null; cacheReady: boolean; afterMs: number | null; backgroundCalls: number }[] = [];
  for (let seed = 1; seed <= seeds; seed++) for (const size of [7, 9, 11, 13]) for (const mode of ['en_to_ar', 'ar_to_en'] as const) {
    const settings: PuzzleSettings = { size, mode, band: 'beginner' };
    let pool: WordClue[] = [], round = 0;
    const start = performance.now();
    const puzzle = await generateWithRetry(async () => {
      pool = await fetchPool(settings, seed + round * 1000);
      return pool;
    }, entries => build(settings, entries, new AbortController().signal, seed + round++ * 1000));
    const beforeMs = performance.now() - start;
    const sample = { seed, size, mode, beforeMs, displaySuccess: !!puzzle,
      backgroundMs: null as number | null, cacheReady: false, afterMs: null as number | null, backgroundCalls: 0 };
    if (puzzle) {
      let complete!: () => void;
      const finished = new Promise<void>(resolve => { complete = resolve; });
      const cache = new PuzzleLookAhead(async (config, candidates, signal) => {
        sample.backgroundCalls++;
        const began = performance.now();
        try { return await build(config, candidates, signal, seed + 100); }
        finally { sample.backgroundMs = performance.now() - began; complete(); }
      }, 0); // Exclude the intentional 1s idle delay from background build timing.
      cache.settingsChanged(settings);
      cache.remember(puzzle);
      cache.afterDisplay(settings, pool);
      await finished;
      // Let the cache's completion handler store the result before the next click.
      await new Promise(resolve => setTimeout(resolve, 0));
      const clicked = performance.now();
      const ready = cache.take(settings);
      const elapsed = performance.now() - clicked;
      sample.cacheReady = !!ready;
      if (ready) {
        sample.afterMs = elapsed;
        expect(cache.hasSeen(ready.puzzle)).toBe(false);
      }
      cache.clear();
      expect(sample.backgroundCalls).toBe(1);
    }
    samples.push(sample);
    console.info(`${samples.length}/${seeds * 8} ${size} ${mode} before=${beforeMs.toFixed(1)}ms cache=${sample.cacheReady ? sample.afterMs!.toFixed(3) + 'ms' : 'miss/unavailable'}`);
  }
  const summary = [7, 9, 11, 13].flatMap(size => ['en_to_ar', 'ar_to_en'].map(mode => {
    const group = samples.filter(s => s.size === size && s.mode === mode);
    return { size, mode, runs: group.length, generationFailures: group.filter(s => !s.displaySuccess).length,
      backgroundAttempts: group.filter(s => s.backgroundCalls).length, cacheHits: group.filter(s => s.cacheReady).length,
      beforeMs: summarize(group.map(s => s.beforeMs)),
      pairedBeforeMs: summarize(group.filter(s => s.cacheReady).map(s => s.beforeMs)),
      readyCacheMs: summarize(group.flatMap(s => s.afterMs === null ? [] : [s.afterMs])),
      backgroundMs: summarize(group.flatMap(s => s.backgroundMs === null ? [] : [s.backgroundMs])) };
  }));
  const output = resolve('benchmarks/results/lookahead-latency.json');
  mkdirSync(resolve(output, '..'), { recursive: true });
  writeFileSync(output, JSON.stringify({ measuredAt: new Date().toISOString(), node: process.version, workerAsset: file,
    scope: 'Node host with actual Vite worker and local API; request-to-ready proxy, excludes network latency and React/browser paint',
    seeds, idleDelayExcludedMs: 1000, summary, samples }, null, 2) + '\n');
  console.info(JSON.stringify(summary, null, 2));
});
