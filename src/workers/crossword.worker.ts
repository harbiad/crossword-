import { generateCrossword } from '../lib/generateCrossword';
import type { GenerationRequest, GenerationResponse } from './crosswordProtocol';

self.onmessage = (event: MessageEvent<GenerationRequest>) => {
  const request = event.data;
  if (request.type !== 'generate') return;
  let response: GenerationResponse;
  try {
    const puzzle = generateCrossword(request.size, request.entries, request.answerDirection);
    response = { type: 'result', requestId: request.requestId, puzzle };
  } catch {
    response = { type: 'error', requestId: request.requestId };
  }
  // Structured cloning preserves Cell.entries Set values and grid/Entry data.
  self.postMessage(response);
};
