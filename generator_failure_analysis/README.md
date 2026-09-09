# Generator failure investigation

Batch004 is paused. Dictionary content, CEFR, compatibility policy, canonical answers, inversion and strict validation remain unchanged during diagnosis.

## Reproduction

Original 480-run baseline: `dictionary/approved_generation_benchmark/`, seeds 1–30, Advanced band, production 2,000-pair API selection, independent seed resets before candidate preparation and generation. The original baseline is preserved.

Detailed traces: `DIAGNOSTIC_EXPERIMENTS=baseline npm exec vitest -- run --config vitest.diagnostic.config.ts`. Default diagnostic seeds are 1–3, a subset of exactly the baseline seed set, covering both policies at every English grid and both policies at 13×13 Arabic. This small sample is for investigation, not a readiness estimate. Detailed timers add overhead; use the minimally instrumented 30-seed benchmark for final timing comparisons.

Controls: `DIAGNOSTIC_EXPERIMENTS=budget4,templates48,templates6,word,backtracking,minIntersection,minWords,poolAll,arc DIAGNOSTIC_OUTPUT=controls npm exec vitest -- run --config vitest.diagnostic.config.ts`. Each control starts from production settings and changes one setting/strategy; controls do not combine with each other. The control suite omits already-reliable compatibility 7×7 English and approved-only 9×9 English to keep this exploratory screen bounded. Per-control raw results include seeds, pools, templates, attempts and pattern traces.

All generation calls are serial, use local vocabulary without network latency, and independently validate every returned puzzle. No structural rule is relaxed for an experimental solver. The `arc` solver is initially a benchmark-only maintaining-arc-consistency alternative, not a production change.

## Production strategy and asymmetries

| Setting | English answers / LTR | Arabic answers / RTL |
|---|---|---|
| Template count | 24 | 6 |
| Minimum generated slot length | 3 | 2 |
| Whole-generation budget, 7/9/11/13 | 3000/4000/4500/4500 ms | 1100/1700/1800/1800 ms |
| Per-template budget | floor(total / viable template count) | remaining global budget |
| Inner attempt budget, 7/9/11/13 | 125/200/350/350 ms | 450/850/1000/1000 ms |
| Attempts per template, 7/9/11/13 | 18/22/20/20 | 18/22/20/20 |
| Per-length candidate window cap, 7/9/11/13 | 900/1300/1700/1700 | 900/1300/1700/1700 |
| Ranking | descending sum(slot length + 2), then bucket-count sum | same |
| Search | indexed MRV + recursive backtracking + one-hop forward checking | same |

`minIntersectionPct`, `minTotalIntersections`, `targetWords`, `minWords`, `seedPlacements` and `maxCandidatesPerSlot` do not control the production fill-all path. There is no final minWords threshold in `generateCrossword`. Filled white cells, exact runs/clues, graph connectivity, numbering, crossing correctness and block-run restrictions remain enforced by final construction/validation. Lower-threshold controls are intentional no-ops, not quality relaxations.

English Across traversal and Arabic Across traversal differ as required by the product; that is independent of these search asymmetries. Inversion remains structural in both directions and both languages.

## Measurements and limits

`diagnostic_runs.json` and `controls.json` contain per-attempt selections, accumulated selected-domain sizes, maximum successful recursive depth, recursive backtracks, forward failures, MRV zero domains, observed deadline exits, lookup calls/time, placement-write time, final validation time, actual build/validation rejection messages and up to 20 representative collapsed patterns per run. Placement time excludes forward checking. Maximum depth does not count a candidate rejected by forward checking before recursion.

Pattern prefix counts progressively add crossing letters, preserving the canonical used-word exclusion set and both orientations. They are recomputed outside the timed generation over the selected candidate pool. For poolAll controls, these full-pool counts can exceed the attempt's capped candidate window; the recorded zero-domain event itself is from the actual search window. Patterns are a bounded diagnostic sample, not an unbiased frequency distribution of every failure.

