import { expect, it, vi } from 'vitest';
import { generateWithRetry } from './generateWithRetry';
import type { Crossword } from './crossword';

const pool = Array.from({ length: 6 }, (_, i) => ({ answer: `WORD${i}`, clue: '' }));
const failure = { entries: [] } as unknown as Crossword;
const success = { entries: [{ id: 'entry' }] } as unknown as Crossword;

it('fetches and generates once on success', async () => {
  const fetch = vi.fn().mockResolvedValue(pool), generate = vi.fn().mockReturnValue(success);
  expect(await generateWithRetry(fetch, generate)).toBe(success);
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(generate).toHaveBeenCalledTimes(1);
});
it('uses a fresh pool for its only controlled retry', async () => {
  const second = pool.map(word => ({ ...word, clue: 'new' }));
  const fetch = vi.fn().mockResolvedValueOnce(pool).mockResolvedValueOnce(second);
  const generate = vi.fn().mockReturnValueOnce(failure).mockReturnValueOnce(success);
  expect(await generateWithRetry(fetch, generate)).toBe(success);
  expect(generate.mock.calls).toEqual([[pool], [second]]);
});
it('stops after two failed calls instead of nesting more retries', async () => {
  const fetch = vi.fn().mockResolvedValue(pool), generate = vi.fn().mockReturnValue(failure);
  expect(await generateWithRetry(fetch, generate)).toBeNull();
  expect(fetch).toHaveBeenCalledTimes(2);
  expect(generate).toHaveBeenCalledTimes(2);
});
it('handles insufficient pools within the same request bound and propagates API errors', async () => {
  const generate = vi.fn();
  expect(await generateWithRetry(async () => [], generate)).toBeNull();
  expect(generate).not.toHaveBeenCalled();
  const fetch = vi.fn().mockRejectedValue(new Error('API unavailable'));
  await expect(generateWithRetry(fetch, generate)).rejects.toThrow('API unavailable');
  expect(fetch).toHaveBeenCalledTimes(1);
});

it('awaits asynchronous worker results before retrying with a new pool', async () => {
  let complete!: (value: Crossword) => void;
  const fetch = vi.fn().mockResolvedValue(pool);
  const generate = vi.fn().mockImplementationOnce(() => new Promise<Crossword>(resolve => { complete = resolve; })).mockResolvedValueOnce(success);
  const pending = generateWithRetry(fetch, generate);
  await Promise.resolve();
  expect(fetch).toHaveBeenCalledTimes(1);
  complete(failure);
  expect(await pending).toBe(success);
  expect(fetch).toHaveBeenCalledTimes(2);
});

it('does not retry cancelled or exceptional worker requests', async () => {
  for (const error of [new DOMException('Cancelled', 'AbortError'), new Error('Worker failed')]) {
    const fetch = vi.fn().mockResolvedValue(pool);
    const generate = vi.fn().mockRejectedValue(error);
    await expect(generateWithRetry(fetch, generate)).rejects.toBe(error);
    expect(fetch).toHaveBeenCalledTimes(1);
  }
});
