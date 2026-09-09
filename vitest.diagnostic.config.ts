import { defineConfig } from 'vitest/config';
import { diagnosticInstrumentation } from './benchmarks/diagnostic-instrumentation';
export default defineConfig({plugins:[diagnosticInstrumentation()],test:{include:['benchmarks/diagnostic.benchmark.ts'],testTimeout:7200000,fileParallelism:false}});