The solver already uses MRV and backtracking, not greedy placement. It repeatedly reconstructs candidate lists for remaining slots; it does not sort large lists on this path. Different clue records for the same normalized answer can repeat candidate work; canonical used-word exclusion remains enforced. Normal and inverted orientations are legitimate separate choices, not reversed-string records.

Timeout observation proves a deadline was encountered, not vocabulary insufficiency or global unsatisfiability. Exhausting an attempt is not a proof that every possible vocabulary pool or grid is unsatisfiable. A zero domain identifies the exact incompatible crossing pattern and selected pool; additional/different vocabulary or templates may change it.

## A forced-template constraint

With English's minimum white run of 3 and maximum black run of 2, row/column index 2 cannot be black: the two preceding cells would either form an illegal white run of length 1/2 or three consecutive black cells. The same argument applies from the opposite edge at index `size-3`. Consequently these rows and columns are fully white. This was verified for every traced English template. They require at least four full-grid-length entries and force those entries to intersect at these positions.

English length 2 is never required by these templates. English length 3 is very heavily used, and full lengths 7/9/11/13 are mandatory. Arabic templates use minimum run 2 and do not have this forced full-row constraint. Their dense 13×13 layouts heavily use lengths 2 and 3. Sparse Arabic 10–13 lengths are not a sufficient explanation for their failures.

## Additional controls and reproducibility safeguards

`pool3000`, `pool4000`, `pool6000`, `pool8000` change only the API request limit. `arc4000` is compared against `pool4000`, and `arc6000` against `pool6000`; each such comparison changes solver strategy only. The initial pool controls reproduce whole-production behavior: changing the number of candidates also changes how many RNG values preparation consumes, which can change template discovery. They are not fixed-layout proofs by themselves.

The fixed-layout confirmation is:

```
DIAGNOSTIC_EXPERIMENTS=pool6000,arc6000 DIAGNOSTIC_FIXED_TEMPLATES=1 DIAGNOSTIC_OUTPUT=fixed_template_controls npm exec vitest -- run --config vitest.diagnostic.config.ts
```

It reuses the exact discovery-order layouts recorded in the original detailed baseline. At 6,000 pairs, the original solver solved all three 11×11 English seeds but only two of three 13×13 English seeds. Propagation solved all three for both sizes on those same layouts. All returned puzzles passed strict validation.

The initial `poolShort`/`poolLong` controls replaced a length bucket and could reorder existing candidates even when they added none. Those results are preserved, but must not be read as isolated evidence about vocabulary quantity. Set `DIAGNOSTIC_REPLACE_LENGTH=1` to reproduce that initial variant. The corrected variant appends only new candidate pairs, retains existing order, and freezes templates; see `fixed_length_controls.json`. This avoids mistaking an ordering effect for new vocabulary support.

`baseline_sources.json` preserves the exact original solver/generator sources and SHA-256 digests. Diagnostic transforms read those frozen sources, so rerunning controls after the production fix still uses the baseline implementation. The experimental propagation implementation is preserved separately in `benchmarks/arc-solver.ts`.

## Narrow production changes

- Added maintained crossing-domain consistency with MRV, canonical all-different exclusion and reversible domain updates. It removes unsupported candidate letters between unassigned neighboring slots, beyond the previous one-hop forward check.
- Selected that path only for English grids of size 9 and above, and Arabic 13×13. Smaller Arabic grids and English 7×7 retain the existing solver.
- Increased English candidate limits to 4,000 at 9×9 and 6,000 at 11×11/13×13. Other request limits remain 2,000. Existing CEFR tiering, preference ordering, semantic eligibility and length balancing are unchanged. Larger English responses are the explicit tradeoff.
- No changes to templates, ranking, time budgets, retry limits, dictionary classifications, CEFR, inversion, cursor behavior, React UI or strict validation.

The final paired benchmark command is:

```
APPROVED_BENCH_OUTPUT=generator_failure_analysis/after APPROVED_BENCH_CURRENT_API=1 npm run bench:approved
node benchmarks/diagnostic-report.mjs
```

