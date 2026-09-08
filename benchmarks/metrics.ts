export const clock = () => performance.now();
export const metrics: Record<string, number> = {};
export function add(name: string, value: number) { metrics[name] = (metrics[name] ?? 0) + value; }
export function resetMetrics() { for (const key of Object.keys(metrics)) delete metrics[key]; }
// Benchmark-only override; never imported into the production build.
export let candidateLimit: number | undefined;
export function setCandidateLimit(limit: number | undefined) { candidateLimit = limit; }
