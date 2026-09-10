# Approved-only generation: before versus Batch 005 + QA

30 identical measured seeds (1–30), seed-0 warmup per configuration, advanced band, unchanged current production solver and candidate limits. Baseline is the Batch004 checkpoint with the same current solver. Timing includes failed calls; words/crossings describe successful puzzles only. Candidate counts are actual API pools, not all indexed relationships.

| Grid | Mode | Success before → after | Median ms before → after | P95 ms before → after | Pool before → after | Words before → after | Readiness |
|---|---|---:|---:|---:|---:|---:|---|
| 7 | EN→AR | 100.0% → 96.7% | 5.1 → 3.7 | 209.8 → 21.8 | 2000 → 2000 | 26.0 → 26.0 | READY |
| 9 | EN→AR | 43.3% → 90.0% | 1702.1 → 36.2 | 1702.8 → 1702.8 | 2000 → 2000 | 42.0 → 42.0 | NEARLY READY |
| 11 | EN→AR | 30.0% → 63.3% | 1803.6 → 623.2 | 1804.5 → 1805.1 | 2000 → 2000 | 60.0 → 60.0 | NOT READY |
| 13 | EN→AR | 6.7% → 50.0% | 1806.1 → 1643.3 | 1807.3 → 1807.9 | 2000 → 2000 | 78.0 → 80.0 | NOT READY |
| 7 | AR→EN | 93.3% → 96.7% | 28.0 → 25.1 | 3002.3 → 159.6 | 1429 → 1807 | 22.0 → 22.0 | READY |
| 9 | AR→EN | 83.3% → 96.7% | 820.9 → 709.5 | 3991.6 → 1521.5 | 1801 → 2223 | 32.0 → 32.0 | READY |
| 11 | AR→EN | 0.0% → 26.7% | 4501.7 → 4503.0 | 4503.2 → 4504.6 | 1917 → 2373 | — → 44.0 | NOT READY |
| 13 | AR→EN | 0.0% → 0.0% | 4512.2 → 4515.9 | 4515.3 → 4519.1 | 1958 → 2417 | — → — | NOT READY |

Readiness uses the requested thresholds: READY ≥95%, NEARLY READY ≥80% and <95%, NOT READY <80%. See generation/RESULTS.md for 95% Wilson intervals, maximum time, minimum words, crossings and failure observations.

## Approved indexed coverage at the 13-cell maximum

Indexed pairs may share a canonical answer. Counts below are not the sampled 2,000-candidate Arabic pool. English length 2 remains unused by production templates.

| Length | Arabic pairs before → after | English answers before → after |
|---|---:|---:|
| 2 | 54 → 79 | 15 → 15 |
| 3 | 473 → 593 | 172 → 180 |
| 4 | 1044 → 1244 | 292 → 381 |
| 5 | 1091 → 1318 | 282 → 386 |
| 6 | 830 → 989 | 258 → 395 |
| 7 | 623 → 770 | 410 → 450 |
| 8 | 228 → 294 | 178 → 220 |
| 9 | 115 → 160 | 194 → 196 |
| 10 | 33 → 48 | 59 → 75 |
| 11 | 24 → 34 | 57 → 75 |
| 12 | 16 → 24 | 15 → 18 |
| 13 | 5 → 6 | 26 → 26 |

Returned-puzzle structural/provenance/traversal failures: **0**. Rejected or directionally disallowed relationships are never permitted by the benchmark's source checks.

Recommendation: **Do not begin an automatic next 500-word batch. Refresh and check the recurring residual full-pool gaps first; a narrower learner-quality review targeting English large-grid domains and Arabic short crossing domains is justified where suitable unresolved vocabulary actually matches. Missing approved support remains measured, alongside used-word and Arabic sampling losses. These bounded traces do not prove that solver search is now the primary limit, especially for 13×13 English.**

The exact additional vocabulary quantity is not inferable from a single batch. The current evidence does not support blanket long-word quotas or a switch to strict production.

30 paired deterministic seeds; advanced band only; wall-clock budgets and machine load can affect results. Additional approvals and preference changes alter the sampled candidate composition; cannot attribute gains to a single selected length or individual relationship. Pattern coverage measures possible support before used-word and simultaneous crossing constraints, not guaranteed solutions. No same-size pure-frequency control batch was reviewed; gains do not establish that this scoring formula is optimal.

Compatibility remains enabled. Batch006 has not begun.

## Frozen crossing-domain coverage

| Scope | Domains | Improved | Zero → supported | Still zero | Small (1–3) → ≥5 |
|---|---:|---:|---:|---:|---:|
| All sampled needs | 53456 | 9545 | 1372 | 14321 | 1283 |
| Recurring in ≥2 failed seeds | 6891 | 1227 | 249 | 1557 | 208 |
| Matched by selected headwords | 1239 | 1099 | 249 | 44 | 208 |

No frozen domain lost approved support. These are distinct support-set constraints, not independent puzzles. Five matches is a descriptive headroom heuristic, not proven sufficiency.

## Remaining failure evidence

The first five failing seeds per configuration (or all when fewer) yielded 26 diagnostic runs; all still failed under observation. Capture is bounded to 600 distinct observations per run. Of 3,681 captured zero-domain observations, 2,857 had no match in the full approved index, 541 exhausted matching words already used, and 283 had unused full-index matches absent from the sampled pool. Sampling-loss cases here occur in Arabic-answer grids. These counts are branch observations, not independent causes or unbiased failure rates.

For 13×13 AR→EN, only 67 of 1,375 recurring frozen domains improved and 155 remain zero. Five new failed-run traces contain 169 full-pool-zero observations and 94 used-word exhaustions; no sampled-pool loss was observed. Missing-support observations span lengths 3–9 and 13. English length-13 indexed answers remain 26. This is limited coverage gain for that configuration, not evidence that substantial relevant coverage improvement was ignored by the solver.

For 11×11 AR→EN, 621 recurring domains improved; success rose to 8/30. Remaining observed missing-support lengths include 3, 4, 5, 6, 7 and 11. Arabic missing-support observations are frequently short (especially length 2), with some full-grid and intermediate-length constraints. See diagnostics/residual_domains.csv for exact coordinates and crossing support sets. These findings support specific pattern targets, not blanket length quotas.

Search choices can still create avoidable dead ends: no trace proves that all other branches fail. No time-budget or algorithm control experiment was run in this dictionary task, so the primary solver-versus-vocabulary attribution remains unresolved. Do not promise that another fixed number of approvals will make large grids reliable.
