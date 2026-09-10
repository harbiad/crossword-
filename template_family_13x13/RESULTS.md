# Template-family benchmark results

**Recommendation: A — keep English answers at 3+ and adopt the balanced symmetric family after product review. All changes remain experimental here.**

| Family | Policy | Success | Median ms | P95 ms | Median words | Median crossings | Unique layouts |
|---|---|---:|---:|---:|---:|---:|---:|
| balanced-symmetric | approved-only | 100.0% | 50.3 | 256.6 | 52.0 | 90.0 | 30 |
| balanced-symmetric | compatibility | 100.0% | 79.7 | 102.2 | 52.0 | 91.5 | 30 |
| current | approved-only | 0.0% | 1098.5 | 1311.0 | — | — | 0 |
| current | compatibility | 96.7% | 887.3 | 4364.2 | 62.0 | 131.0 | 28 |
| symmetric-unchecked | approved-only | 100.0% | 49.9 | 242.6 | 53.0 | 90.0 | 30 |
| symmetric-unchecked | compatibility | 100.0% | 89.8 | 104.2 | 53.0 | 91.0 | 30 |
| two-fully-checked | approved-only | 0.0% | 1432.9 | 1715.6 | — | — | 0 |
| two-fully-checked | compatibility | 100.0% | 481.0 | 1210.2 | 81.0 | 119.0 | 30 |
| two-symmetric-unchecked | approved-only | 76.7% | 2601.3 | 3807.1 | 55.0 | 87.0 | 23 |
| two-symmetric-unchecked | compatibility | 100.0% | 67.5 | 238.4 | 66.0 | 97.0 | 30 |
| two-unchecked | approved-only | 70.0% | 3033.8 | 3860.9 | 55.0 | 85.0 | 21 |
| two-unchecked | compatibility | 100.0% | 75.4 | 256.3 | 63.0 | 93.5 | 30 |
| unchecked | approved-only | 100.0% | 61.9 | 430.6 | 52.0 | 88.0 | 30 |
| unchecked | compatibility | 100.0% | 96.9 | 110.2 | 52.0 | 89.0 | 30 |

Timings include failed calls; quality medians use successful puzzles. Each row has 30 measured seeds plus an excluded warm-up. Same solver budgets and candidate sets per seed/policy.

| Family | Policy | White % | Checked white % | Mean answer length (median) | 3-letter count | ≤3-letter share % | 11–13 count | 13-letter count | 2-letter share % |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| balanced-symmetric | approved-only | 70.4 | 75.6 | 4.0 | 26.5 | 50.4 | 0.0 | 0.0 | 0.0 |
| balanced-symmetric | compatibility | 70.4 | 76.6 | 4.0 | 26.0 | 50.4 | 0.0 | 0.0 | 0.0 |
| current | approved-only | — | — | — | — | — | — | — | — |
| current | compatibility | 77.5 | 100.0 | 4.2 | 37.0 | 59.4 | 4.0 | 4.0 | 0.0 |
| symmetric-unchecked | approved-only | 70.4 | 75.6 | 3.9 | 29.0 | 55.6 | 0.0 | 0.0 | 0.0 |
| symmetric-unchecked | compatibility | 70.4 | 76.5 | 4.0 | 30.0 | 56.1 | 0.0 | 0.0 | 0.0 |
| two-fully-checked | approved-only | — | — | — | — | — | — | — | — |
| two-fully-checked | compatibility | 70.4 | 100.0 | 2.9 | 18.0 | 75.8 | 0.0 | 0.0 | 53.8 |
| two-symmetric-unchecked | approved-only | 70.4 | 73.1 | 3.7 | 18.0 | 56.1 | 0.0 | 0.0 | 24.6 |
| two-symmetric-unchecked | compatibility | 70.4 | 81.5 | 3.3 | 16.0 | 68.4 | 0.0 | 0.0 | 43.8 |
| two-unchecked | approved-only | 70.4 | 71.4 | 3.7 | 18.0 | 56.9 | 0.0 | 0.0 | 25.9 |
| two-unchecked | compatibility | 70.4 | 78.6 | 3.4 | 15.0 | 65.3 | 0.0 | 0.0 | 41.3 |
| unchecked | approved-only | 70.4 | 73.9 | 4.0 | 28.0 | 53.2 | 0.0 | 0.0 | 0.0 |
| unchecked | compatibility | 70.4 | 74.8 | 4.0 | 27.0 | 51.9 | 0.5 | 0.0 | 0.0 |

The balanced family is a separate quality-filter control, not a solver change. It has 48–58 words and 84–98 intersections in approved-only output, at most 60% three-letter answers, and zero two-letter answers. All returned successful puzzles pass the unchanged validator.

## Interpretation

- The previous four-long-word obstruction depended on every cell being checked in both axes. Actual correctness rules allow one or two entry owners. Allowing perpendicular singleton runs while covering every cell with a 3+ entry resolves the obstruction.
- Symmetry need not be removed. No long-word quota, dictionary expansion, duplicate reuse or longer runtime budget was needed.
- The recommended family meets the target on this 30-seed test, with 30 distinct layouts. This is strong bounded evidence, not a guarantee over every possible seed or candidate band.
- Two-letter controls are inferior with the approved pool: 70%, 76.7%, or 0%, versus 100% for 3+. The best two-letter symmetric control has median 2,601ms and about 24.6% two-letter entries.
- Compatibility two-letter outputs contain 47 distinct short answers, including many historical abbreviation/editorial-review candidates; use the frequency CSV rather than assuming all short words are useful.
- Production remains compatibility with the existing generator. No dictionary approvals, CEFR, other sizes, validation, cursor behavior, or inversion changed in this task.

See `README.md` for rule provenance, commands and category caveats; `checks.json` for verification; `examples.svg` for actual grids.
