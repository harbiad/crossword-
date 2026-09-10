# Batch006 fixed-vocabulary search investigation

Dictionary review is paused. Input is Batch006 QA, with compatibility still the production policy. No translation/status/CEFR changes or weakened validation are permitted.

## Evidence layers

- `historical_seed_transitions.json`: exact Batch005→Batch006 outcomes from the saved 30-seed runs. `regressions/` preserves the original failed-call traces.
- `before/`: freshly repeated 30-seed benchmark, both compatibility and approved-only, before production algorithm edits.
- `experiments/`: controlled experiments on the same API candidate pairs and budgets. Candidate ordering is changed after normalization and the existing random shuffle, preserving its RNG consumption and template discovery. “Old order” means retain the old prepared answer order and append newly approved answers; it never removes the new records. Frequency uses immutable dictionary position. Fixed shuffle variants use independent seeded ranks.
- `solver_window_domains.csv.gz`: full received matching domain versus attempt-window matching domain and live propagated domain, for captured failed-slot observations. Omitted candidates are explicit. This separates API sampling from solver windows and sound propagation.

The experimental solver is a benchmark-only copy of the baseline arc solver. Variants test answer/orientation deduplication, least-constraining values, singleton canonical uniqueness propagation, a root bipartite-matching feasibility check, and MRV ties independently. `combined` combines deduplication, LCV, singleton propagation and root matching. No variant changes eligibility, time budgets, clue text or inversion. Timing jobs run sequentially without concurrent solver benchmarks.

Already present in the baseline: iterative crossing propagation to a fixed point; MRV with static crossing-degree tie; assigning a word removes its canonical answer from every unassigned same-length slot and repropagates. Missing: forced-but-unassigned canonical singleton propagation and a global uniqueness feasibility precheck. The small-grid fill solver checks only crossing neighbors, though later lookup still excludes every used answer.

A timeout is never a proof of unsatisfiability. A zero found during sound root propagation or a failed complete bipartite matching proves a necessary condition failed for that template and pool. Nonempty arc-consistent domains and successful matching are necessary, not sufficient, for simultaneous crossword feasibility.

## Reproduction

```sh
APPROVED_BENCH_OUTPUT=search_feasibility_analysis/before npm run bench:approved
npx vitest run --config vitest.search.config.ts
python3 scripts/search-truncation.py
```

`SEARCH_VARIANTS`, `SEARCH_SEEDS`, `SEARCH_CONFIGS`, and `SEARCH_OUTPUT` select explicit experimental controls. `SEARCH_TRACE=1` retains a bounded first-12 snapshot sequence including slot-intersection graph, full oriented domains and assignments. It is intentionally separate from timing-only runs.

See ROOT_CAUSES.md for findings and retained changes, RESULTS.md for the final paired measurements, and checks.json for validation. Batch007 has not started.


Additional controls and their exact settings are retained in order_controls/, feasibility_controls/, template_controls/, uniqueness_controls/, nine_controls/, probe_controls/, support_controls/, lcv_full_pilot/, and portfolio_full_pilot/. Every directory includes raw runs and summary tables; successful controls include complete puzzle witnesses. The small screens use explicit targeted seeds and are not substitutes for the final 30-seed comparison. Experimental algorithms remain outside production.

```sh
python3 scripts/search-verify-proof.py
APPROVED_BENCH_OUTPUT=search_feasibility_analysis/after npm run bench:approved
python3 scripts/search-report.py
npm run dictionary:audit
npm test
npm run lint
npm run build
```

Historical dictionary-analysis tests verify the archived baseline solver hashes while continuing to verify all dictionary inputs unchanged. New tests cover full-pool versus subset proof reuse, timeout safety, an independent exhaustive small-grid oracle, canonical crossing correctness under LCV, complete candidate windows and the two-pass revisit behavior.
