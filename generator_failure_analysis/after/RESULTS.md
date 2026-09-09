# Measured results

Measured 2026-09-09T19:18:21.191Z through 2026-09-09T19:29:27.356Z; baseline commit `6b01f715bda2243487cdf7065d3f278a15af6389`.

Runtime v24.10.0; Apple M4 Pro; darwin 25.3.0.

Generation time includes failed calls. Word and crossing statistics include successful puzzles only. Each row has 30 calls.

| Grid | Mode | Policy | Success | Median ms | P95 ms | Max ms | Median words | Min words | Median crossings | Pool size |
|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 7×7 | EN→AR | compatibility | 30/30 (100.0%) | 3.9 | 5.3 | 5.4 | 26.0 | 24 | 36.0 | 2000.0 |
| 7×7 | EN→AR | approved-only | 29/30 (96.7%) | 5.3 | 781.7 | 1101.5 | 26.0 | 24 | 36.0 | 2000.0 |
| 7×7 | AR→EN | compatibility | 30/30 (100.0%) | 5.5 | 130.2 | 130.4 | 22.0 | 21 | 41.0 | 2000.0 |
| 7×7 | AR→EN | approved-only | 0/30 (0.0%) | 3002.3 | 3002.7 | 3002.8 | — | — | — | 1128.0 |
| 9×9 | EN→AR | compatibility | 29/30 (96.7%) | 7.4 | 11.3 | 1702.5 | 42.0 | 40 | 57.0 | 2000.0 |
| 9×9 | EN→AR | approved-only | 14/30 (46.7%) | 1701.9 | 1702.8 | 1703.0 | 42.0 | 40 | 57.0 | 2000.0 |
| 9×9 | AR→EN | compatibility | 30/30 (100.0%) | 424.3 | 1034.5 | 1040.5 | 32.0 | 30 | 64.0 | 4000.0 |
| 9×9 | AR→EN | approved-only | 0/30 (0.0%) | 3990.8 | 3991.6 | 3991.7 | — | — | — | 1373.0 |
| 11×11 | EN→AR | compatibility | 29/30 (96.7%) | 14.2 | 1095.0 | 1803.6 | 59.0 | 56 | 85.0 | 2000.0 |
| 11×11 | EN→AR | approved-only | 4/30 (13.3%) | 1803.7 | 1804.6 | 1804.8 | 59.0 | 58 | 85.0 | 2000.0 |
| 11×11 | AR→EN | compatibility | 30/30 (100.0%) | 530.7 | 2549.4 | 2691.4 | 44.0 | 41 | 97.0 | 6000.0 |
| 11×11 | AR→EN | approved-only | 0/30 (0.0%) | 4420.7 | 4485.9 | 4501.3 | — | — | — | 1455.0 |
| 13×13 | EN→AR | compatibility | 28/30 (93.3%) | 57.2 | 1806.0 | 1806.7 | 82.0 | 78 | 119.0 | 2000.0 |
| 13×13 | EN→AR | approved-only | 3/30 (10.0%) | 1806.2 | 1807.1 | 1807.7 | 80.0 | 76 | 119.0 | 2000.0 |
| 13×13 | AR→EN | compatibility | 28/30 (93.3%) | 479.1 | 4516.9 | 4517.3 | 64.0 | 58 | 130.5 | 6000.0 |
| 13×13 | AR→EN | approved-only | 0/30 (0.0%) | 2369.7 | 2521.9 | 2524.4 | — | — | — | 1477.0 |

## Approved-only readiness

Thresholds: READY ≥95%, NEARLY READY ≥80% and <95%, NOT READY <80%. Confidence intervals are 95% Wilson intervals; seed trials are a practical empirical sample, not a guarantee about real user traffic.

| Grid | Mode | Assessment | Success % | 95% interval |
|---|---|---|---:|---|
| 7×7 | EN→AR | READY | 96.7 | 83.3–99.4% |
| 9×9 | EN→AR | NOT READY | 46.7 | 30.2–63.9% |
| 11×11 | EN→AR | NOT READY | 13.3 | 5.3–29.7% |
| 13×13 | EN→AR | NOT READY | 10.0 | 3.5–25.6% |
| 7×7 | AR→EN | NOT READY | 0.0 | 0.0–11.4% |
| 9×9 | AR→EN | NOT READY | 0.0 | 0.0–11.4% |
| 11×11 | AR→EN | NOT READY | 0.0 | 0.0–11.4% |
| 13×13 | AR→EN | NOT READY | 0.0 | 0.0–11.4% |

## Observed failure evidence

| Policy | Mode | Reason | Failed calls |
|---|---|---|---:|
| approved-only | AR→EN | solver_deadline_observed_root_cause_unestablished | 90 |
| approved-only | EN→AR | solver_deadline_observed_root_cause_unestablished | 70 |
| approved-only | AR→EN | bounded_search_no_solution_reason_unestablished | 30 |
| compatibility | EN→AR | solver_deadline_observed_root_cause_unestablished | 4 |
| compatibility | AR→EN | solver_deadline_observed_root_cause_unestablished | 2 |

Returned puzzles: 284. Returned-puzzle quality failures: 0. Internal validation error messages: 0.

A deadline observation is not proof that candidate scarcity caused the failure. No vocabulary-size target can be inferred reliably from a comparison of just two differently composed pools. See README for scope and coverage limitations.
