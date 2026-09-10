# Production balanced 13×13 English templates

The validated symmetric family is now selected only for 13×13 AR→EN. Minimum answer length remains three; no two-letter English entries are enabled. Compatibility remains the production dictionary policy.

## Implementation

`getBalancedEnglishTemplates13` generates 24 fresh symmetric layouts with the existing 30% block ceiling, maximum two consecutive blocks and connected white cells. Perpendicular singleton runs are permitted only when the cell belongs to another 3+ entry. Layouts exceeding 60% three-letter clues are filtered without refilling. All returned puzzles pass the unchanged validator, including entry-graph connectivity, numbering, clue/run matching and canonical-answer uniqueness.

The production code has no imports from experimental tooling and no global experimental switches. Template and candidate RNG streams remain independent. Other sizes and RTL retain their previous template generation, random call sequence and search settings. No solver budgets, dictionary decisions or UI behavior changed.

## Reproduction

```sh
APPROVED_BENCH_OUTPUT=template_family_13x13/production/after npm run bench:approved
python3 scripts/balanced-production-report.py
npm run dictionary:audit
npm test
npm run lint
npm run build
```

Thirty identical seeds (1–30), plus excluded seed-0 warmups, for all 16 configurations: 480 measured calls. Same advanced band, API limits and wall-clock solver budgets as the archived baseline. No network or concurrent benchmark processes. All timings include unsuccessful calls; puzzle quality medians include successes only.

The full comparison uses the prior all-configuration run in `template_feasibility_13x13/after`. The focused quality comparison uses the later paired current-family control in `template_family_13x13/comparison.json`, which also recorded cell coverage. These are historical measured baselines, not simultaneous runs. Wall-clock deadlines can change individual outcomes on unchanged paths.

| Grid | Mode | Policy | Success before → after | Median ms before → after | P95 ms before → after |
|---|---|---|---:|---:|---:|
| 7 | ar_to_en | approved-only | 29/30 → 29/30 | 14.5 → 14.1 | 165.5 → 164.2 |
| 7 | ar_to_en | compatibility | 30/30 → 30/30 | 5.3 → 5.3 | 130.5 → 130.4 |
| 7 | en_to_ar | approved-only | 30/30 → 30/30 | 3.5 → 3.6 | 902.7 → 902.7 |
| 7 | en_to_ar | compatibility | 30/30 → 30/30 | 3.9 → 3.7 | 5.0 → 5.7 |
| 9 | ar_to_en | approved-only | 30/30 → 30/30 | 748.5 → 747.5 | 1268.1 → 1260.3 |
| 9 | ar_to_en | compatibility | 30/30 → 30/30 | 367.5 → 367.2 | 1030.7 → 1031.6 |
| 9 | en_to_ar | approved-only | 27/30 → 27/30 | 14.4 → 14.1 | 1702.5 → 1702.5 |
| 9 | en_to_ar | compatibility | 30/30 → 30/30 | 7.4 → 7.2 | 14.8 → 14.8 |
| 11 | ar_to_en | approved-only | 12/30 → 12/30 | 4512.1 → 4511.9 | 4513.7 → 4513.9 |
| 11 | ar_to_en | compatibility | 30/30 → 30/30 | 857.5 → 806.0 | 1201.9 → 1179.1 |
| 11 | en_to_ar | approved-only | 19/30 → 19/30 | 1022.1 → 1021.7 | 1804.2 → 1804.3 |
| 11 | en_to_ar | compatibility | 28/30 → 28/30 | 14.5 → 14.9 | 1803.8 → 1803.9 |
| 13 | ar_to_en | approved-only | 0/30 → 30/30 | 1032.2 → 49.2 | 1262.9 → 257.8 |
| 13 | ar_to_en | compatibility | 29/30 → 30/30 | 881.5 → 81.0 | 4359.2 → 96.1 |
| 13 | en_to_ar | approved-only | 17/30 → 17/30 | 1074.7 → 1076.2 | 1807.1 → 1806.8 |
| 13 | en_to_ar | compatibility | 28/30 → 28/30 | 60.4 → 60.6 | 1806.1 → 1806.3 |

See `13x13_quality.csv` for word/crossing counts and white/crossed-cell percentages; `after/RESULTS.md` for all current measurements; `summary.json` for protected-input checks. The original experiment, two-letter controls and reports remain archived in the parent directory. No two-letter control is part of production.

## Verification and regression result

All 402 tests in 30 files, dictionary audit, lint and production build passed. All 480 benchmark calls completed with zero returned-puzzle quality/provenance errors. Every other configuration retained exactly its baseline success count. The worker bundle is 31.36 kB and contains no experimental benchmark imports. See `checks.json` and `files_changed.txt`.
