# Indexed crossword generation results

## Result

Fresh before/after runs use the same 2,000-candidate API, beginner band, seeds 1–10, grid sizes 7/9/11/13, and both answer directions. All 80 API payload hashes match across implementations. Measurements are local, without network, on Apple M4 Pro / Node v24.10.0. Both implementations retain real wall-clock deadlines. Source hashes, raw seeded samples, and per-phase distributions are saved in the adjacent JSON files.

**Generation success: 41/80 (51.25%) → 54/80 (67.5%). Returned-puzzle validator success: 41/41 → 54/54 (100%).** Every configuration maintains or improves observed generation success and improves both median and p95 time. Successful word-count medians remain equal or increase.

**Remaining limitation:** 11×11 and 13×13 English-answer grids still produced zero successes. This optimization improves the measured baseline, not overall reliability to 100%. Empty results are counted as failures. Ten seeds provide a practical comparison, not a statistical guarantee across every possible pool. Other CEFR bands are supported and covered by API tests, but were not timed in this comparison.

## Actual comparison

Times are total `generateCrossword` milliseconds, including failed calls. With ten samples per configuration, nearest-rank p95 equals the slowest sample. RTL = EN→AR; LTR = AR→EN.

| Grid | Answers | Success before → after | Median ms before → after | p95 ms before → after |
|---|---|---:|---:|---:|
| 7×7 | rtl | 100% → 100% | 351.6 → 3.7 | 480.2 → 6.8 |
| 7×7 | ltr | 90% → 100% | 4963.6 → 5.1 | 6014.6 → 19.4 |
| 9×9 | rtl | 100% → 100% | 1321.6 → 7.3 | 3408.7 → 9.7 |
| 9×9 | ltr | 40% → 90% | 8026.3 → 616.5 | 8047.7 → 3991.1 |
| 11×11 | rtl | 50% → 90% | 3614.8 → 13.0 | 3617.3 → 1803.7 |
| 11×11 | ltr | 0% → 0% | 9024.1 → 4502.4 | 9026.3 → 4503.4 |
| 13×13 | rtl | 30% → 60% | 3617.6 → 208.4 | 3623.6 → 1808.1 |
| 13×13 | ltr | 0% → 0% | 9031.9 → 4513.3 | 9036.6 → 4514.6 |

## Puzzle quality

Medians below count successful returned puzzles only; failures do not contribute zero-word puzzles to these statistics. Entry and crossing counts measure word/crossing density. Across the 39 seed/configuration pairs where both implementations returned puzzles, only one returned fewer words (22 → 21); the others were equal or larger. The code still fills every real slot and applies the identical structural validator.

| Grid | Answers | Successful entry median before → after | Intersection median before → after |
|---|---|---:|---:|
| 7×7 | rtl | 24 → 26 | 35 → 35.5 |
| 7×7 | ltr | 22 → 22 | 41 → 41 |
| 9×9 | rtl | 38.5 → 42 | 57 → 59 |
| 9×9 | ltr | 31 → 32 | 62.5 → 64 |
| 11×11 | rtl | 56 → 60 | 85 → 85 |
| 11×11 | ltr | — → — | — → — |
| 13×13 | rtl | 78 → 82.5 | 119 → 119.5 |
| 13×13 | ltr | — → — | — → — |

## Changes

- `preparedCandidates.ts` normalizes once per generation call, shuffles length buckets once, and builds canonical position/character postings. Constructor attempts reuse the same records and indexes with small offset/count views rather than copied word lists.
- Lookup selects the smallest posting list and checks only those IDs against remaining fixed characters and the canonical used-word set. Normal and inverted streams merge in candidate order without sorting. Inversion maps physical positions to canonical indices; no reversed answer strings are created.
- Fill-all-slots MRV and forward checking share indexed lookup. MRV stops collecting when a domain cannot beat the current smallest domain; forward checking stops at the first match. Alternate slot solvers reuse the index too. Word-centric selection finds the minimum directly and uses bounded integer-score buckets rather than sorting large placement arrays.
- Template geometry caches slot lists, ordered cells, lengths and intersection neighbors, keyed by size, direction and actual layout. The cache is bounded to 128 layouts. Random template generation is unchanged.
- Removed three ignored option-set passes and stopped re-solving a completed template: every full-slot solution has the same word-count/length score. Timed retries rotate candidate order using index windows so they can explore different branches. Total search and inner-attempt deadlines are enforced.
- Faster search initially selected sparser 7×7 English templates. That result was rejected. Ranking now favors the existing score (sum of slot lengths + twice the slot count), with availability as the tie-breaker, before returning the first validated solution. Template geometry and validation rules are unchanged.
- App fetches one pool and calls the bounded generator once, with at most one fresh-pool retry. The former nested bands/rounds/generator loops could invoke it up to 18/36/60 times for beginner 7/9/11–13 grids. The selected band is retained because the API already supplies soft CEFR fallback. API errors still propagate; UI design and input behavior are unchanged.

## Budget selection evidence

Budgets were reduced only after indexing, then screened at 75% and 50%. The final defaults were verified without a benchmark override. Intermediate runs are retained, including the quality regression that was rejected.

| Stage | Runs | Successes | Notes |
|---|---:|---:|---|
| [Original solver](solver-before.json) | 80 | 41 | Fresh baseline, original budgets |
| [Indexing only](solver-indexed-screen.json) | 24 | 14 | Original budgets and retry structure |
| [75% budget screen](solver-budget-75.json) | 24 | 15 | Single attempt loop; first valid solution |
| [50% budget screen](solver-budget-50.json) | 24 | 15 | Same search strategy as 75% screen |
| [Initial ten-seed 50% run](solver-after-initial.json) | 80 | 51 | Rejected: 7×7 LTR median fell from 22 to 16 words |
| [Quality-ranked 50% confirmation](solver-quality-confirmation.json) | 80 | 54 | Restored/improved successful word counts |
| [Final production defaults](solver-after.json) | 80 | 54 | No benchmark budget override |

392 measured runs total, plus excluded warmups; zero invalid returned puzzles across all stages. The screening source hashes record the original absolute budgets; a `0.5` override at that stage is equivalent to today’s default values.

| Answer direction | Grid | Total search ms before → after | Inner attempt ms before → after |
|---|---|---:|---:|
| LTR | 7 | 6000 → 3000 | 250 → 125 |
| LTR | 9 | 8000 → 4000 | 400 → 200 |
| LTR | 11/13 | 9000 → 4500 | 700 → 350 |
| RTL | 7 | 2200 → 1100 | 900 → 450 |
| RTL | 9 | 3400 → 1700 | 1700 → 850 |
| RTL | 11/13 | 3600 → 1800 | 2000 → 1000 |

## Verification and reproduction

- `npm test`: **192 passed**, including 18 new indexing/cache/reuse/retry tests and all existing inversion, navigation, API and structural validation tests.
- `npm run lint`: passed.
- `npm run build`: passed.
- Puzzle validator and block-run validator bodies are byte-for-byte unchanged.
- Exhaustive small-corpus tests compare indexed results/order against full scans across patterns, used-word identities and rotated windows. Eight language/direction/inversion combinations are covered explicitly.

```sh
CROSSWORD_BENCH_OUTPUT=benchmarks/results/solver-after.json npm run bench:crossword
npm run bench:crossword:stress
npm test
npm run lint
npm run build
```

- [Before: full distributions and raw samples](solver-before.json)
- [After: full distributions and raw samples](solver-after.json)
- [Benchmark methodology and options](../README.md)
