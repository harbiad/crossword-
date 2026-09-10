# Measured results

Measured 2026-09-10T14:38:01.859Z through 2026-09-10T14:43:39.962Z; baseline commit `d9c9f209fe45bcfa2220568a9f80c8a401f9690e`.

Runtime v24.10.0; Apple M4 Pro; darwin 25.3.0.

Generation time includes failed calls. Word and crossing statistics include successful puzzles only. Each row has 30 calls.

| Grid | Mode | Policy | Success | Median ms | P95 ms | Max ms | Median words | Min words | Median crossings | Pool size |
|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 7×7 | EN→AR | compatibility | 30/30 (100.0%) | 3.9 | 5.0 | 5.6 | 26.0 | 24 | 36.0 | 2000.0 |
| 7×7 | EN→AR | approved-only | 30/30 (100.0%) | 3.5 | 902.7 | 1063.0 | 26.0 | 24 | 36.0 | 2000.0 |
| 7×7 | AR→EN | compatibility | 30/30 (100.0%) | 5.3 | 130.5 | 131.5 | 22.0 | 21 | 41.0 | 2000.0 |
| 7×7 | AR→EN | approved-only | 29/30 (96.7%) | 14.5 | 165.5 | 3002.4 | 22.0 | 22 | 41.0 | 1851.0 |
| 9×9 | EN→AR | compatibility | 30/30 (100.0%) | 7.4 | 14.8 | 34.5 | 42.0 | 40 | 57.0 | 2000.0 |
| 9×9 | EN→AR | approved-only | 27/30 (90.0%) | 14.4 | 1702.5 | 1702.6 | 42.0 | 40 | 57.0 | 2000.0 |
| 9×9 | AR→EN | compatibility | 30/30 (100.0%) | 367.5 | 1030.7 | 1036.4 | 31.0 | 30 | 65.5 | 4000.0 |
| 9×9 | AR→EN | approved-only | 30/30 (100.0%) | 748.5 | 1268.1 | 1435.9 | 32.0 | 32 | 64.0 | 2272.0 |
| 11×11 | EN→AR | compatibility | 28/30 (93.3%) | 14.5 | 1803.8 | 1804.1 | 59.5 | 56 | 85.0 | 2000.0 |
| 11×11 | EN→AR | approved-only | 19/30 (63.3%) | 1022.1 | 1804.2 | 1804.4 | 60.0 | 58 | 85.0 | 2000.0 |
| 11×11 | AR→EN | compatibility | 30/30 (100.0%) | 857.5 | 1201.9 | 1300.7 | 42.0 | 40 | 89.5 | 6000.0 |
| 11×11 | AR→EN | approved-only | 12/30 (40.0%) | 4512.1 | 4513.7 | 4514.3 | 44.0 | 44 | 88.0 | 2426.0 |
| 13×13 | EN→AR | compatibility | 28/30 (93.3%) | 60.4 | 1806.1 | 1806.3 | 82.0 | 78 | 119.0 | 2000.0 |
| 13×13 | EN→AR | approved-only | 17/30 (56.7%) | 1074.7 | 1807.1 | 1807.2 | 80.0 | 76 | 119.0 | 2000.0 |
| 13×13 | AR→EN | compatibility | 29/30 (96.7%) | 881.5 | 4359.2 | 4514.2 | 62.0 | 57 | 131.0 | 6000.0 |
| 13×13 | AR→EN | approved-only | 0/30 (0.0%) | 1032.2 | 1262.9 | 1274.5 | — | — | — | 2477.0 |

## Approved-only readiness

Thresholds: READY ≥95%, NEARLY READY ≥80% and <95%, NOT READY <80%. Confidence intervals are 95% Wilson intervals; seed trials are a practical empirical sample, not a guarantee about real user traffic.

| Grid | Mode | Assessment | Success % | 95% interval |
|---|---|---|---:|---|
| 7×7 | EN→AR | READY | 100.0 | 88.6–100.0% |
| 9×9 | EN→AR | NEARLY READY | 90.0 | 74.4–96.5% |
| 11×11 | EN→AR | NOT READY | 63.3 | 45.5–78.1% |
| 13×13 | EN→AR | NOT READY | 56.7 | 39.2–72.6% |
| 7×7 | AR→EN | READY | 96.7 | 83.3–99.4% |
| 9×9 | AR→EN | READY | 100.0 | 88.6–100.0% |
| 11×11 | AR→EN | NOT READY | 40.0 | 24.6–57.7% |
| 13×13 | AR→EN | NOT READY | 0.0 | 0.0–11.4% |

## Observed failure evidence

| Policy | Mode | Reason | Failed calls |
|---|---|---|---:|
| approved-only | AR→EN | bounded_search_no_solution_reason_unestablished | 29 |
| approved-only | EN→AR | solver_deadline_observed_root_cause_unestablished | 27 |
| approved-only | AR→EN | solver_deadline_observed_root_cause_unestablished | 20 |
| compatibility | EN→AR | solver_deadline_observed_root_cause_unestablished | 4 |
| compatibility | AR→EN | solver_deadline_observed_root_cause_unestablished | 1 |

Returned puzzles: 399. Returned-puzzle quality failures: 0. Internal validation error messages: 0.

A deadline observation is not proof that candidate scarcity caused the failure. No vocabulary-size target can be inferred reliably from a comparison of just two differently composed pools. See README for scope and coverage limitations.
