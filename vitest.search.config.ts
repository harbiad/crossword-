import{defineConfig}from'vitest/config';
import{searchExperiment}from'./benchmarks/search/plugin';
export default defineConfig({plugins:[searchExperiment()],test:{include:['benchmarks/search/experiments.benchmark.ts'],testTimeout:7200000,fileParallelism:false}});
