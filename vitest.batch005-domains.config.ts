import {defineConfig} from 'vitest/config';
import {batch005DomainInstrumentation} from './benchmarks/batch005-domain-instrumentation';
export default defineConfig({plugins:[batch005DomainInstrumentation()],test:{include:['benchmarks/batch005-domains.benchmark.ts'],testTimeout:7200000,fileParallelism:false}});
