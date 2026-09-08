# API candidate optimization results

## Decision

Use **2,000 candidates**: the smallest tested pool whose observed success rate was no lower than the original API in every size/mode, confirmed over seeds 1–10. This is a measured baseline-preservation criterion, not a claim that 2,000 maximizes success or is the exact minimum possible cap. The 3,000 pool performed better in the three-seed screen, at a larger payload cost.

All timing and generation comparisons below use the beginner band, the real dictionary, and the unchanged solver on Apple M4 Pro / Node v24.10.0. Intermediate and advanced band eligibility/preference are covered by unit tests, but their generation reliability has not been benchmarked here. Production wall-clock deadlines are preserved, so timing-dependent search outcomes can vary between repeats.

**Larger English grids remain unreliable:** 11×11 and 13×13 LTR had zero successes before and after. Candidate optimization improves the measured baseline; it does not make every configuration reliable. Empty results are counted as failures. No returned puzzle failed structural validation.

## Implementation and behavior

- Normalize English keys, classify CEFR, split/normalize/deduplicate Arabic meanings, and build eligible size/mode/length/tier buckets once per warm process.
- Sample without replacement using sparse partial Fisher–Yates maps. Request cost scales with the selected pool; there is no full-dictionary random-noise sort or final global shuffle.
- Allocate evenly across available answer lengths, redistributing capacity from exhausted lengths. Draw preferred CEFR tiers first within each length, then return tiers in preference order.
- Preserve soft CEFR fallback: beginner A→B→C; intermediate A/B→C; advanced A/B/C together. The old final shuffle accidentally defeated this preference. Correcting that changes candidate selection intentionally; strict CEFR filtering is not introduced.
- Preserve canonical spelling, meaning normalization, first Arabic clue for English answers, English-length eligibility in both modes, response shape, request validation, and fresh randomness between requests. The cap is now exact, whereas the old implementation could slightly exceed 3,000 when expanding meanings.
- React UI, traversal/inversion, templates, solver, and validation code are unchanged. Index construction moves work to initialization; warm timings exclude cold module import/index construction and network latency.

## Pool screen: three seeds per configuration

120 runs total: 5 pools × 3 seeds × 4 sizes × 2 modes. The frozen legacy handler matches commit e095dba apart from import paths. Its seeded payload hashes matched the saved baseline.

| Pool | Successful puzzles | Success rate | Median preparation ms | Median payload bytes |
|---|---:|---:|---:|---:|
| legacy | 5/24 | 20.8% | 10.004 | 124,972 |
| 3000 | 16/24 | 66.7% | 0.364 | 125,214 |
| 2000 | 11/24 | 45.8% | 0.249 | 83,466 |
| 1000 | 6/24 | 25.0% | 0.130 | 41,507 |
| 500 | 0/24 | 0.0% | 0.074 | 20,598 |

The 1,000 pool failed all three 7×7 English runs, while the legacy API succeeded twice. The 2,000 pool met or exceeded legacy success in each configuration; it was therefore shortlisted for ten-seed confirmation. The 500 pool failed all configurations.

## Ten-seed confirmation versus saved baseline

80 runs per implementation. Overall success: **16/80 (20%) → 41/80 (51.25%)**. Median warm API preparation: **9.586 → 0.249 ms** (38.5× faster). Median uncompressed payload: **124,897 → 83,345.5 bytes** (33.3% smaller).

The confirmation used the benchmark-only 2,000 override; production now uses that same cap. The old baseline and confirmation use identical seeds, dictionary and solver sources, with independent API/client RNG streams. API samples are local, without network.

| Size | Answers | Success before → after | Preparation median ms before → after | Payload median bytes before → after |
|---|---|---:|---:|---:|
| 7 | rtl | 70% → 100% | 9.420 → 0.246 | 117,872.0 → 76,089.0 |
| 7 | ltr | 50% → 90% | 9.722 → 0.233 | 120,113.0 → 78,248.5 |
| 9 | rtl | 40% → 100% | 9.233 → 0.249 | 123,052.0 → 80,631.0 |
| 9 | ltr | 0% → 40% | 9.849 → 0.232 | 124,485.5 → 81,728.5 |
| 11 | rtl | 0% → 50% | 9.240 → 0.255 | 125,735.5 → 85,232.0 |
| 11 | ltr | 0% → 0% | 9.726 → 0.250 | 126,729.0 → 84,963.0 |
| 13 | rtl | 0% → 30% | 9.240 → 0.250 | 126,907.0 → 89,102.5 |
| 13 | ltr | 0% → 0% | 9.660 → 0.254 | 127,543.0 → 87,872.0 |

## Candidate counts by answer length

Paired three-seed medians from the screen, comparing legacy against balanced 2,000. The full JSON files also contain exact per-seed counts. Length refers to the answer language (RTL Arabic; LTR English).

