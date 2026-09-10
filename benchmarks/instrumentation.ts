import { fileURLToPath } from 'node:url';
import type { Plugin } from 'vite';

// Applied only by the benchmark configuration. Production sources and bundles
// contain no timing hooks. Fail loudly if a refactor invalidates a phase marker.
export function instrumentation(): Plugin {
  return {
    name: 'crossword-benchmark-timing', enforce: 'pre',
    transform(source, id) {
      const path = id.split('?')[0];
      if (!path.endsWith('/src/lib/generateCrossword.ts') && !path.endsWith('/api/generate.ts') && !path.endsWith('/benchmarks/fixtures/legacy-generate.ts')) return;
      let code = source;
      const replace = (before: string, after: string) => {
        if (code.split(before).length !== 2) throw new Error(`Benchmark marker must occur exactly once in ${path}: ${before}`);
        code = code.replace(before, after);
      };
      if (path.endsWith('/api/generate.ts') || path.endsWith('/benchmarks/fixtures/legacy-generate.ts')) {
        if (path.endsWith('/api/generate.ts')) {
          replace('    const pairs = selectCandidates(candidateIndex, gridSize, mode, band, candidatePoolLimit(gridSize, mode));',
            '    const benchApiStart = clock();\n    const pairs = selectCandidates(candidateIndex, gridSize, mode, band, candidateLimit ?? candidatePoolLimit(gridSize, mode));');
        } else {
          replace('    const baseList = buildCandidateWords(band);', '    const benchApiStart = clock();\n    const baseList = buildCandidateWords(band);');
        }
        replace('    if (pairs.length < MIN_ENTRIES_FOR_UI)', "    add('apiPreparationMs', clock() - benchApiStart);\n    if (pairs.length < MIN_ENTRIES_FOR_UI)");
      } else {
        const scale = Number(process.env.CROSSWORD_BENCH_BUDGET_SCALE ?? 1);
        if (!(scale > 0 && scale <= 1)) throw new Error('Budget scale must be in (0, 1]');
        for (const variable of ['timeBudgetMs', 'innerBudgetMs']) {
          const expression = code.match(new RegExp(`  const ${variable} = answerDirection[\\s\\S]*?;`))?.[0];
          if (!expression) throw new Error(`Missing budget marker ${variable}`);
          replace(expression, expression.replace('= answerDirection', '= (answerDirection').replace(/;$/, `) * ${scale};`));
        }
        replace('  const prepared = prepareCandidates(wordClues, size, streams?.candidates);', '  const benchPreparationStart = clock();\n  const prepared = prepareCandidates(wordClues, size, streams?.candidates);');
        replace('  const buckets = prepared.byLength;', "  const buckets = prepared.byLength;\n  add('clientPreparationMs', clock() - benchPreparationStart);\n  add('clientCandidateCount', clean.length);\n  const benchTemplatesStart = clock();");
        replace('  const attempts = size <= 7', "  add('templatesMs', clock() - benchTemplatesStart);\n  const attempts = size <= 7");
        replace('  const templateScores = templates', '  const benchRankingStart = clock();\n  const templateScores = templates');
        replace('  // For LTR: give each template', "  add('templatesMs', clock() - benchRankingStart);\n  // For LTR: give each template");
        replace('    const slots = ranked.geometry.slots;', '    const benchSlotsStart = clock();\n    const slots = ranked.geometry.slots;');
        replace('    for (let i = 0; i < attempts; i++)', "    add('templatesMs', clock() - benchSlotsStart);\n    for (let i = 0; i < attempts; i++)");
        replace('      const candidateWindows = new Map<number, CandidateWindow>();', '      const benchAttemptPreparationStart = clock();\n      const candidateWindows = new Map<number, CandidateWindow>();');
        replace('      const debugEnabled =', "      add('clientPreparationMs', clock() - benchAttemptPreparationStart);\n      const debugEnabled =");
        replace('      const placements = constructCrossword(', '      const benchSolverStart = clock();\n      const placements = constructCrossword(');
        replace('      if (debugEnabled) {\n        console.log(`[cw-gen size=${size}] attempt=${attemptsRun} placements=', "      add('constructMs', clock() - benchSolverStart);\n      add('solverAttempts', 1);\n      if (debugEnabled) {\n        console.log(`[cw-gen size=${size}] attempt=${attemptsRun} placements=");
        replace('      const cw = buildCrosswordFromPlacements(', '      const benchBuildStart = clock();\n      const cw = buildCrosswordFromPlacements(');
        replace('      if (!cw) continue;', "      add('gridBuildIncludingValidationMs', clock() - benchBuildStart);\n      if (!cw) continue;");
        replace('  const validation = validatePuzzle(grid, entries, answerDirection);', "  const benchValidationStart = clock();\n  const validation = validatePuzzle(grid, entries, answerDirection);\n  add('validationMs', clock() - benchValidationStart);\n  add('validationCalls', 1);");
      }
      return { code: `import { clock, add, candidateLimit } from ${JSON.stringify(fileURLToPath(new URL('./metrics.ts', import.meta.url)))};\n${code}`, map: null };
    },
  };
}
