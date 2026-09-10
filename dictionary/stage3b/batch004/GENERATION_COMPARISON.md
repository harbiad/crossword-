# Approved-only generation: before versus Batch 004 + QA

30 identical measured seeds (1–30), seed-0 warmup per configuration, advanced band, unchanged current production solver and candidate limits. Baseline is the post-solver checkpoint, not the older pre-fix benchmark. Timing includes failed calls; words/crossings describe successful puzzles only. Candidate counts are actual API pools, not all indexed relationships.

| Grid | Mode | Success before → after | Median ms before → after | P95 ms before → after | Pool before → after | Words before → after | Readiness |
|---|---|---:|---:|---:|---:|---:|---|
| 7 | EN→AR | 96.7% → 100.0% | 5.3 → 5.1 | 781.7 → 209.8 | 2000 → 2000 | 26.0 → 26.0 | READY |
| 9 | EN→AR | 46.7% → 43.3% | 1701.9 → 1702.1 | 1702.8 → 1702.8 | 2000 → 2000 | 42.0 → 42.0 | NOT READY |
| 11 | EN→AR | 13.3% → 30.0% | 1803.7 → 1803.6 | 1804.6 → 1804.5 | 2000 → 2000 | 59.0 → 60.0 | NOT READY |
| 13 | EN→AR | 10.0% → 6.7% | 1806.2 → 1806.1 | 1807.1 → 1807.3 | 2000 → 2000 | 80.0 → 78.0 | NOT READY |
| 7 | AR→EN | 0.0% → 93.3% | 3002.3 → 28.0 | 3002.7 → 3002.3 | 1128 → 1429 | — → 22.0 | NEARLY READY |
| 9 | AR→EN | 0.0% → 83.3% | 3990.8 → 820.9 | 3991.6 → 3991.6 | 1373 → 1801 | — → 32.0 | NEARLY READY |
| 11 | AR→EN | 0.0% → 0.0% | 4420.7 → 4501.7 | 4485.9 → 4503.2 | 1455 → 1917 | — → — | NOT READY |
| 13 | AR→EN | 0.0% → 0.0% | 2369.7 → 4512.2 | 2521.9 → 4515.3 | 1477 → 1958 | — → — | NOT READY |

Readiness uses the requested thresholds: READY ≥95%, NEARLY READY ≥80% and <95%, NOT READY <80%. See generation/RESULTS.md for 95% Wilson intervals, maximum time, minimum words, crossings and failure observations.

## Approved indexed coverage at the 13-cell maximum

Indexed pairs may share a canonical answer. Counts below are not the sampled 2,000-candidate Arabic pool. English length 2 remains unused by production templates.

| Length | Arabic pairs before → after | English answers before → after |
|---|---:|---:|
| 2 | 50 → 54 | 15 → 15 |
| 3 | 367 → 473 | 120 → 172 |
| 4 | 731 → 1044 | 269 → 292 |
| 5 | 870 → 1091 | 266 → 282 |
| 6 | 631 → 830 | 239 → 258 |
| 7 | 502 → 623 | 219 → 410 |
| 8 | 180 → 228 | 167 → 178 |
| 9 | 94 → 115 | 78 → 194 |
| 10 | 24 → 33 | 54 → 59 |
| 11 | 16 → 24 | 28 → 57 |
| 12 | 13 → 16 | 14 → 15 |
| 13 | 2 → 5 | 8 → 26 |

Returned-puzzle structural/provenance/traversal failures: **0**. Rejected or directionally disallowed relationships are never permitted by the benchmark's source checks.

Recommendation: **D with A: another common-vocabulary coverage batch focused on remaining English crossing domains, with secondary Arabic gaps; do not use raw length quotas or approve poor translations. This benchmark alone does not identify the exact vocabulary quantity needed.**

The exact additional vocabulary quantity is not inferable from a single batch. Reinspect remaining failed patterns before selecting Batch005; do not conclude that every rare length caused failure. The current evidence does not support blanket long-word quotas or a switch to strict production.

30 paired deterministic seeds; advanced band only; wall-clock budgets and machine load can affect results. Additional approvals and preference changes alter the sampled candidate composition; cannot attribute gains to a single selected length or individual relationship. Pattern coverage measures possible support before used-word and simultaneous crossing constraints, not guaranteed solutions. No same-size pure-frequency control batch was reviewed; gains do not establish that this scoring formula is optimal.

Compatibility remains enabled. Batch005 has not begun.
