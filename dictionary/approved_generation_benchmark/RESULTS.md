# Measured results

Measured 2026-09-09T18:19:24.197Z through 2026-09-09T18:33:39.764Z; baseline commit `6b01f715bda2243487cdf7065d3f278a15af6389`.

Runtime v24.10.0; Apple M4 Pro; darwin 25.3.0.

Generation time includes failed calls. Word and crossing statistics include successful puzzles only. Each row has 30 calls.

| Grid | Mode | Policy | Success | Median ms | P95 ms | Max ms | Median words | Min words | Median crossings | Pool size |
|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 7×7 | EN→AR | compatibility | 30/30 (100.0%) | 3.9 | 4.7 | 5.3 | 26.0 | 24 | 36.0 | 2000.0 |
| 7×7 | EN→AR | approved-only | 29/30 (96.7%) | 5.2 | 777.1 | 1101.7 | 26.0 | 24 | 36.0 | 2000.0 |
| 7×7 | AR→EN | compatibility | 30/30 (100.0%) | 5.2 | 130.2 | 130.4 | 22.0 | 21 | 41.0 | 2000.0 |
| 7×7 | AR→EN | approved-only | 0/30 (0.0%) | 3002.2 | 3002.6 | 3003.2 | — | — | — | 1128.0 |
| 9×9 | EN→AR | compatibility | 29/30 (96.7%) | 7.0 | 11.2 | 1702.4 | 42.0 | 40 | 57.0 | 2000.0 |
| 9×9 | EN→AR | approved-only | 14/30 (46.7%) | 1702.0 | 1703.0 | 1703.1 | 42.0 | 40 | 57.0 | 2000.0 |
| 9×9 | AR→EN | compatibility | 27/30 (90.0%) | 684.0 | 3991.9 | 3992.5 | 32.0 | 31 | 64.0 | 2000.0 |
| 9×9 | AR→EN | approved-only | 0/30 (0.0%) | 3991.1 | 3992.0 | 3992.7 | — | — | — | 1373.0 |
| 11×11 | EN→AR | compatibility | 29/30 (96.7%) | 13.7 | 1095.4 | 1803.7 | 59.0 | 56 | 85.0 | 2000.0 |
| 11×11 | EN→AR | approved-only | 4/30 (13.3%) | 1803.7 | 1804.8 | 1804.8 | 59.0 | 58 | 85.0 | 2000.0 |
| 11×11 | AR→EN | compatibility | 0/30 (0.0%) | 4502.3 | 4503.4 | 4503.7 | — | — | — | 2000.0 |
| 11×11 | AR→EN | approved-only | 0/30 (0.0%) | 4420.5 | 4502.4 | 4503.6 | — | — | — | 1455.0 |
| 13×13 | EN→AR | compatibility | 20/30 (66.7%) | 1035.5 | 1806.9 | 1807.0 | 81.5 | 78 | 119.5 | 2000.0 |
| 13×13 | EN→AR | approved-only | 0/30 (0.0%) | 1806.3 | 1807.3 | 1807.5 | — | — | — | 2000.0 |
| 13×13 | AR→EN | compatibility | 0/30 (0.0%) | 4513.6 | 4515.7 | 4518.1 | — | — | — | 2000.0 |
| 13×13 | AR→EN | approved-only | 0/30 (0.0%) | 92.1 | 98.0 | 98.1 | — | — | — | 1477.0 |

## Approved-only readiness

Thresholds: READY ≥95%, NEARLY READY ≥80% and <95%, NOT READY <80%. Confidence intervals are 95% Wilson intervals; seed trials are a practical empirical sample, not a guarantee about real user traffic.

| Grid | Mode | Assessment | Success % | 95% interval |
|---|---|---|---:|---|
| 7×7 | EN→AR | READY | 96.7 | 83.3–99.4% |
| 9×9 | EN→AR | NOT READY | 46.7 | 30.2–63.9% |
| 11×11 | EN→AR | NOT READY | 13.3 | 5.3–29.7% |
| 13×13 | EN→AR | NOT READY | 0.0 | 0.0–11.4% |
| 7×7 | AR→EN | NOT READY | 0.0 | 0.0–11.4% |
| 9×9 | AR→EN | NOT READY | 0.0 | 0.0–11.4% |
| 11×11 | AR→EN | NOT READY | 0.0 | 0.0–11.4% |
| 13×13 | AR→EN | NOT READY | 0.0 | 0.0–11.4% |

## Observed failure evidence

| Policy | Mode | Reason | Failed calls |
|---|---|---|---:|
| approved-only | AR→EN | solver_deadline_observed_root_cause_unestablished | 90 |
| approved-only | EN→AR | solver_deadline_observed_root_cause_unestablished | 73 |
| compatibility | AR→EN | solver_deadline_observed_root_cause_unestablished | 63 |
| compatibility | EN→AR | solver_deadline_observed_root_cause_unestablished | 12 |
| approved-only | AR→EN | bounded_search_no_solution_reason_unestablished | 30 |

Returned puzzles: 212. Returned-puzzle quality failures: 0. Internal validation error messages: 0.

A deadline observation is not proof that candidate scarcity caused the failure. No vocabulary-size target can be inferred reliably from a comparison of just two differently composed pools. See README for scope and coverage limitations.
