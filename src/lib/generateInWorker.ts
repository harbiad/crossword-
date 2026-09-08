import type { Crossword } from './crossword';
import type { GenerationRequest, GenerationResponse } from '../workers/crosswordProtocol';

export type WorkerPort = Pick<Worker, 'postMessage' | 'terminate' | 'onmessage' | 'onerror' | 'onmessageerror'>;
export type WorkerFactory = () => WorkerPort;
const createWorker: WorkerFactory = () => new Worker(new URL('../workers/crossword.worker.ts', import.meta.url), { type: 'module' });
let nextRequestId = 0;

export function generateInWorker(
  request: Omit<GenerationRequest, 'type' | 'requestId'>,
  signal: AbortSignal,
  factory: WorkerFactory = createWorker,
): Promise<Crossword> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException('Puzzle request cancelled.', 'AbortError'));
      return;
    }
    let worker: WorkerPort;
    try { worker = factory(); }
    catch { reject(new Error('Could not start puzzle generation. Please try again.')); return; }
    const requestId = ++nextRequestId;
    let settled = false;
    const finish = (puzzle?: Crossword, error?: Error) => {
      if (settled) return;
      settled = true;
      signal.removeEventListener('abort', cancel);
      worker.onmessage = null;
      worker.onerror = null;
      worker.onmessageerror = null;
      worker.terminate();
      if (error) reject(error);
      else resolve(puzzle!);
    };
    const cancel = () => finish(undefined, new DOMException('Puzzle request cancelled.', 'AbortError'));
    signal.addEventListener('abort', cancel, { once: true });
    worker.onmessage = (event: MessageEvent<GenerationResponse>) => {
      if (event.data.requestId !== requestId || settled) return;
      if (signal.aborted) { cancel(); return; }
      if (event.data.type === 'result') finish(event.data.puzzle);
      else finish(undefined, new Error('Could not build a puzzle. Please try again.'));
    };
    worker.onerror = (event) => {
      event.preventDefault();
      finish(undefined, new Error('Puzzle generation stopped unexpectedly. Please try again.'));
    };
    worker.onmessageerror = () => finish(undefined, new Error('Could not receive the puzzle. Please try again.'));
    try {
      if (signal.aborted) cancel();
      else worker.postMessage({ ...request, type: 'generate', requestId } satisfies GenerationRequest);
    } catch {
      finish(undefined, new Error('Could not send the puzzle request. Please try again.'));
    }
  });
}