It repeats all 480 original configurations/seeds and independent returned-puzzle provenance/traversal/validation checks, with unchanged budgets and the new production pool limits. Original baseline artifacts are not overwritten. Detailed diagnostic observer overhead is excluded from this before/after timing comparison.

## Final diagnosis

| Configuration | Primary finding | Secondary finding / limit |
|---|---|---|
| 7×7 AR→EN compatibility | No baseline reliability problem (30/30). | Existing path retained. |
| 7×7 AR→EN approved-only | Approved candidates do not support the current templates reliably under the current search. | Not an absolute vocabulary insufficiency: the min-run-2 control solved 3/3 with the same approved pool. |
| 9×9 AR→EN compatibility | Request-pool/search limitation; all three original failed seeds (6,24,25) were separately reproduced with stage profiling. | Propagation plus the larger request pool reached 30/30. |
| 9×9 AR→EN approved-only | Crossing-domain/template incompatibility remains under the unchanged English template policy. | Neither bounded failure nor raw count proves global unsatisfiability. |
| 11×11 AR→EN compatibility | The 2,000-pair request pool drops useful crossing support, compounded by repeated one-hop search on forced full-length runs. | More time or templates alone did not rescue the exploratory seeds; larger pool on fixed layouts did. |
| 13×13 AR→EN compatibility | Joint request-pool and search-propagation limitation on dense templates with mandatory full-length crossing runs. | Enlarging one length alone was insufficient; larger pool plus propagation was stronger. Two final seeds still reached deadlines. |
| 11×11 / 13×13 AR→EN approved-only | Small approved domains lack support at required long-word crossings; 13×13 baseline branches often failed before the first recursive placement. | Larger request caps do not create new approved records. Future template choices matter as well. |
| 13×13 EN→AR compatibility | One-hop search commits to unsupported short-slot crossings; stronger propagation avoids many such branches. | Rescued 3/3 exploratory seeds at the original pool size; final 28/30, with no template or budget change. |
| 13×13 EN→AR approved-only | Restricted candidate domains across short and longer slots remain difficult. | Improved only to 3/30; not production-ready. |

Baseline generation never reached a validation rejection in the recorded 480 runs or the detailed baseline traces. Failures were incomplete construction/search, not minWords or minimum-intersection rejection. Alternative legacy solvers did produce unfilled white cells and unclued runs, correctly rejected; `validation_errors.csv` lists actual messages and frequencies. Structural correctness was not relaxed.

### Pattern evidence

Examples from seed 1 (counts include both canonical orientations, exclude used canonical words):

| Configuration | Slot coordinate (zero-based) | Progressive pattern support |
|---|---|---|
| Approved 7×7 English | Down (0,0), length 3 | `E??`: 14 → `EA?`: 0 |
| Compatibility 11×11 English | Down (0,0), length 3 | `S??`: 28 → `S?C`: 0 |
| Compatibility 11×11 English | Down (0,2), length 11 | `R??????????`: 20 → `R?I????????`: 0 |
| Compatibility 13×13 English | Across (10,0), length 13 | `U????????????`: 2 → `U?R??????????`: 0 |
| Approved 13×13 English | Down (0,1), length 13 | `??R??????????`: 0 after one crossing |
| Compatibility 13×13 Arabic | Across (12,11), length 2 | `?ة`: 0 after one crossing |

In the capped baseline pattern sample, failing English domains include length 3 and mandatory full lengths 7/9/11/13, plus intermediate lengths. Arabic 13×13 collapses frequently involve lengths 2/3/4 rather than exclusively 10–13. These bounded samples identify incompatibilities, not unbiased frequency estimates. No word should be invented or incorrectly approved to satisfy one such pattern.

Corrected, fixed-template length controls preserved every existing pair in order and appended only new pairs. Adding three-letter candidates rescued 2/3 compatibility 11×11 English and 2/3 compatibility 13×13 Arabic cases, but 0/3 compatibility 13×13 English. Adding only full-grid-length candidates rescued 1/3 compatibility 11×11 English and 0/3 compatibility 13×13 English. Arabic length 13 already had its entire indexed bucket in the original pool, so that corrected control added nothing and rescued 0/3. The initial order-changing length controls are superseded for causal interpretation.

