import { defineConfig } from 'vitest/config';
import { instrumentation } from './benchmarks/instrumentation';

export default defineConfig({
  plugins: [instrumentation()],
  test: { include: ['benchmarks/crossword.benchmark.ts'], testTimeout: 7_200_000, fileParallelism: false },
});
