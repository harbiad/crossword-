# Measured results

Measured 2026-09-09T21:17:44.360Z through 2026-09-09T21:25:29.968Z; baseline commit `1ba9f2992139b6aa1ea63c1b1e89f6eeb972fdf9`.

Runtime v24.10.0; Apple M4 Pro; darwin 25.3.0.

Generation time includes failed calls. Word and crossing statistics include successful puzzles only. Each row has 30 calls.

| Grid | Mode | Policy | Success | Median ms | P95 ms | Max ms | Median words | Min words | Median crossings | Pool size |
|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 7×7 | EN→AR | approved-only | 30/30 (100.0%) | 5.1 | 209.8 | 258.1 | 26.0 | 24 | 36.0 | 2000.0 |
| 7×7 | AR→EN | approved-only | 28/30 (93.3%) | 28.0 | 3002.3 | 3002.4 | 22.0 | 22 | 41.0 | 1429.0 |
| 9×9 | EN→AR | approved-only | 13/30 (43.3%) | 1702.1 | 1702.8 | 1702.9 | 42.0 | 40 | 57.0 | 2000.0 |
| 9×9 | AR→EN | approved-only | 25/30 (83.3%) | 820.9 | 3991.6 | 3991.6 | 32.0 | 32 | 64.0 | 1801.0 |
| 11×11 | EN→AR | approved-only | 9/30 (30.0%) | 1803.6 | 1804.5 | 1804.7 | 60.0 | 58 | 85.0 | 2000.0 |
| 11×11 | AR→EN | approved-only | 0/30 (0.0%) | 4501.7 | 4503.2 | 4503.6 | — | — | — | 1917.0 |
| 13×13 | EN→AR | approved-only | 2/30 (6.7%) | 1806.1 | 1807.3 | 1807.3 | 78.0 | 76 | 119.5 | 2000.0 |
| 13×13 | AR→EN | approved-only | 0/30 (0.0%) | 4512.2 | 4515.3 | 4517.3 | — | — | — | 1958.0 |

## Approved-only readiness

Thresholds: READY ≥95%, NEARLY READY ≥80% and <95%, NOT READY <80%. Confidence intervals are 95% Wilson intervals; seed trials are a practical empirical sample, not a guarantee about real user traffic.

| Grid | Mode | Assessment | Success % | 95% interval |
|---|---|---|---:|---|
| 7×7 | EN→AR | READY | 100.0 | 88.6–100.0% |
| 9×9 | EN→AR | NOT READY | 43.3 | 27.4–60.8% |
| 11×11 | EN→AR | NOT READY | 30.0 | 16.7–47.9% |
| 13×13 | EN→AR | NOT READY | 6.7 | 1.8–21.3% |
| 7×7 | AR→EN | NEARLY READY | 93.3 | 78.7–98.2% |
| 9×9 | AR→EN | NEARLY READY | 83.3 | 66.4–92.7% |
| 11×11 | AR→EN | NOT READY | 0.0 | 0.0–11.4% |
| 13×13 | AR→EN | NOT READY | 0.0 | 0.0–11.4% |

## Observed failure evidence

| Policy | Mode | Reason | Failed calls |
|---|---|---|---:|
| approved-only | EN→AR | solver_deadline_observed_root_cause_unestablished | 66 |
| approved-only | AR→EN | solver_deadline_observed_root_cause_unestablished | 67 |

Returned puzzles: 107. Returned-puzzle quality failures: 0. Internal validation error messages: 0.

A deadline observation is not proof that candidate scarcity caused the failure. No vocabulary-size target can be inferred reliably from a comparison of just two differently composed pools. See README for scope and coverage limitations.
