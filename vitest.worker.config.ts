import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { include: ['benchmarks/worker.integration.ts'], testTimeout: 20000, fileParallelism: false },
});
