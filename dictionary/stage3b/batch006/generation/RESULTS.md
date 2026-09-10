# Measured results

Measured 2026-09-10T00:15:07.939Z through 2026-09-10T00:21:37.358Z; baseline commit `1ba9f2992139b6aa1ea63c1b1e89f6eeb972fdf9`.

Runtime v24.10.0; Apple M4 Pro; darwin 25.3.0.

Generation time includes failed calls. Word and crossing statistics include successful puzzles only. Each row has 30 calls.

| Grid | Mode | Policy | Success | Median ms | P95 ms | Max ms | Median words | Min words | Median crossings | Pool size |
|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 7×7 | EN→AR | approved-only | 30/30 (100.0%) | 3.9 | 902.9 | 1061.1 | 26.0 | 24 | 36.0 | 2000.0 |
| 7×7 | AR→EN | approved-only | 29/30 (96.7%) | 13.2 | 163.3 | 3002.3 | 22.0 | 22 | 41.0 | 1851.0 |
| 9×9 | EN→AR | approved-only | 27/30 (90.0%) | 14.6 | 1702.8 | 1703.4 | 42.0 | 40 | 57.0 | 2000.0 |
| 9×9 | AR→EN | approved-only | 26/30 (86.7%) | 758.2 | 3992.0 | 3992.3 | 32.0 | 32 | 64.0 | 2272.0 |
| 11×11 | EN→AR | approved-only | 19/30 (63.3%) | 1023.6 | 1804.3 | 1804.5 | 60.0 | 58 | 85.0 | 2000.0 |
| 11×11 | AR→EN | approved-only | 7/30 (23.3%) | 4502.8 | 4505.3 | 4505.3 | 44.0 | 44 | 88.0 | 2426.0 |
| 13×13 | EN→AR | approved-only | 17/30 (56.7%) | 1083.7 | 1807.4 | 1807.8 | 80.0 | 76 | 119.0 | 2000.0 |
| 13×13 | AR→EN | approved-only | 0/30 (0.0%) | 4515.3 | 4518.4 | 4518.4 | — | — | — | 2477.0 |

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

Returned puzzles: 155. Returned-puzzle quality failures: 0. Internal validation error messages: 0.

A deadline observation is not proof that candidate scarcity caused the failure. No vocabulary-size target can be inferred reliably from a comparison of just two differently composed pools. See README for scope and coverage limitations.
