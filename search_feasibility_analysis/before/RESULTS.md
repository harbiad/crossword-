# Measured results

Measured 2026-09-10T11:43:55.931Z through 2026-09-10T11:52:06.336Z; baseline commit `5c391ec57d6988b0e0d9d07c2e0eafacc8536eac`.

Runtime v24.10.0; Apple M4 Pro; darwin 25.3.0.

Generation time includes failed calls. Word and crossing statistics include successful puzzles only. Each row has 30 calls.

| Grid | Mode | Policy | Success | Median ms | P95 ms | Max ms | Median words | Min words | Median crossings | Pool size |
|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 7×7 | EN→AR | compatibility | 30/30 (100.0%) | 4.1 | 5.5 | 5.5 | 26.0 | 24 | 36.0 | 2000.0 |
| 7×7 | EN→AR | approved-only | 30/30 (100.0%) | 3.5 | 903.0 | 1058.9 | 26.0 | 24 | 36.0 | 2000.0 |
| 7×7 | AR→EN | compatibility | 30/30 (100.0%) | 5.9 | 130.7 | 131.8 | 22.0 | 21 | 41.0 | 2000.0 |
| 7×7 | AR→EN | approved-only | 29/30 (96.7%) | 13.5 | 165.4 | 3002.4 | 22.0 | 22 | 41.0 | 1851.0 |
| 9×9 | EN→AR | compatibility | 30/30 (100.0%) | 8.1 | 16.2 | 31.5 | 42.0 | 40 | 57.0 | 2000.0 |
| 9×9 | EN→AR | approved-only | 27/30 (90.0%) | 14.8 | 1703.2 | 1703.4 | 42.0 | 40 | 57.0 | 2000.0 |
| 9×9 | AR→EN | compatibility | 30/30 (100.0%) | 374.5 | 1036.5 | 1037.0 | 32.0 | 30 | 64.0 | 4000.0 |
| 9×9 | AR→EN | approved-only | 26/30 (86.7%) | 764.1 | 3992.4 | 3992.7 | 32.0 | 32 | 64.0 | 2272.0 |
| 11×11 | EN→AR | compatibility | 28/30 (93.3%) | 15.2 | 1804.2 | 1804.9 | 59.5 | 56 | 85.0 | 2000.0 |
| 11×11 | EN→AR | approved-only | 19/30 (63.3%) | 1022.7 | 1804.3 | 1804.3 | 60.0 | 58 | 85.0 | 2000.0 |
| 11×11 | AR→EN | compatibility | 30/30 (100.0%) | 790.9 | 2700.1 | 3247.1 | 44.0 | 41 | 95.0 | 6000.0 |
| 11×11 | AR→EN | approved-only | 7/30 (23.3%) | 4502.7 | 4504.5 | 4505.3 | 44.0 | 44 | 88.0 | 2426.0 |
| 13×13 | EN→AR | compatibility | 28/30 (93.3%) | 64.2 | 1806.5 | 1807.3 | 82.0 | 78 | 119.0 | 2000.0 |
| 13×13 | EN→AR | approved-only | 17/30 (56.7%) | 1078.1 | 1808.3 | 1808.4 | 80.0 | 76 | 119.0 | 2000.0 |
| 13×13 | AR→EN | compatibility | 29/30 (96.7%) | 469.9 | 4009.5 | 4515.6 | 64.0 | 56 | 131.0 | 6000.0 |
| 13×13 | AR→EN | approved-only | 0/30 (0.0%) | 4514.4 | 4517.3 | 4517.7 | — | — | — | 2477.0 |

## Approved-only readiness

Thresholds: READY ≥95%, NEARLY READY ≥80% and <95%, NOT READY <80%. Confidence intervals are 95% Wilson intervals; seed trials are a practical empirical sample, not a guarantee about real user traffic.

| Grid | Mode | Assessment | Success % | 95% interval |
|---|---|---|---:|---|
| 7×7 | EN→AR | READY | 100.0 | 88.6–100.0% |
| 9×9 | EN→AR | NEARLY READY | 90.0 | 74.4–96.5% |
| 11×11 | EN→AR | NOT READY | 63.3 | 45.5–78.1% |
| 13×13 | EN→AR | NOT READY | 56.7 | 39.2–72.6% |
| 7×7 | AR→EN | READY | 96.7 | 83.3–99.4% |
| 9×9 | AR→EN | NEARLY READY | 86.7 | 70.3–94.7% |
| 11×11 | AR→EN | NOT READY | 23.3 | 11.8–40.9% |
| 13×13 | AR→EN | NOT READY | 0.0 | 0.0–11.4% |

## Observed failure evidence

| Policy | Mode | Reason | Failed calls |
|---|---|---|---:|
| approved-only | AR→EN | solver_deadline_observed_root_cause_unestablished | 58 |
| approved-only | EN→AR | solver_deadline_observed_root_cause_unestablished | 27 |
| compatibility | AR→EN | solver_deadline_observed_root_cause_unestablished | 1 |
| compatibility | EN→AR | solver_deadline_observed_root_cause_unestablished | 4 |

Returned puzzles: 390. Returned-puzzle quality failures: 0. Internal validation error messages: 0.

A deadline observation is not proof that candidate scarcity caused the failure. No vocabulary-size target can be inferred reliably from a comparison of just two differently composed pools. See README for scope and coverage limitations.
