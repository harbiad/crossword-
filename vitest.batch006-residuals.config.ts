import {defineConfig}from'vitest/config';
import {residualDomainInstrumentation}from'./benchmarks/residual-domain-instrumentation';
export default defineConfig({plugins:[residualDomainInstrumentation()],test:{include:['benchmarks/batch006-residuals.benchmark.ts'],testTimeout:7200000,fileParallelism:false}});
