# Same-pool solver comparison

30 seeds per configuration; both policies; unchanged dictionary, API limits, validation and total search budgets. Times include failures. Word/intersection medians include successful puzzles only.

| Grid | Mode | Policy | Success % before → after | Median ms | P95 ms | Median words | Median crossings |
|---|---|---|---:|---:|---:|---:|---:|
| 7 | en_to_ar | compatibility | 100.0 → 100.0 | 4.1 → 4.1 | 5.5 → 5.7 | 26.0 → 26.0 | 36.0 → 36.0 |
| 9 | en_to_ar | compatibility | 100.0 → 100.0 | 8.1 → 8.0 | 16.2 → 15.6 | 42.0 → 42.0 | 57.0 → 57.0 |
| 11 | en_to_ar | compatibility | 93.3 → 93.3 | 15.2 → 16.8 | 1804.2 → 1804.2 | 59.5 → 59.5 | 85.0 → 85.0 |
| 13 | en_to_ar | compatibility | 93.3 → 93.3 | 64.2 → 60.3 | 1806.5 → 1807.0 | 82.0 → 82.0 | 119.0 → 119.0 |
| 7 | ar_to_en | compatibility | 100.0 → 100.0 | 5.9 → 6.1 | 130.7 → 133.0 | 22.0 → 22.0 | 41.0 → 41.0 |
| 9 | ar_to_en | compatibility | 100.0 → 100.0 | 374.5 → 378.9 | 1036.5 → 1045.3 | 32.0 → 31.0 | 64.0 → 65.5 |
| 11 | ar_to_en | compatibility | 100.0 → 100.0 | 790.9 → 1205.6 | 2700.1 → 2343.7 | 44.0 → 42.0 | 95.0 → 88.0 |
| 13 | ar_to_en | compatibility | 96.7 → 96.7 | 469.9 → 483.5 | 4009.5 → 4018.1 | 64.0 → 64.0 | 131.0 → 131.0 |
| 7 | en_to_ar | approved-only | 100.0 → 100.0 | 3.5 → 3.8 | 903.0 → 903.0 | 26.0 → 26.0 | 36.0 → 36.0 |
| 9 | en_to_ar | approved-only | 90.0 → 90.0 | 14.8 → 14.8 | 1703.2 → 1702.6 | 42.0 → 42.0 | 57.0 → 57.0 |
| 11 | en_to_ar | approved-only | 63.3 → 63.3 | 1022.7 → 1023.4 | 1804.3 → 1805.1 | 60.0 → 60.0 | 85.0 → 85.0 |
| 13 | en_to_ar | approved-only | 56.7 → 56.7 | 1078.1 → 1074.3 | 1808.3 → 1807.9 | 80.0 → 80.0 | 119.0 → 119.0 |
| 7 | ar_to_en | approved-only | 96.7 → 96.7 | 13.5 → 16.7 | 165.4 → 171.5 | 22.0 → 22.0 | 41.0 → 41.0 |
| 9 | ar_to_en | approved-only | 86.7 → 100.0 | 764.1 → 774.4 | 3992.4 → 1300.4 | 32.0 → 32.0 | 64.0 → 64.0 |
| 11 | ar_to_en | approved-only | 23.3 → 36.7 | 4502.7 → 4512.9 | 4504.5 → 4514.8 | 44.0 → 44.0 | 88.0 → 88.0 |
| 13 | ar_to_en | approved-only | 0.0 → 0.0 | 4514.4 → 1361.7 | 4517.3 → 1677.6 | — → — | — → — |

Returned-puzzle quality failures: 0.

Historical Batch005→Batch006 seed transitions and the freshly repeated Batch006 baseline are separate evidence layers. Wall-clock deadlines introduce timing sensitivity; fixed seeds do not imply a deterministic wall-clock cutoff.
