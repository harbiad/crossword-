# Batch006 + QA: paired approved-only measurement

Thirty identical seeds per configuration, seed-0 warmup, advanced band, unchanged production generator settings and candidate limits. Baseline is Batch005 + QA.

| Grid | Mode | Success before → after | Median ms before → after | P95 ms before → after | API candidates before → after | Median words before → after |
|---|---|---:|---:|---:|---:|---:|
| 7 | EN→AR | 96.7% → 100.0% | 3.7 → 3.9 | 21.8 → 902.9 | 2000 → 2000 | 26.0 → 26.0 |
| 9 | EN→AR | 90.0% → 90.0% | 36.2 → 14.6 | 1702.8 → 1702.8 | 2000 → 2000 | 42.0 → 42.0 |
| 11 | EN→AR | 63.3% → 63.3% | 623.2 → 1023.6 | 1805.1 → 1804.3 | 2000 → 2000 | 60.0 → 60.0 |
| 13 | EN→AR | 50.0% → 56.7% | 1643.3 → 1083.7 | 1807.9 → 1807.4 | 2000 → 2000 | 80.0 → 80.0 |
| 7 | AR→EN | 96.7% → 96.7% | 25.1 → 13.2 | 159.6 → 163.3 | 1807 → 1851 | 22.0 → 22.0 |
| 9 | AR→EN | 96.7% → 86.7% | 709.5 → 758.2 | 1521.5 → 3992.0 | 2223 → 2272 | 32.0 → 32.0 |
| 11 | AR→EN | 26.7% → 23.3% | 4503.0 → 4502.8 | 4504.6 → 4505.3 | 2373 → 2426 | 44.0 → 44.0 |
| 13 | AR→EN | 0.0% → 0.0% | 4515.9 → 4515.3 | 4519.1 → 4518.4 | 2417 → 2477 | — → — |

Readiness thresholds remain READY ≥95%, NEARLY READY ≥80% and <95%, NOT READY <80%. No production mode is automatically changed. Full candidate length distributions and raw runs are retained in generation/.

Returned-puzzle quality failures: **0**. All returned puzzles satisfy structural validation, source eligibility and canonical/inverted traversal checks.

## The same 788 targeted domains

**769/788 domains gained approved support**; 19 are unchanged. 243 formerly empty domains gained a match and 19 remain empty. 526 former exhaustion domains gained distinct alternatives. 0 moved from 1–3 matches to at least five. Five is descriptive headroom, not a proven sufficiency threshold.

| Grid | Improved targets | Formerly zero → supported | Still zero | Exhaustion targets improved |
|---|---:|---:|---:|---:|
| 11 AR→EN | 141/150 | 86 | 9 | 55 |
| 13 AR→EN | 628/638 | 157 | 10 | 471 |

These counts use the full eligible approved index and distinct canonical answers. They do not reuse already placed words or treat synonymous clues for one answer as additional diversity. See domain_coverage.csv for every frozen constraint and added answer.

## Remaining failed-call diagnostics

Re-observed 85 remaining failed benchmark calls; 85 still failed under the observer. All eight configurations are included; the three earlier control configurations were re-observed on Batch005 with the same cap to fill the baseline diagnostic gaps. Capture is the first 128 distinct records per solver attempt; 6009397 calls were uncaptured (not necessarily distinct). No quality constraints were weakened.

| Grid/mode | Failed calls before → after | True-gap zeros before → after | Exhaustion zeros before → after | Sampling zeros before → after | Nonzero small domains before → after |
|---|---:|---:|---:|---:|---:|
| 13 AR→EN | 30 → 30 | 30654 → 26164 | 14573 → 4946 | 0 → 0 | 441169 → 354366 |
| 11 AR→EN | 22 → 23 | 10004 → 8543 | 539 → 209 | 0 → 0 | 115707 → 108784 |
| 13 EN→AR | 15 → 13 | 54 → 50 | 160 → 243 | 24 → 26 | 4242 → 3009 |
| 11 EN→AR | 11 → 11 | 193 → 266 | 0 → 6 | 69 → 86 | 185 → 210 |
| 9 EN→AR | 3 → 3 | 93 → 52 | 38 → 10 | 5 → 10 | 82 → 108 |
| 7 AR→EN | 1 → 1 | 1363 → 1061 | 44 → 20 | 0 → 0 | 501 → 535 |
| 9 AR→EN | 1 → 4 | 174 → 720 | 17 → 68 | 0 → 0 | 2881 → 11500 |
| 7 EN→AR | 1 → 0 | 109 → 0 | 2 → 0 | 4 → 0 | 46 → 0 |

These are captured branch observations, not rates of independent puzzle failures. Counts can decrease simply because fewer runs fail, or increase because a new search trajectory visits more dead ends. Raw compressed traces preserve all captured constraints, templates, used answers and candidate windows. The examples CSV is only an inspection aid.

## Remaining common-reference coverage

Fresh recurring true-gap domains: 1262; 183 have a match in the still-unreviewed screened common-reference pool and 1079 do not. This is mechanical potential only, not a linguistic review or proof that no suitable word exists outside the screened pool.

## Candidate containment control

For English answers every sampled after-pool contains every old answer/clue pair, and runtime/validation are unchanged. Lost successes therefore cannot be explained by removing vocabulary or losing prior mathematical solutions; bounded search order/time is implicated. This does not establish feasibility for previously unsuccessful 13x13 cases. Arabic pools are capped and are not assumed to contain previous samples.

All 769 supported target domains still contain only 1–3 distinct answers. None became a domain with five or more. English true-gap zeros dominate the observed larger English failures; exhaustion dominates the 13×13 Arabic zero observations. These are branch-level findings, not proofs of global puzzle infeasibility.

## Next step

Do not commission Batch007. Neither target configuration improved in this paired run. Improved support for old domains has not established simultaneous feasibility for the new search choices. Investigate search choices and candidate-order effects with this fixed approved pool before assuming another review batch is the answer. Residual vocabulary gaps remain possible; these traces do not prove global unsatisfiability or a solver bug.

Thirty paired seeds with wall-clock deadlines; adding approvals alters sampled order and search trajectory, so generation is not monotonic in candidate count.
Word counts summarize successes; timings include failures. No success means median words is undefined.
Diagnostic counts use the same cap per attempt but different numbers of remaining failures and search states. They are not independent causal failure counts.
Matching a frozen support set does not prove that every crossing and all-different constraint can be satisfied simultaneously. No solver variant experiment was performed.

Compatibility remains enabled. No Batch007 has started.
