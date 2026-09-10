# Measured outcome

**The 80% success target was not met. Approved-only 13×13 AR→EN remains 0/30.**

No approved/review/rejected relationships, CEFR, solver search strategy, validation, inversion, or canonical uniqueness rules were changed. Compatibility remains production policy.

| Grid | Mode | Policy | Success before → after | Median ms before → after | P95 ms before → after | Median words before → after |
|---|---|---|---:|---:|---:|---:|
| 7 | en_to_ar | compatibility | 100.0% → 100.0% | 4.1 → 3.9 | 5.7 → 5.0 | 26.0 → 26.0 |
| 9 | en_to_ar | compatibility | 100.0% → 100.0% | 8.0 → 7.4 | 15.6 → 14.8 | 42.0 → 42.0 |
| 11 | en_to_ar | compatibility | 93.3% → 93.3% | 16.8 → 14.5 | 1804.2 → 1803.8 | 59.5 → 59.5 |
| 13 | en_to_ar | compatibility | 93.3% → 93.3% | 60.3 → 60.4 | 1807.0 → 1806.1 | 82.0 → 82.0 |
| 7 | ar_to_en | compatibility | 100.0% → 100.0% | 6.1 → 5.3 | 133.0 → 130.5 | 22.0 → 22.0 |
| 9 | ar_to_en | compatibility | 100.0% → 100.0% | 378.9 → 367.5 | 1045.3 → 1030.7 | 31.0 → 31.0 |
| 11 | ar_to_en | compatibility | 100.0% → 100.0% | 1205.6 → 857.5 | 2343.7 → 1201.9 | 42.0 → 42.0 |
| 13 | ar_to_en | compatibility | 96.7% → 96.7% | 483.5 → 881.5 | 4018.1 → 4359.2 | 64.0 → 62.0 |
| 7 | en_to_ar | approved-only | 100.0% → 100.0% | 3.8 → 3.5 | 903.0 → 902.7 | 26.0 → 26.0 |
| 9 | en_to_ar | approved-only | 90.0% → 90.0% | 14.8 → 14.4 | 1702.6 → 1702.5 | 42.0 → 42.0 |
| 11 | en_to_ar | approved-only | 63.3% → 63.3% | 1023.4 → 1022.1 | 1805.1 → 1804.2 | 60.0 → 60.0 |
| 13 | en_to_ar | approved-only | 56.7% → 56.7% | 1074.3 → 1074.7 | 1807.9 → 1807.1 | 80.0 → 80.0 |
| 7 | ar_to_en | approved-only | 96.7% → 96.7% | 16.7 → 14.5 | 171.5 → 165.5 | 22.0 → 22.0 |
| 9 | ar_to_en | approved-only | 100.0% → 100.0% | 774.4 → 748.5 | 1300.4 → 1268.1 | 32.0 → 32.0 |
| 11 | ar_to_en | approved-only | 36.7% → 40.0% | 4512.9 → 4512.1 | 4514.8 → 4513.7 | 44.0 → 44.0 |
| 13 | ar_to_en | approved-only | 0.0% → 0.0% | 1361.7 → 1032.2 | 1677.6 → 1262.9 | — → — |

The before run is the frozen completed solver-checkpoint benchmark; the after run reruns the same 30 seeds, both policies, all sizes/modes, unmodified budgets. Wall-clock deadlines still introduce timing sensitivity. The isolated 13×13 controls provide a fresh same-session baseline.

## Answers to the investigation questions

1. **Unsatisfiable share:** 100% of the 701 unique original census layouts (720 occurrences). The new RNG census also proves all 702 unique layouts impossible (720 occurrences). This is not an enumeration of every mathematically possible layout.
2. **Structure:** every legal line has white cells at indices 2 and 10; this forces four full-length crossing entries. Both rotational and asymmetric families fail. The most frequent crossing-length pair is 3/13. Since all sampled layouts fail, length-pair frequency is not an independent causal correlation. The four-word frame has 608 valid distinct-answer assignments in isolation; surrounding constraints matter.
3. **Filtering:** no reliability improvement. A/B/C/D all return 0/30. Oracle filtering reduces online rejection to about 22ms but requires roughly 35 seconds of offline census work; it produces no puzzle and is not retained as a production selector.
4. **RNG stability:** candidate additions/reordering no longer change layout choice for the same request seed in 13×13 LTR. Unit tests verify this. Historical seed outcomes can change once when adopting the new streams; this is intentional, not a claim of preserving old layouts.
5. **New templates:** necessary for success if the pool stays fixed, but none of the 5,500 completed additional layouts yielded a solution. All 59 distinct unknowns from that exploration were later proved impossible offline. No unverified curated template is deployed.
6. **Final approved-only result:** 0%, not ready; target unmet.
7. **Latency:** approved-only failed-call median 1361.7 → 1032.2ms, p95 1677.6 → 1262.9ms. Compatibility median worsens 483.5 → 881.5ms and p95 4018.1 → 4359.2ms; median words 64 → 62, median intersections unchanged at 131. This is a real trade-off of the RNG change, not an across-the-board speed improvement.
8. **Regressions:** no configuration loses aggregate success rate. Compatibility 13×13 remains 29/30, with seed 8 gained and seed 16 lost. Approved-only 11×11 AR→EN gains seed 22 despite no algorithm change there; treat that one deadline-sensitive gain cautiously.
9. **Remaining bottleneck:** simultaneous compatibility of this fixed approved vocabulary with the permitted layouts. More ordering work cannot solve a proven contradiction. Global impossibility over all layouts is unproved.
10. **Batch007:** remain paused. Do not commission another vocabulary batch based on these measurements. A separate two-letter English template experiment was requested from the user because it changes the generator’s three-letter minimum (even though validatePuzzle supports two). No answer/authorization has been received, so it was not run.

See `seed_changes.csv`, `before_after.csv`, `checks.json`, and `protected_inputs.json` for verification and scope.
