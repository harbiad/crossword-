import { afterEach, expect, it, vi } from 'vitest';
import { PuzzleLookAhead, puzzleSignature, type PuzzleSettings } from './puzzleLookAhead';
import { makePuzzle } from './testing/puzzleFixtures';
import type { Crossword } from './crossword';

const settings: PuzzleSettings = { size: 7, band: 'beginner', mode: 'en_to_ar' };
const pool = [{ answer: 'ABC', clue: 'word' }];
const first = makePuzzle(['ABC', 'DEF', 'GHI']);
const second = makePuzzle(['JKL', 'MNO', 'PQR']);
function display(cache: PuzzleLookAhead, puzzle = first) {
  cache.settingsChanged(settings);
  cache.remember(puzzle);
  cache.finishActive();
  cache.afterDisplay(settings, pool);
}
afterEach(() => { vi.useRealTimers(); });

it('builds one replacement with the identical pool and consumes it just once', async () => {
  vi.useFakeTimers();
  const build = vi.fn().mockResolvedValue(second), cache = new PuzzleLookAhead(build);
  display(cache);
  expect(build).not.toHaveBeenCalled();
  await vi.advanceTimersByTimeAsync(1000);
  expect(build).toHaveBeenCalledTimes(1);
  expect(build.mock.calls[0][1]).toBe(pool);
  await vi.advanceTimersByTimeAsync(60000);
  expect(build).toHaveBeenCalledTimes(1);
  expect(cache.take(settings)).toEqual({ puzzle: second, pool });
  expect(cache.take(settings)).toBeNull();
  display(cache, second);
  await vi.advanceTimersByTimeAsync(1000);
  expect(build).toHaveBeenCalledTimes(2);
});

it.each(['size', 'band', 'mode'] as const)('invalidates ready cache on %s change', async field => {
  vi.useFakeTimers();
  const cache = new PuzzleLookAhead(vi.fn().mockResolvedValue(second));
  display(cache);
  await vi.advanceTimersByTimeAsync(1000);
  cache.settingsChanged({ ...settings, [field]: field === 'size' ? 9 : field === 'band' ? 'advanced' : 'ar_to_en' });
  cache.settingsChanged(settings);
  expect(cache.take(settings)).toBeNull();
});

it('aborts on settings changes and rejects a late result even after switching back', async () => {
  vi.useFakeTimers();
  let complete!: (puzzle: Crossword) => void;
  const build = vi.fn().mockImplementation(() => new Promise<Crossword>(resolve => { complete = resolve; }));
  const cache = new PuzzleLookAhead(build);
  display(cache);
  await vi.advanceTimersByTimeAsync(1000);
  cache.settingsChanged({ ...settings, size: 9 });
  expect(build.mock.calls[0][2].aborted).toBe(true);
  cache.settingsChanged(settings);
  complete(second);
  await vi.advanceTimersByTimeAsync(60000);
  expect(build).toHaveBeenCalledTimes(1);
  expect(cache.take(settings)).toBeNull();
});

it('retains an already ready puzzle while hidden without starting extra work', async () => {
  vi.useFakeTimers();
  const build = vi.fn().mockResolvedValue(second), cache = new PuzzleLookAhead(build);
  display(cache);
  await vi.advanceTimersByTimeAsync(1000);
  cache.setVisible(false);
  cache.setVisible(true);
  await vi.advanceTimersByTimeAsync(60000);
  expect(build).toHaveBeenCalledTimes(1);
  expect(cache.take(settings)?.puzzle).toBe(second);
});

it('foreground requests cancel background work and reject its late result', async () => {
  vi.useFakeTimers();
  let complete!: (puzzle: Crossword) => void;
  const build = vi.fn().mockImplementation(() => new Promise<Crossword>(resolve => { complete = resolve; }));
  const cache = new PuzzleLookAhead(build);
  display(cache);
  await vi.advanceTimersByTimeAsync(1000);
  expect(cache.take(settings)).toBeNull();
  expect(build.mock.calls[0][2].aborted).toBe(true);
  // A delayed old React effect or visibility event cannot restart speculation.
  cache.afterDisplay(settings, pool);
  cache.setVisible(false);
  cache.setVisible(true);
  complete(second);
  await vi.advanceTimersByTimeAsync(60000);
  expect(build).toHaveBeenCalledTimes(1);
  expect(cache.take(settings)).toBeNull();
});

it('does not start while hidden, and does not loop after aborting a running hidden-tab job', async () => {
  vi.useFakeTimers();
  const build = vi.fn().mockImplementation(() => new Promise(() => {}));
  const cache = new PuzzleLookAhead(build);
  cache.setVisible(false);
  display(cache);
  await vi.advanceTimersByTimeAsync(60000);
  expect(build).not.toHaveBeenCalled();
  cache.setVisible(true);
  await vi.advanceTimersByTimeAsync(1000);
  expect(build).toHaveBeenCalledTimes(1);
  cache.setVisible(false);
  expect(build.mock.calls[0][2].aborted).toBe(true);
  cache.setVisible(true);
  await vi.advanceTimersByTimeAsync(60000);
  expect(build).toHaveBeenCalledTimes(1);
});

it.each(['duplicate', 'empty', 'error'] as const)('drops %s background results without retrying', async outcome => {
  vi.useFakeTimers();
  const build = outcome === 'error' ? vi.fn().mockRejectedValue(new Error('worker failed'))
    : vi.fn().mockResolvedValue(outcome === 'duplicate' ? first : { ...first, entries: [] });
  const cache = new PuzzleLookAhead(build);
  display(cache);
  await vi.advanceTimersByTimeAsync(60000);
  expect(build).toHaveBeenCalledTimes(1);
  expect(cache.take(settings)).toBeNull();
});

it('has a stable signature independent of clues, IDs and entry ordering, and a bounded recent set', () => {
  const cache = new PuzzleLookAhead(vi.fn());
  const altered = { ...first, entries: [...first.entries].reverse().map(e => ({ ...e, clue: 'different', id: 'different' })) };
  expect(puzzleSignature(altered)).toBe(puzzleSignature(first));
  expect(puzzleSignature(second)).not.toBe(puzzleSignature(first));
  cache.remember(first);
  expect(cache.hasSeen(altered)).toBe(true);
  for (let i = 0; i < 8; i++) cache.remember({ ...second, width: 10 + i });
  expect(cache.hasSeen(first)).toBe(false);
});

it('clears delayed and in-flight work on teardown, preserving recent duplicate protection', async () => {
  vi.useFakeTimers();
  const build = vi.fn().mockResolvedValue(second), cache = new PuzzleLookAhead(build);
  display(cache);
  cache.clear();
  await vi.advanceTimersByTimeAsync(60000);
  expect(build).not.toHaveBeenCalled();
  expect(cache.hasSeen(first)).toBe(true);
});
