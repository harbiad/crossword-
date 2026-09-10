// Independent streams keep layout discovery invariant to candidate count/order.
// The seed is drawn once per request; no shared/global RNG is replaced.
export function generationRandom(seed: number) {
  const stream = (salt: number) => {
    let state = (seed ^ salt) >>> 0;
    return () => ((state = (Math.imul(state, 1664525) + 1013904223) >>> 0) / 4294967296);
  };
  return { candidates: stream(0x9e3779b9), templates: stream(0x243f6a88) };
}
