import { expect, it } from 'vitest';
import { Worker } from 'node:worker_threads';
import { once } from 'node:events';
import { readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import handler from '../api/generate';
import { validatePuzzle, type WordClue } from '../src/lib/generateCrossword';
import type { GenerationResponse } from '../src/workers/crosswordProtocol';

const assets = resolve('dist/assets');
const file = readdirSync(assets).find(name => /^crossword\.worker-.*\.js$/.test(name));
if (!file) throw new Error('Run npm run build before the worker integration checks.');
const entry = pathToFileURL(resolve(assets, file)).href;
const output = resolve('benchmarks/results/worker-integration.json');
const results: unknown[] = [];

async function startWorker(seed = 1) {
  // Execute the actual Vite-built worker in a real separate thread. This small
  // adapter supplies browser messaging globals; it is NOT a browser UI test.
  const worker = new Worker(`
    const { parentPort, workerData } = require('node:worker_threads');
    let state = workerData.seed >>> 0;
    Math.random = () => { state = (state * 1664525 + 1013904223) >>> 0; return state / 0x100000000; };
    globalThis.self = globalThis;
    globalThis.postMessage = value => parentPort.postMessage(value);
    parentPort.on('message', data => globalThis.onmessage({ data }));
    import(workerData.entry).then(() => parentPort.postMessage({ type: 'ready' }));
  `, { eval: true, workerData: { entry, seed } });
  try { await once(worker, 'message'); return worker; }
  catch (error) { await worker.terminate(); throw error; }
}

async function getPool(size: number, mode: string) {
  let raw = '', status = 0, state = 1;
  const original = Math.random;
  Math.random = () => { state = (state * 1664525 + 1013904223) >>> 0; return state / 0x100000000; };
  try {
    await handler({ method: 'POST', body: { size, mode, band: 'beginner' } } as VercelRequest, {
      status(code: number) { status = code; return this; }, setHeader() { return this; }, send(body: string) { raw = body; return this; },
    } as unknown as VercelResponse);
  } finally { Math.random = original; }
  expect(status).toBe(200);
  return (JSON.parse(raw) as { entries: WordClue[] }).entries;
}

it.each(['rtl', 'ltr'] as const)('returns a valid %s puzzle with real structured-cloned Sets and inversion flags', async answerDirection => {
  const entries = await getPool(7, answerDirection === 'rtl' ? 'en_to_ar' : 'ar_to_en');
  const worker = await startWorker();
  try {
    const result = once(worker, 'message');
    worker.postMessage({ type: 'generate', requestId: 10, size: 7, entries, answerDirection });
    const [response] = await result as [GenerationResponse];
    expect(response.type).toBe('result');
    if (response.type !== 'result') throw new Error('Worker failed');
    const puzzle = response.puzzle;
    expect(puzzle.entries.length).toBeGreaterThan(0);
    expect(validatePuzzle(puzzle.grid, puzzle.entries, answerDirection)).toEqual({ ok: true, errors: [] });
    for (const cell of puzzle.grid.flat()) if (cell.type === 'letter') expect(cell.entries).toBeInstanceOf(Set);
    expect(puzzle.entries.every(e => typeof e.isInverted === 'boolean')).toBe(true);
    expect(puzzle.entries.some(e => e.isInverted)).toBe(true);
    results.push({ size: 7, answerDirection, entries: puzzle.entries.length, validation: 'passed', setsPreserved: true });
  } finally { await worker.terminate(); }
});

it('keeps the host event loop responsive during a real 13x13 worker search', async () => {
  const entries = await getPool(13, 'ar_to_en');
  const worker = await startWorker();
  const start = performance.now();
  let last = start, ticks = 0, largestGapMs = 0;
  const timer = setInterval(() => {
    const now = performance.now();
    largestGapMs = Math.max(largestGapMs, now - last);
    last = now;
    ticks++;
  }, 10);
  try {
    const pending = once(worker, 'message');
    worker.postMessage({ type: 'generate', requestId: 11, size: 13, entries, answerDirection: 'ltr' });
    const [response] = await pending as [GenerationResponse];
    expect(response.type).toBe('result');
    // Empty generation is an explicit unsuccessful result, not an exception.
    expect(ticks).toBeGreaterThan(50);
    expect(largestGapMs).toBeLessThan(250);
    const sample = { size: 13, answerDirection: 'ltr', elapsedMs: performance.now() - start, hostHeartbeatTicks: ticks,
      largestHeartbeatGapMs: largestGapMs, generationSuccess: response.type === 'result' && response.puzzle.entries.length > 0 };
    results.push(sample);
    console.info(sample);
  } finally {
    clearInterval(timer);
    await worker.terminate();
  }
});

it('reports a caught worker exception without leaking implementation details', async () => {
  const worker = await startWorker();
  try {
    const pending = once(worker, 'message');
    worker.postMessage({ type: 'generate', requestId: 12, size: 7, entries: null, answerDirection: 'ltr' });
    expect((await pending)[0]).toEqual({ type: 'error', requestId: 12 });
  } finally { await worker.terminate(); }
  mkdirSync(resolve(output, '..'), { recursive: true });
  writeFileSync(output, JSON.stringify({ checkedAt: new Date().toISOString(), workerAsset: file,
    environment: 'Node worker_threads running Vite production worker; not a browser UI test', results }, null, 2) + '\n');
});
