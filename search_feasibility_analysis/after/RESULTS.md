# Measured results

Measured 2026-09-10T12:21:46.204Z through 2026-09-10T12:27:47.756Z; baseline commit `5c391ec57d6988b0e0d9d07c2e0eafacc8536eac`.

Runtime v24.10.0; Apple M4 Pro; darwin 25.3.0.

Generation time includes failed calls. Word and crossing statistics include successful puzzles only. Each row has 30 calls.

| Grid | Mode | Policy | Success | Median ms | P95 ms | Max ms | Median words | Min words | Median crossings | Pool size |
|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 7×7 | EN→AR | compatibility | 30/30 (100.0%) | 4.1 | 5.7 | 6.4 | 26.0 | 24 | 36.0 | 2000.0 |
| 7×7 | EN→AR | approved-only | 30/30 (100.0%) | 3.8 | 903.0 | 1082.5 | 26.0 | 24 | 36.0 | 2000.0 |
| 7×7 | AR→EN | compatibility | 30/30 (100.0%) | 6.1 | 133.0 | 1536.3 | 22.0 | 16 | 41.0 | 2000.0 |
| 7×7 | AR→EN | approved-only | 29/30 (96.7%) | 16.7 | 171.5 | 3002.7 | 22.0 | 22 | 41.0 | 1851.0 |
| 9×9 | EN→AR | compatibility | 30/30 (100.0%) | 8.0 | 15.6 | 36.7 | 42.0 | 40 | 57.0 | 2000.0 |
| 9×9 | EN→AR | approved-only | 27/30 (90.0%) | 14.8 | 1702.6 | 1703.3 | 42.0 | 40 | 57.0 | 2000.0 |
| 9×9 | AR→EN | compatibility | 30/30 (100.0%) | 378.9 | 1045.3 | 1050.9 | 31.0 | 30 | 65.5 | 4000.0 |
| 9×9 | AR→EN | approved-only | 30/30 (100.0%) | 774.4 | 1300.4 | 1469.5 | 32.0 | 32 | 64.0 | 2272.0 |
| 11×11 | EN→AR | compatibility | 28/30 (93.3%) | 16.8 | 1804.2 | 1805.3 | 59.5 | 56 | 85.0 | 2000.0 |
| 11×11 | EN→AR | approved-only | 19/30 (63.3%) | 1023.4 | 1805.1 | 1805.3 | 60.0 | 58 | 85.0 | 2000.0 |
| 11×11 | AR→EN | compatibility | 30/30 (100.0%) | 1205.6 | 2343.7 | 2414.0 | 42.0 | 40 | 88.0 | 6000.0 |
| 11×11 | AR→EN | approved-only | 11/30 (36.7%) | 4512.9 | 4514.8 | 4515.7 | 44.0 | 44 | 88.0 | 2426.0 |
| 13×13 | EN→AR | compatibility | 28/30 (93.3%) | 60.3 | 1807.0 | 1807.3 | 82.0 | 78 | 119.0 | 2000.0 |
| 13×13 | EN→AR | approved-only | 17/30 (56.7%) | 1074.3 | 1807.9 | 1807.9 | 80.0 | 76 | 119.0 | 2000.0 |
| 13×13 | AR→EN | compatibility | 29/30 (96.7%) | 483.5 | 4018.1 | 4521.7 | 64.0 | 56 | 131.0 | 6000.0 |
| 13×13 | AR→EN | approved-only | 0/30 (0.0%) | 1361.7 | 1677.6 | 1811.5 | — | — | — | 2477.0 |

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
| 11×11 | AR→EN | NOT READY | 36.7 | 21.9–54.5% |
| 13×13 | AR→EN | NOT READY | 0.0 | 0.0–11.4% |

## Observed failure evidence

| Policy | Mode | Reason | Failed calls |
|---|---|---|---:|
| approved-only | AR→EN | bounded_search_no_solution_reason_unestablished | 28 |
| approved-only | EN→AR | solver_deadline_observed_root_cause_unestablished | 27 |
| approved-only | AR→EN | solver_deadline_observed_root_cause_unestablished | 22 |
| compatibility | AR→EN | solver_deadline_observed_root_cause_unestablished | 1 |
| compatibility | EN→AR | solver_deadline_observed_root_cause_unestablished | 4 |

Returned puzzles: 398. Returned-puzzle quality failures: 0. Internal validation error messages: 0.

A deadline observation is not proof that candidate scarcity caused the failure. No vocabulary-size target can be inferred reliably from a comparison of just two differently composed pools. See README for scope and coverage limitations.
