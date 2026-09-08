import { describe, expect, it } from 'vitest';
import { summarize } from './statistics';

describe('benchmark distributions', () => {
  it('uses midpoint medians and nearest-rank p95 without mutating samples', () => {
    const values = [9, 1, 4, 2];
    expect(summarize(values)).toEqual({ median: 3, p95: 9, slowest: 9 });
    expect(values).toEqual([9, 1, 4, 2]);
    expect(summarize(Array.from({ length: 20 }, (_, i) => i + 1))).toEqual({ median: 10.5, p95: 19, slowest: 20 });
  });
  it('handles missing successes or failures without inventing zero timings', () => {
    expect(summarize([])).toEqual({ median: null, p95: null, slowest: null });
    expect(summarize([7])).toEqual({ median: 7, p95: 7, slowest: 7 });
  });
});
