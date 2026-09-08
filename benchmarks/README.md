# Crossword generation benchmark

Run the real local API handler and real generator, using the checked-in non-empty dictionary. No HTTP server, remote API, mocked solver, synthetic vocabulary, or network timing is involved.

```sh
npm run bench:crossword                 # 10 seeds × 4 sizes × 2 modes = 80 samples
npm run bench:crossword:stress          # 50 seeds per configuration = 400 samples
CROSSWORD_BENCH_SEEDS=20 npm run bench:crossword
CROSSWORD_BENCH_BAND=advanced npm run bench:crossword
CROSSWORD_BENCH_OUTPUT=benchmarks/results/after.json npm run bench:crossword
```

Default band: `beginner` (matches the app's initial setting). Default output: `benchmarks/results/current.json` and `.md`. The JSON is checkpointed after every sample. Runs may take several minutes because the existing production timeouts are preserved. Failures are results, not skipped samples. Invalid returned puzzles fail the benchmark.

## Reproduction and comparison

Each API and client run gets an independent LCG stream reset to the same seed. Compare the same band, seed count, input payload hashes, source hashes, Node version, and machine. The run records these plus commit, CPU and OS. The dictionary actually used is `api/DICT_COMMON_30000_non_empty.ts`.

**Seeds reproduce candidate ordering and initial random choices, not exact results under wall-clock deadlines.** Faster/slower machines and system load can change how far search progresses, which changes subsequent random consumption and success. This benchmark deliberately does not replace clocks or disable time budgets: that would change the current generation behavior being measured. For before/after work use an idle machine, run serially, and repeat runs if comparing small differences. Timings include one excluded 7×7 RTL warmup per pool; module import, dictionary loading, transpilation and Vitest startup are outside measured samples.

Sizes are 7, 9, 11 and 13. RTL = EN→AR; LTR = AR→EN. Both modes run for each size and seed. This measures **one API request and one generateCrossword call**, not App.tsx's multi-request retries or difficulty fallback.

## Measurements

All durations are milliseconds. Raw samples and every metric's median, nearest-rank p95, and maximum are saved. Configuration summaries also contain success rate, generation failure count, invalid-puzzle count and separate success/failure total-time distributions. With ten samples, nearest-rank p95 equals the slowest sample.

- `apiPreparationMs`: warm candidate preparation before JSON serialization (legacy scans/sorts/expands; optimized API samples precomputed length/CEFR buckets).
- `apiTotalMs`: local handler call including request checks and response serialization; excludes network and cold import cost.
- `apiCandidateCount`: number of entries actually returned (the legacy API can slightly exceed 3000; optimized limits are exact).
- `responseBytes`: exact serialized response UTF-8 bytes, before compression.
- `clientCandidateCount`: candidate count after normalization/filtering.
- `clientPreparationMs`: initial normalization, length-bucket indexing/shuffling, plus per-attempt candidate slicing. Solver-internal indexing is included in construct time.
- `templatesMs`: template generation, ranking, and per-template slot/length preparation.
- `constructMs`: sum of real constructCrossword calls, including its search and internal candidate indexing.
- `validationMs`: full validatePuzzle calls during grid construction. Solver-internal checks remain in construct time.
- `gridBuildMs`: final-grid construction and numbering, excluding validation.
- `totalMs`: full generateCrossword call, excluding API work and JSON parsing. Phase totals need not equal this exactly: loop/control overhead remains unallocated.
- `solverAttempts`, `validationCalls`, `entries`, `intersections`: counts; intersections count cells shared by two entries, not pairs of adjacent letters. Failed generation has zero final entries/intersections.

## Instrumentation isolation

`vitest.benchmark.config.ts` installs a benchmark-only source-transform plugin. It injects phase timers into the real source modules in memory; it does not edit production files. Its markers fail if later refactors move instrumented sections, so missing instrumentation cannot silently produce a misleading result. Normal Vitest runs and Vite production builds do not load this plugin or benchmark code. No solver optimization or production RNG/clock change is included.

## Comparing API candidate pools

```sh
# Three-seed screen: old API versus four balanced pool sizes, all grid sizes/modes.
CROSSWORD_BENCH_SEEDS=3 CROSSWORD_BENCH_POOLS=legacy,3000,2000,1000,500 CROSSWORD_BENCH_OUTPUT=benchmarks/results/api-pool-screen.json npm run bench:crossword
# Confirm the shortlisted pool with ten seeds, compared with the saved baseline.
CROSSWORD_BENCH_POOLS=2000 CROSSWORD_BENCH_OUTPUT=benchmarks/results/api-pool-confirmation.json npm run bench:crossword
```

`CROSSWORD_BENCH_POOLS` accepts `default`, `legacy`, or integer caps >=24, comma-separated. Overrides exist only in the benchmark transform, not in the public API or production configuration. Pools alternate within each seed/size/mode. `fixtures/legacy-generate.ts` freezes the API before optimization (commit e095dba); only import paths differ. It shares the real dictionary and CEFR classifier with the optimized API. Source hashes identify all of these inputs. Run the same comparison with `CROSSWORD_BENCH_BAND=intermediate` or `advanced` to measure those bands separately.

`candidatesByLength` records exact per-sample API counts and per-configuration distributions. The index is created once at module import; warm measurements intentionally exclude this cold-start cost. There is no global shuffle across CEFR preference tiers. The optimized API balances counts across eligible answer lengths, drawing easier tiers first **within each length** and redistributing capacity when a length is exhausted. This restores the former intended soft preference: beginner A→B→C, intermediate A/B→C, advanced A/B/C together. It does not introduce strict CEFR filtering.

The selected production cap is **2,000**. See [API optimization results](results/api-optimization.md) for the selection criterion, full before/after results, and limitations.

## Indexed solver comparison

[Solver optimization results](results/solver-optimization.md) compare a fresh pre-indexing baseline against the final implementation, using the same 2,000-candidate API pool and seeds 1–10 for all eight size/direction configurations.

```sh
CROSSWORD_BENCH_OUTPUT=benchmarks/results/solver-after.json npm run bench:crossword
# Experimental reduction relative to CURRENT production budgets (benchmark only):
CROSSWORD_BENCH_SEEDS=3 CROSSWORD_BENCH_BUDGET_SCALE=0.75 npm run bench:crossword
```

`CROSSWORD_BENCH_BUDGET_SCALE` multiplies both total-search and inner-attempt budgets. The normal command has no override. The saved 75% and 50% screening files were run against the original budgets; production defaults were subsequently halved after the measurements. Their metadata and source hashes record that distinction. The before, indexing-only, budget screens, rejected sparse-template result, quality-ranking confirmation, and final default-budget runs are retained separately.

Client preparation now includes normalized canonical records, shuffled length buckets, and canonical position/character posting lists. Constructor attempts reuse these objects with small offset/count windows. Template timings include cached geometry lookup and quality/availability ranking. Validation and generation failures remain measured exactly as before. Success comparisons count every attempted seed; entry/intersection quality comparisons use successful puzzles only, so failures do not artificially lower reported puzzle word counts. App retries are covered separately by unit tests; the benchmark still measures one generator invocation, not network or end-to-end UI latency.

## Built Web Worker integration

`npm run test:worker` builds the app and exercises the emitted worker asset in a real Node worker thread. It verifies both answer languages, structural-clone preservation of Sets, worker exception reporting, and host event-loop scheduling during a heavy 13×13 search. These heavier checks are separate from normal `npm test`.

This is not a browser UI test. See [worker migration verification](results/worker-migration.md) for measured scheduling results and the pending browser confirmation. The normal generation benchmark continues to measure the unchanged solver directly, without network or worker startup overhead.
