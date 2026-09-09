import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
import { instrumentation } from './benchmarks/instrumentation';

if (process.env.CROSSWORD_BENCH_BUDGET_SCALE && process.env.CROSSWORD_BENCH_BUDGET_SCALE !== '1') {
  throw new Error('Approved comparison requires unchanged production budgets');
}
export default defineConfig({
  plugins: [instrumentation(), {
    name: 'approved-benchmark-observations', enforce: 'pre',
    transform(source, id) {
      if (!id.endsWith('/src/lib/construct.ts') && !id.endsWith('/src/lib/generateCrossword.ts') && !id.endsWith('/src/lib/arcConsistency.ts')) return;
      let code = source;
      if (id.endsWith('/arcConsistency.ts')) {
        const marker = 'if (performance.now() > end) return false;';
        if (code.split(marker).length !== 4) throw new Error('Arc timeout marker changed');
        code = code.replaceAll(marker, 'if (performance.now() > end) { observations.timeouts++; return false; }');
      } else if (id.endsWith('/construct.ts')) {
        const marker = 'if (getNow() > deadline) return false;';
        if (code.split(marker).length !== 3) throw new Error('Timeout instrumentation marker changed');
        code = code.replaceAll(marker, 'if (getNow() > deadline) { observations.timeouts++; return false; }');
      } else {
        for (const [before, after] of [
          ['  // For LTR: give each template', '  observations.viableTemplates = templateScores.length; observations.totalTemplates = templates.length;\n  // For LTR: give each template'],
          ['  if (!validation.ok) {', '  if (!validation.ok) {\n    observations.validationErrors.push(...validation.errors);'],
        ]) {
          if (code.split(before).length !== 2) throw new Error(`Observation marker changed: ${before}`);
          code = code.replace(before, after);
        }
      }
      return { code: `import { observations } from ${JSON.stringify(fileURLToPath(new URL('./benchmarks/approved-metrics.ts', import.meta.url)))};\n${code}`, map: null };
    },
  }],
  test: { include: ['benchmarks/approved.benchmark.ts'], testTimeout: 7_200_000, fileParallelism: false },
});