### Minimum-run experiment

`DIAGNOSTIC_EXPERIMENTS=minRun2 DIAGNOSTIC_OUTPUT=min_run_controls npm exec vitest -- run --config vitest.diagnostic.config.ts` changes only English's minimum run from 3 to 2. It solved approved 7×7 in 3/3, compatibility 9×9 and 11×11 in 3/3, and compatibility 13×13 in 2/3; approved 11×11/13×13 remained 0/3. It does not establish 30-seed readiness. Two-letter templates are structurally valid and the old asymmetry is not a correctness necessity. This option was not deployed because it changes the word-length mix and was less reliable in the 13×13 exploratory screen than the selected pool/propagation combination. A future product decision can evaluate it explicitly; it must not be conflated with a requirement to approve more words.

### Results and limitations

See `BEFORE_AFTER.md` and `before_after.csv` for all 16 comparisons, including medians, p95, words and crossings. The final 480 calls returned 284 puzzles; all passed validation, eligible-source and canonical traversal checks, with zero internal validation rejections. Compatibility achieved 100% at 7×7 both directions, 96.7%/100% at 9×9, 96.7%/100% at 11×11, and 93.3%/93.3% at 13×13 (EN→AR / AR→EN).

The 13×13 results meet the 90% target but not the preferred 95%. Tail latency still includes deadline failures. English 13×13 approved-only failure latency regressed from median 92 ms to 2,370 ms because repeated initial propagation across attempts costs more than the original immediate forward-check collapse. This does not affect current compatibility production, but is an explicit known limitation; do not describe the change as faster for every configuration. Only 7×7 Arabic approved-only clears the requested 95% readiness threshold in the unchanged template policy.

The final measurements use Advanced, not every CEFR band, and 30 seeds are not a guarantee about real traffic. Increased English response sizes and roughly 2 KB added to the worker bundle are tradeoffs. The React main bundle, UI and worker architecture remain unchanged.

### Batch004 recommendation

Compatibility no longer needs a broad dictionary expansion to solve larger grids in this sample. Batch004 may resume as bounded learner-vocabulary review after testing this checkpoint; compatibility should remain enabled. Keep frequency/usefulness as the ranking, with explicit strata for English length 3 and the natural 7/9/11/13-letter vocabulary demanded by current templates, and useful short Arabic relationships. Do not focus only on rare 11–13-letter Arabic answers or approve technical/unnatural records to hit quotas. The two-letter English template result should inform the product decision before treating approved-only 7×7 failure as a mandate for more vocabulary. No numerical approval quota is justified by these results. Batch004 has not started.

### Files and auditability

Production changes: `api/_lib/candidatePool.ts`, `api/generate.ts`, `src/lib/arcConsistency.ts`, and the strategy dispatch in `src/lib/construct.ts`. Tests cover canonical traversal in both scripts/directions, required inversion, canonical duplicate exclusion, rollback after contradiction, incompatible domains and deadline handling; API tests cover actual pool limits in every existing band. Benchmark-only configurations, instrumentation, experimental solver snapshot, report scripts and raw/CSV artifacts support reproduction. Pre-existing unrelated working-tree changes were preserved.

## Final verification

`npm run dictionary:audit`: passed. `npm test`: 354 tests across 22 files passed. `npm run lint`: passed. `npm run build`: passed. The paired 480-run benchmark and all diagnostic/control suites passed their returned-puzzle assertions; failed generation calls remain explicitly recorded as failures. There are 571 recorded diagnostic/control/profile calls, including additional targeted baseline seeds 6/24/25 for 9×9 English.

Dictionary counts remain 16,018 headwords / 29,467 relationships: 3,562 approved, 25,529 review, 376 rejected. No dictionary text/classification or CEFR changes. Compatibility remains enabled; Batch004 has not started. Nothing was committed or pushed in this task.
