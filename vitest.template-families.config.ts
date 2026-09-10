import {defineConfig} from 'vitest/config';
export default defineConfig({test:{include:['benchmarks/template-families/*.benchmark.ts'],testTimeout:7200000,fileParallelism:false}});
