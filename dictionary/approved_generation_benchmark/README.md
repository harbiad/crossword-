# Approved dictionary generation measurement

Run `npm run bench:approved` from the repository root. This is a separate benchmark, excluded from ordinary `npm test` and the production bundle.

## Protocol

30 paired seeds (1–30), four sizes, two answer directions, and two eligibility policies: 480 measured generation calls. Each configuration receives one excluded seed-0 warm-up. The LCG uses multiplier 1664525, increment 1013904223, and unsigned 32-bit state. Reset the random stream separately before candidate selection and generation. Alternate policy order by seed. Calls execute serially without network traffic. Real time budgets remain unchanged; timing-dependent search can still vary between machines or repeated runs.

Both policies use the existing Advanced band, the production 2,000-pair candidate limit, existing length balancing, templates, retries, solver budgets, normalization and strict validation. This tests the full vocabulary band, not every difficulty setting. Candidate indexes are initialized once per policy. API preparation, assertions and provenance checks are outside the reported generation time. Generation time includes client preparation, templates, solving, grid construction and internal validation. The independent post-generation validation is outside that time.

Every selected pair must have an eligible master-dictionary source. Every returned entry must match both the selected pool and eligible provenance. Approved-only provenance requires approved headword, approved relationship and MSA register. Both policies exclude rejected, dialect and explicitly direction-disallowed relationships. Preference is not eligibility. If identical answer/clue pairs have multiple source relationships, provenance establishes an eligible source; puzzle entries do not store a relationship ID. Every returned puzzle passes `validatePuzzle` and an explicit canonical character-to-cell and entry-membership check using structural inversion metadata.

`runs.json` is written incrementally; `runs.csv` and `summary.json` are finalized after all runs. CSVs use quoted fields, including JSON-valued detailed columns. Candidate length distribution reports full API index counts and distinct client-normalized answer counts, separately by size; lengths beyond a grid's maximum are zero. Actual selected pool counts by length are in each run.

## Interpretation

Generation times include successful and unsuccessful calls. Entry/intersection statistics include successful puzzles only; crossings count cells shared by two entries. “Attempts” in the summary means generation requests; internal solver attempts are reported separately. Median is the midpoint median and p95 is nearest-rank. READY means at least 95% observed success, NEARLY READY means 80% to below 95%, NOT READY means below 80%. With 30 trials the resolution is 3.33 percentage points; even 30/30 is evidence, not a reliability guarantee.

Failure instrumentation is benchmark-only and fails loudly if source markers change. A timeout observation establishes that a solver deadline was reached, not that vocabulary scarcity caused it. Validation errors record actual rejected candidates. No viable template means every sampled template was missing a required candidate length. Remaining failures are explicitly unknown bounded-search failures. Failure categories do not claim global unsatisfiability or identify a primary cause from timing alone.

Compatibility remains production policy. No classifications, CEFR assignments, Arabic text, production budgets or search rules are changed.

See [RESULTS.md](RESULTS.md) for the 16-row timing comparison, readiness and observed failures.

## Approved coverage and next steps

Full 13×13-eligible index below. Counts at smaller sizes differ because the existing API also filters English headword length in EN→AR. A candidate is an indexed answer/clue pair; distinct answers account for client normalization. The per-size CSV contains the complete breakdown.

| Answer length | EN→AR pairs | EN→AR distinct answers | AR→EN pairs / distinct answers |
|---:|---:|---:|---:|
| 2 | 50 | 42 | 15 |
| 3 | 367 | 306 | 120 |
| 4 | 731 | 651 | 269 |
| 5 | 870 | 764 | 266 |
| 6 | 631 | 562 | 239 |
| 7 | 502 | 445 | 219 |
| 8 | 180 | 165 | 167 |
| 9 | 94 | 88 | 78 |
| 10 | 24 | 23 | 54 |
| 11 | 16 | 16 | 28 |
| 12 | 13 | 13 | 14 |
| 13 | 2 | 2 | 8 |

**Viability:** only 7×7 EN→AR meets the requested READY threshold (29/30, 96.7%). It still has a worse tail latency than compatibility and needs a larger confirmatory sample before a product switch. All other approved-only configurations are NOT READY. There are no NEARLY READY configurations in this measurement.

**Limiting lengths:** no sampled template was excluded for an entirely absent length. Arabic lengths 10–13 and English lengths 2 and 11–13 are sparse in absolute terms. These are coverage warnings, not established causes: the benchmark does not isolate positional-letter diversity, template difficulty or any particular length. A causal length recommendation requires a controlled follow-up, not guessing from totals.

**Direction needing review:** AR→EN is the stronger priority. Its approved pool fails even at 7×7 and 9×9 where compatibility succeeds 100% and 90%. Approved EN→AR also needs strengthening beyond 7×7. At 11×11 and 13×13 AR→EN, compatibility itself achieved 0/30; further dictionary approval alone cannot be assumed to fix these configurations.

**Batch004 recommendation:** further bounded review is justified, but do not continue an untargeted batch merely to reach a relationship total. First investigate the English template/search failures with the compatibility pool and use coverage/crossing diagnostics to guide review priorities. Batch004 has not started.

**Additional vocabulary needed:** no specific numerical estimate is defensible from two pools of different composition and a fixed 2,000-pair cap. For 7×7 EN→AR, this sample demonstrates no minimum additional vocabulary requirement. For the failing configurations, neither “500 more headwords” nor another count has been tested. More approvals may improve composition even when the sampled pool already reaches 2,000; candidate count alone is not the target.

Dictionary state remains 16,018 headwords and 29,467 relationships: 3,562 approved, 25,529 review, 376 rejected. No classification, relationship, Arabic text or CEFR changes. Compatibility remains enabled.

## Verification

`npm run dictionary:audit`: passed. `npm test`: 346 tests across 21 files passed. `npm run lint`: passed. `npm run build`: passed. The separate benchmark test passed all 480 measured runs and returned-puzzle assertions (failed generation requests remain recorded failures).

Files added: `benchmarks/approved.benchmark.ts`, `benchmarks/approved-metrics.ts`, `benchmarks/approved-report.mjs`, `vitest.approved-benchmark.config.ts`, and this report directory. Configuration additions: `bench:approved` in package.json and benchmark config typechecking in tsconfig.node.json. Pre-existing unrelated working-tree changes were preserved.
