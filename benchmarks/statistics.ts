export function summarize(values: number[]) {
  if (!values.length) return { median: null, p95: null, slowest: null };
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return {
    median: sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2,
    p95: sorted[Math.ceil(sorted.length * 0.95) - 1],
    slowest: sorted[sorted.length - 1],
  };
}