| Size | Answers | Length | Before | After |
|---|---|---:|---:|---:|
| 7 | rtl | 2 | 43 | 225 |
| 7 | rtl | 3 | 355 | 355 |
| 7 | rtl | 4 | 771 | 355 |
| 7 | rtl | 5 | 821 | 355 |
| 7 | rtl | 6 | 587 | 355 |
| 7 | rtl | 7 | 420 | 355 |
| 7 | ltr | 2 | 13 | 57 |
| 7 | ltr | 3 | 205 | 389 |
| 7 | ltr | 4 | 517 | 389 |
| 7 | ltr | 5 | 722 | 389 |
| 7 | ltr | 6 | 799 | 388 |
| 7 | ltr | 7 | 739 | 388 |
| 9 | rtl | 2 | 30 | 238 |
| 9 | rtl | 3 | 283 | 252 |
| 9 | rtl | 4 | 635 | 252 |
| 9 | rtl | 5 | 742 | 252 |
| 9 | rtl | 6 | 543 | 252 |
| 9 | rtl | 7 | 462 | 252 |
| 9 | rtl | 8 | 212 | 251 |
| 9 | rtl | 9 | 100 | 251 |
| 9 | ltr | 2 | 9 | 57 |
| 9 | ltr | 3 | 147 | 278 |
| 9 | ltr | 4 | 378 | 278 |
| 9 | ltr | 5 | 527 | 278 |
| 9 | ltr | 6 | 580 | 278 |
| 9 | ltr | 7 | 535 | 277 |
| 9 | ltr | 8 | 448 | 277 |
| 9 | ltr | 9 | 361 | 277 |
| 11 | rtl | 2 | 27 | 200 |
| 11 | rtl | 3 | 264 | 200 |
| 11 | rtl | 4 | 583 | 200 |
| 11 | rtl | 5 | 729 | 200 |
| 11 | rtl | 6 | 515 | 200 |
| 11 | rtl | 7 | 471 | 200 |
| 11 | rtl | 8 | 221 | 200 |
| 11 | rtl | 9 | 110 | 200 |
| 11 | rtl | 10 | 50 | 200 |
| 11 | rtl | 11 | 24 | 200 |
| 11 | ltr | 2 | 9 | 57 |
| 11 | ltr | 3 | 131 | 215 |
| 11 | ltr | 4 | 333 | 216 |
| 11 | ltr | 5 | 477 | 216 |
| 11 | ltr | 6 | 513 | 216 |
| 11 | ltr | 7 | 468 | 216 |
| 11 | ltr | 8 | 397 | 216 |
| 11 | ltr | 9 | 315 | 216 |
| 11 | ltr | 10 | 199 | 216 |
| 11 | ltr | 11 | 137 | 216 |
| 13 | rtl | 2 | 26 | 172 |
| 13 | rtl | 3 | 252 | 172 |
| 13 | rtl | 4 | 559 | 173 |
| 13 | rtl | 5 | 719 | 172 |
| 13 | rtl | 6 | 502 | 172 |
| 13 | rtl | 7 | 490 | 172 |
| 13 | rtl | 8 | 234 | 172 |
| 13 | rtl | 9 | 114 | 172 |
| 13 | rtl | 10 | 50 | 172 |
| 13 | rtl | 11 | 26 | 172 |
| 13 | rtl | 12 | 19 | 172 |
| 13 | rtl | 13 | 7 | 107 |
| 13 | ltr | 2 | 9 | 57 |
| 13 | ltr | 3 | 123 | 176 |
| 13 | ltr | 4 | 323 | 177 |
| 13 | ltr | 5 | 463 | 177 |
| 13 | ltr | 6 | 499 | 177 |
| 13 | ltr | 7 | 457 | 177 |
| 13 | ltr | 8 | 388 | 177 |
| 13 | ltr | 9 | 305 | 177 |
| 13 | ltr | 10 | 195 | 177 |
| 13 | ltr | 11 | 132 | 176 |
| 13 | ltr | 12 | 57 | 176 |
| 13 | ltr | 13 | 46 | 176 |

## Reproduce and inspect

```sh
CROSSWORD_BENCH_SEEDS=3 CROSSWORD_BENCH_POOLS=legacy,3000,2000,1000,500 CROSSWORD_BENCH_OUTPUT=benchmarks/results/api-pool-screen.json npm run bench:crossword
CROSSWORD_BENCH_POOLS=2000 CROSSWORD_BENCH_OUTPUT=benchmarks/results/api-pool-confirmation.json npm run bench:crossword
npm run bench:crossword:stress
npm test
npm run lint
npm run build
```

- [Original ten-seed baseline](baseline-2026-09-08.json)
- [Three-seed pool screen](api-pool-screen.json)
- [Ten-seed confirmation, all phase distributions and raw samples](api-pool-confirmation.json)
- [Confirmation timing and count tables](api-pool-confirmation.md)
- [Benchmark methodology and band/seed options](../README.md)

Benchmarks are outside the production bundle. There are 19 added API/selection tests, plus the existing traversal, structural validation, navigation, constructor and benchmark-statistics tests.

Final checks: `npm test` passed 174 tests; `npm run lint` passed; `npm run build` passed. Both benchmark runs completed (120 screen runs and 80 confirmation runs), with zero invalid returned puzzles. The frontend JavaScript bundle hash remains `index-CqqV9vzr.js`.
