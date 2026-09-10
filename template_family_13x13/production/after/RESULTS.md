# Measured results

Measured 2026-09-10T15:39:56.815Z through 2026-09-10T15:44:23.075Z; baseline commit `d9c9f209fe45bcfa2220568a9f80c8a401f9690e`.

Runtime v24.10.0; Apple M4 Pro; darwin 25.3.0.

Generation time includes failed calls. Word and crossing statistics include successful puzzles only. Each row has 30 calls.

| Grid | Mode | Policy | Success | Median ms | P95 ms | Max ms | Median words | Min words | Median crossings | Pool size |
|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 7×7 | EN→AR | compatibility | 30/30 (100.0%) | 3.7 | 5.7 | 6.1 | 26.0 | 24 | 36.0 | 2000.0 |
| 7×7 | EN→AR | approved-only | 30/30 (100.0%) | 3.6 | 902.7 | 1064.0 | 26.0 | 24 | 36.0 | 2000.0 |
| 7×7 | AR→EN | compatibility | 30/30 (100.0%) | 5.3 | 130.4 | 131.6 | 22.0 | 21 | 41.0 | 2000.0 |
| 7×7 | AR→EN | approved-only | 29/30 (96.7%) | 14.1 | 164.2 | 3002.4 | 22.0 | 22 | 41.0 | 1851.0 |
| 9×9 | EN→AR | compatibility | 30/30 (100.0%) | 7.2 | 14.8 | 35.3 | 42.0 | 40 | 57.0 | 2000.0 |
| 9×9 | EN→AR | approved-only | 27/30 (90.0%) | 14.1 | 1702.5 | 1702.6 | 42.0 | 40 | 57.0 | 2000.0 |
| 9×9 | AR→EN | compatibility | 30/30 (100.0%) | 367.2 | 1031.6 | 1035.6 | 31.0 | 30 | 65.5 | 4000.0 |
| 9×9 | AR→EN | approved-only | 30/30 (100.0%) | 747.5 | 1260.3 | 1429.0 | 32.0 | 32 | 64.0 | 2272.0 |
| 11×11 | EN→AR | compatibility | 28/30 (93.3%) | 14.9 | 1803.9 | 1804.7 | 59.5 | 56 | 85.0 | 2000.0 |
| 11×11 | EN→AR | approved-only | 19/30 (63.3%) | 1021.7 | 1804.3 | 1804.4 | 60.0 | 58 | 85.0 | 2000.0 |
| 11×11 | AR→EN | compatibility | 30/30 (100.0%) | 806.0 | 1179.1 | 1203.2 | 42.5 | 40 | 90.0 | 6000.0 |
| 11×11 | AR→EN | approved-only | 12/30 (40.0%) | 4511.9 | 4513.9 | 4514.5 | 44.0 | 44 | 88.0 | 2426.0 |
| 13×13 | EN→AR | compatibility | 28/30 (93.3%) | 60.6 | 1806.3 | 1806.5 | 82.0 | 78 | 119.0 | 2000.0 |
| 13×13 | EN→AR | approved-only | 17/30 (56.7%) | 1076.2 | 1806.8 | 1806.9 | 80.0 | 76 | 119.0 | 2000.0 |
| 13×13 | AR→EN | compatibility | 30/30 (100.0%) | 81.0 | 96.1 | 107.1 | 52.0 | 48 | 91.5 | 6000.0 |
| 13×13 | AR→EN | approved-only | 30/30 (100.0%) | 49.2 | 257.8 | 274.9 | 52.0 | 48 | 90.0 | 2477.0 |

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
| 13×13 | AR→EN | READY | 100.0 | 88.6–100.0% |

## Observed failure evidence

| Policy | Mode | Reason | Failed calls |
|---|---|---|---:|
| approved-only | EN→AR | solver_deadline_observed_root_cause_unestablished | 27 |
| approved-only | AR→EN | solver_deadline_observed_root_cause_unestablished | 19 |
| compatibility | EN→AR | solver_deadline_observed_root_cause_unestablished | 4 |

Returned puzzles: 430. Returned-puzzle quality failures: 0. Internal validation error messages: 0.

A deadline observation is not proof that candidate scarcity caused the failure. No vocabulary-size target can be inferred reliably from a comparison of just two differently composed pools. See README for scope and coverage limitations.
