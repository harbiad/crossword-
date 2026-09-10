# Measured results

Measured 2026-09-09T23:16:32.800Z through 2026-09-09T23:22:51.158Z; baseline commit `1ba9f2992139b6aa1ea63c1b1e89f6eeb972fdf9`.

Runtime v24.10.0; Apple M4 Pro; darwin 25.3.0.

Generation time includes failed calls. Word and crossing statistics include successful puzzles only. Each row has 30 calls.

| Grid | Mode | Policy | Success | Median ms | P95 ms | Max ms | Median words | Min words | Median crossings | Pool size |
|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 7×7 | EN→AR | approved-only | 29/30 (96.7%) | 3.7 | 21.8 | 1101.8 | 26.0 | 24 | 36.0 | 2000.0 |
| 7×7 | AR→EN | approved-only | 29/30 (96.7%) | 25.1 | 159.6 | 3002.7 | 22.0 | 22 | 41.0 | 1807.0 |
| 9×9 | EN→AR | approved-only | 27/30 (90.0%) | 36.2 | 1702.8 | 1703.0 | 42.0 | 40 | 57.0 | 2000.0 |
| 9×9 | AR→EN | approved-only | 29/30 (96.7%) | 709.5 | 1521.5 | 3992.0 | 32.0 | 32 | 64.0 | 2223.0 |
| 11×11 | EN→AR | approved-only | 19/30 (63.3%) | 623.2 | 1805.1 | 1805.6 | 60.0 | 56 | 85.0 | 2000.0 |
| 11×11 | AR→EN | approved-only | 8/30 (26.7%) | 4503.0 | 4504.6 | 4505.2 | 44.0 | 44 | 88.0 | 2373.0 |
| 13×13 | EN→AR | approved-only | 15/30 (50.0%) | 1643.3 | 1807.9 | 1807.9 | 80.0 | 76 | 119.0 | 2000.0 |
| 13×13 | AR→EN | approved-only | 0/30 (0.0%) | 4515.9 | 4519.1 | 4519.7 | — | — | — | 2417.0 |

## Approved-only readiness

Thresholds: READY ≥95%, NEARLY READY ≥80% and <95%, NOT READY <80%. Confidence intervals are 95% Wilson intervals; seed trials are a practical empirical sample, not a guarantee about real user traffic.

| Grid | Mode | Assessment | Success % | 95% interval |
|---|---|---|---:|---|
| 7×7 | EN→AR | READY | 96.7 | 83.3–99.4% |
| 9×9 | EN→AR | NEARLY READY | 90.0 | 74.4–96.5% |
| 11×11 | EN→AR | NOT READY | 63.3 | 45.5–78.1% |
| 13×13 | EN→AR | NOT READY | 50.0 | 33.2–66.8% |
| 7×7 | AR→EN | READY | 96.7 | 83.3–99.4% |
| 9×9 | AR→EN | READY | 96.7 | 83.3–99.4% |
| 11×11 | AR→EN | NOT READY | 26.7 | 14.2–44.4% |
| 13×13 | AR→EN | NOT READY | 0.0 | 0.0–11.4% |

## Observed failure evidence

| Policy | Mode | Reason | Failed calls |
|---|---|---|---:|
| approved-only | EN→AR | solver_deadline_observed_root_cause_unestablished | 30 |
| approved-only | AR→EN | solver_deadline_observed_root_cause_unestablished | 54 |

Returned puzzles: 156. Returned-puzzle quality failures: 0. Internal validation error messages: 0.

A deadline observation is not proof that candidate scarcity caused the failure. No vocabulary-size target can be inferred reliably from a comparison of just two differently composed pools. See README for scope and coverage limitations.
