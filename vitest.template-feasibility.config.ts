import {defineConfig} from 'vitest/config';
export default defineConfig({test:{include:['benchmarks/template-feasibility/census.benchmark.ts','benchmarks/template-feasibility/explore.benchmark.ts','benchmarks/template-feasibility/deep.benchmark.ts'],testTimeout:7200000,fileParallelism:false}});
