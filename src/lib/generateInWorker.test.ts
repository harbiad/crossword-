import { expect, it, vi } from 'vitest';
import { generateInWorker, type WorkerPort } from './generateInWorker';
import type { GenerationRequest, GenerationResponse } from '../workers/crosswordProtocol';
import { makePuzzle } from './testing/puzzleFixtures';
import { checkEntry, revealEntries } from './crossword';

function fakeWorker() {
  const worker: WorkerPort = { postMessage: vi.fn(), terminate: vi.fn(), onmessage: null, onerror: null, onmessageerror: null };
  const requestId = () => (vi.mocked(worker.postMessage).mock.calls[0][0] as GenerationRequest).requestId;
  const send = (data: GenerationResponse) => worker.onmessage?.call(worker as Worker, { data } as MessageEvent<GenerationResponse>);
  return { worker, requestId, send };
}
const request = { size: 3, entries: [{ answer: 'ABC', clue: 'word' }], answerDirection: 'ltr' as const };

it('sends typed requests and preserves Sets, inversion, reveal and check after structured cloning', async () => {
  const fake = fakeWorker(), abort = new AbortController();
  const pending = generateInWorker(request, abort.signal, () => fake.worker);
  expect(fake.worker.postMessage).toHaveBeenCalledWith({ ...request, type: 'generate', requestId: fake.requestId() });
  const original = makePuzzle(['ABC', 'DEF', 'GHI']);
  fake.send(structuredClone({ type: 'result', requestId: fake.requestId(), puzzle: original }));
  const puzzle = await pending;
  expect(puzzle).toEqual(original);
  for (const row of puzzle.grid) for (const cell of row) if (cell.type === 'letter') expect(cell.entries).toBeInstanceOf(Set);
  const fill = revealEntries(puzzle.entries, {}, puzzle.answerDirection);
  expect(puzzle.entries.every(entry => checkEntry(entry, fill, puzzle.answerDirection))).toBe(true);
  expect(fake.worker.terminate).toHaveBeenCalledOnce();
  expect(fake.worker.onmessage).toBeNull();
});

it('ignores responses with stale request IDs', async () => {
  const fake = fakeWorker(), done = vi.fn();
  const pending = generateInWorker(request, new AbortController().signal, () => fake.worker).then(done);
  const puzzle = makePuzzle(['ABC', 'DEF', 'GHI']);
  fake.send({ type: 'result', requestId: fake.requestId() - 1, puzzle });
  await Promise.resolve();
  expect(done).not.toHaveBeenCalled();
  fake.send({ type: 'result', requestId: fake.requestId(), puzzle });
  await pending;
  expect(done).toHaveBeenCalledOnce();
});

it('terminates cancellation immediately and ignores an already queued old response', async () => {
  const fake = fakeWorker(), abort = new AbortController();
  const pending = generateInWorker(request, abort.signal, () => fake.worker);
  const rejected = expect(pending).rejects.toMatchObject({ name: 'AbortError' });
  const queued = fake.worker.onmessage!;
  abort.abort();
  queued.call(fake.worker as Worker, { data: { type: 'result', requestId: fake.requestId(), puzzle: makePuzzle(['ABC', 'DEF', 'GHI']) } } as MessageEvent);
  await rejected;
  expect(fake.worker.terminate).toHaveBeenCalledOnce();
});

it('does not create a worker for an already cancelled API request', async () => {
  const abort = new AbortController(), factory = vi.fn();
  abort.abort();
  await expect(generateInWorker(request, abort.signal, factory)).rejects.toMatchObject({ name: 'AbortError' });
  expect(factory).not.toHaveBeenCalled();
});

it.each(['reported', 'exception', 'message'] as const)('rejects worker %s errors and releases the worker', async kind => {
  const fake = fakeWorker();
  const pending = generateInWorker(request, new AbortController().signal, () => fake.worker);
  const rejected = expect(pending).rejects.toThrow(/puzzle/i);
  if (kind === 'reported') fake.send({ type: 'error', requestId: fake.requestId() });
  else if (kind === 'exception') fake.worker.onerror!.call(fake.worker as Worker, { preventDefault: vi.fn() } as unknown as ErrorEvent);
  else fake.worker.onmessageerror!.call(fake.worker as Worker, {} as MessageEvent);
  await rejected;
  expect(fake.worker.terminate).toHaveBeenCalledOnce();
});

it('handles startup and postMessage failures', async () => {
  await expect(generateInWorker(request, new AbortController().signal, () => { throw new Error('blocked'); })).rejects.toThrow('Could not start');
  const fake = fakeWorker();
  vi.mocked(fake.worker.postMessage).mockImplementation(() => { throw new Error('clone error'); });
  await expect(generateInWorker(request, new AbortController().signal, () => fake.worker)).rejects.toThrow('Could not send');
  expect(fake.worker.terminate).toHaveBeenCalledOnce();
});
