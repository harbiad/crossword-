# Stage 3B: residual-domain analysis before Batch006

**Analysis and proposed selection only.** No relationship was linguistically reviewed, approved, rejected, corrected or assigned CEFR. The 5,655 approved relationships and production compatibility policy are unchanged. Generator source, sampling algorithm, budgets, inversion and duplicate-answer rules are unchanged; protected input hashes are verified.

## Evidence and capture

Re-ran every failed seed from the Batch005 approved-only benchmark for the five requested configurations: **81 calls, all 81 still failed**, advanced band, the original seeds within 1–30, unchanged production pool limits and generator options. No already-ready configuration was rerun. These are failure diagnostics, not a new success-rate benchmark.

The benchmark-only Vite observer inserts logging into in-memory modules. Every solver attempt records its template, candidate window, placement count and observation counters. Capture takes the first 128 distinct slot/support-set/used-word/reason records **per attempt**, avoiding the previous run-wide cap that concentrated on the first template. Raw calls after the cap are counted, not silently presented as captured distinct states.

Observed 5,491 solver attempts; 5,491 returned no placements. 617,791 useful records contain 56,406 actual zero-domain observations and 561,385 nonzero 1–3-candidate observations. 2,919 truncated MRV probes were excluded after recomputing the actual window/used-word domain. 5,226,047 calls were uncaptured; these may repeat and are not unique-domain counts.

Observer overhead affects wall-clock deadlines and search trajectories. All 81 failure outcomes reproduced, but timing and attempt-count comparisons with uninstrumented runs would be invalid. These bounded observations are not unbiased samples of all search states.

## Classification

Counts below are **captured zero-domain observations**, not independent failed puzzles or percentages of failures causally attributable to a category. A run can encounter several categories.

| Grid | Mode | Failed runs | A: full approved gap | B: used-word exhaustion | C: API sampling loss |
|---|---|---:|---:|---:|---:|
| 13 | AR→EN | 30 | 30,654 | 14,573 | 0 |
| 11 | AR→EN | 22 | 10,004 | 539 | 0 |
| 13 | EN→AR | 15 | 54 | 160 | 24 |
| 11 | EN→AR | 11 | 193 | 0 | 69 |
| 9 | EN→AR | 3 | 93 | 38 | 5 |

Total actual zeros: **40,998 A / 15,310 B / 98 C**. Actual A zeros occur in 78/81 runs; B in 70; C in 22. Including nonzero risk states, A appears in 81 and C in 25. The table is stratified because English search produced far more observed states; pooling percentages would hide the Arabic sampling effect.

A means no full eligible approved canonical answer matches the recorded support constraints. B means matching answers exist but all are already in the used-word set. C means at least one unused full-set answer exists but none survives the API sample. Internal candidate-window and propagation-only restrictions have separate labels rather than being misclassified as sampling; no such zero cases were captured in this run.

A live arc domain can still contain 1–3 oriented candidates while recomputation against all current neighbor support sets yields zero: propagation is mid-update. These nonzero intermediate states are retained as risk observations, not counted as actual zero failures. Supported small domains are likewise not falsely called A/B/C failures.

Pattern positions follow normal traversal; inversion translates the position to length−1−position without reversing stored answers. A question mark can hide a multi-character support set: use the constraints column. Equivalent normal/inverted constraint sets are canonicalized for domain ranking, while raw observations retain original slot coordinates and direction.

Full matches use the size-specific eligible approved index and distinct canonical grid answers, not relationship counts. Source English-length eligibility still applies to Arabic-answer candidates. Different Arabic clues for the same English answer, or new relationships with an existing Arabic grid spelling, do not count as additional diversity.

## Sampling and used-word diversity

| Grid/mode | Runs with full>0, API=0 | Zero observations caused by API loss | Full≥5 → API 1–3 observations |
|---|---:|---:|---:|
| 13 AR→EN | 0/30 | 0 | 0 |
| 11 AR→EN | 0/22 | 0 | 0 |
| 13 EN→AR | 13/15 | 24 | 178 |
| 11 EN→AR | 10/11 | 69 | 44 |
| 9 EN→AR | 2/3 | 5 | 3 |

Arabic 11×11: 69/262 captured zeros (26.3%) are API sample loss. Arabic 13×13: 24/238 (10.1%) are sample loss; 160/238 (67.2%) are used-word exhaustion. Arabic 9×9: 5/136 (3.7%) are sample loss. These are diagnostic proportions, not predicted puzzle-success improvements. Both English configurations retained all relevant approved matches; changing API sampling cannot repair their measured missing-support or exhausted-answer cases.

Full-domain-to-sample loss occurs in 840 captured records. 139 have full>0/sample=0 (98 actual zeros), and 225 shrink from at least five to 1–3. sampling_losses.csv lists full/sample/window counts, percentage retained and every omitted canonical answer.

The most repeatedly exhausted English answers include PROFESSIONALS (30 runs), UNDERSTANDING (30 runs), AUTOMATICALLY (30 runs), MISCELLANEOUS (30 runs), OPPORTUNITIES (30 runs), CIRCUMSTANCES (30 runs), ORGANIZATIONS (28 runs), ENVIRONMENTAL (25 runs). used_word_exhaustion.csv contains only actual zero cases and names the used matches; raw archives preserve all earlier choices. Additional distinct valid answers could help; another clue for the same canonical answer cannot.

| Full matching canonical answers before consumption | Exhaustion zero observations | Runs affected |
|---|---:|---:|
| 1 | 15300 | 69 |
| 2 | 8 | 5 |
| 3 | 0 | 0 |

## Configuration assessment

**13 AR→EN:** observed zero constraints involve lengths 3, 4, 5, 6, 7, 8, 9, 10, 11, 13. Full approved index: 2417 distinct eligible answers. These are observed pattern lengths, not recommended quotas.
**11 AR→EN:** observed zero constraints involve lengths 3, 4, 5, 6, 7, 8, 9, 10, 11. Full approved index: 2373 distinct eligible answers. These are observed pattern lengths, not recommended quotas.
**13 EN→AR:** observed zero constraints involve lengths 2, 3, 4, 5, 7, 8. Full approved index: 4770 distinct eligible answers. These are observed pattern lengths, not recommended quotas.
**11 EN→AR:** observed zero constraints involve lengths 2, 3, 4, 5, 6, 7, 8, 9. Full approved index: 4665 distinct eligible answers. These are observed pattern lengths, not recommended quotas.
**9 EN→AR:** observed zero constraints involve lengths 2, 3, 5, 6, 9. Full approved index: 4357 distinct eligible answers. These are observed pattern lengths, not recommended quotas.

**13×13 AR→EN remains 0%:** all 30 failed calls contain unsupported crossing domains and used-word exhaustion, with no API sampling loss. Repeatedly consumed full-grid answers indicate limited distinct alternatives for the chosen crossing states. **11×11 AR→EN remains 26.7%:** all 22 failed calls likewise have full-set gaps and exhaustion, without API loss. No trace proves that every alternative search branch is unsatisfiable.

**13×13 EN→AR remains 50%:** the observed zeros are predominantly used-word exhaustion, with true gaps and sample loss also present. **11×11 EN→AR remains 63.3%:** 193 captured zeros lack full-set support and 69 lose existing approved support at the API boundary. Dictionary review must not be used to repair those latter cases. No generator/search change is justified solely by these traces.

## Proposed review scope

Ranking first requires A/B actual-zero recurrence in at least two seeds and nonempty support constraints. Weight = configuration priority (13 English=5, 11 English=4, 13 Arabic=3, 11 Arabic=2, 9 Arabic=1) × log2(1+distinct zero seeds) × log2(1+distinct templates) × 1 for A or 0.75 for B. This rewards repeated patterns without treating raw repeated calls as independent evidence.

Only new unresolved headwords from the common reference can enter. Stage3A and Batches001–005, prior deferrals, rejected/dialect relationships and directionally disallowed relationships are excluded. selection_exclusions.json adds **selection-only** name/brand/place/specialist deferrals; no dictionary classifications changed. Lexical words that also resemble names, such as LANCE, MESA and ATLAS, remain candidates. Learner score =100+80/(1+original dictionary index/2000); a reference Arabic form matching an existing relationship adds a 5% selection multiplier. These are disclosed proxies, not semantic or MSA judgments.

A greedy weighted-cover score multiplies newly covered domain weight by learner score and the reference-agreement hint. Already covered domains receive no further marginal credit. Stop at the first prefix covering 90% of **reachable weighted needs**. This is a review-cost planning threshold, not a proven optimum or a promise of approval/generation success.

**Propose 67 headwords**, from 421 matching eligible headwords. They potentially cover 788/924 reachable recurring domains (90.05% weighted coverage). There are 2408 recurring A/B targets overall; 1484 have no candidate in the screened unreviewed reference pool. No blanket quota or 500-word default is used.

| Reachable weighted coverage | Headwords in greedy prefix |
|---|---:|
| 50% | 3 |
| 75% | 14 |
| 80% | 22 |
| 90% | 67 |

| Configuration | Recurring A/B targets | Reachable | Covered by proposed set |
|---|---:|---:|---:|
| 13 AR→EN | 1581 | 711 | 638 |
| 11 AR→EN | 805 | 211 | 150 |
| 13 EN→AR | 5 | 0 | 0 |
| 11 EN→AR | 13 | 2 | 0 |
| 9 EN→AR | 4 | 0 | 0 |

The proposed set is deliberately English-answer focused. It is not expected to repair Arabic residual domains. Only two recurring Arabic targets have screened potential candidates, and their low marginal weight does not place them in this 90% prefix. Do not infer that no Arabic vocabulary exists elsewhere; this is the current unresolved, never-previously-reviewed common-reference pool.

**Exact proposed headwords, in selection order:**

PRACTITIONERS, MODIFICATIONS, INSTITUTIONAL, ATTRACTIONS, NOTIFICATIONS, COMMISSIONERS, DOWNLOADING, ORGANISATIONS, ASSESSMENTS, SOLO, EASE, EURO, AUTHENTIC, ODDS, EARNED, TRIO, YEN, ADVISE, ATLAS, INTAKE, ALIEN, DOSE, EAGLE, RIPE, UTILITIES, INSTITUTION, UNDO, ANTENNA, INVITE, DIETARY, PIXEL, KNEE, ARRANGE, OPERATE, LANCE, MESA, HELPS, ANGEL, OFFICIALS, DISCS, DONATE, MUG, ANNEX, TONGUE, COLOUR, CLOSELY, DEMONSTRATION, SHAVED, EASTER, SPEEDS, TWELVE, AFFORD, INCLUSION, PRAISE, NOTED, RESET, PLENTY, RETRO, YOGA, LOOSE, RANGING, MONITORED, TECHNO, OPENS, MINT, BEANS, LOCATE.

All current unresolved Arabic relationships, natural display text, answer lengths, matched support sets, seed/configuration contribution and score components are in proposed_candidates.csv / .json. No translation decisions or approvals were performed.

## Recommendation

**A — targeted English-answer dictionary review is the main next step.** Targeted AR→EN linguistic review of the proposed 67 headwords is the main next step for the two highest-priority English-answer grids. Sampling need not be fixed before that English-focused review: no API pool loss was observed for either English configuration. Investigate Arabic sampling separately before commissioning more Arabic-focused review; existing approved matches should not be replaced by needless dictionary work.

No counterfactual full-pool solver experiment was run. Branch-domain counts cannot identify what fraction of entire puzzles a sampling or dictionary change would rescue. Used-word exhaustion also depends on earlier search choices; search efficiency remains a possible joint limitation.

Before additional Arabic-focused review, investigate measured API losses using existing approved records. For the English proposal, linguistic quality remains the approval gate; if a candidate’s existing translation is wrong, leave it unresolved. Do not invent replacements to satisfy these domain estimates.

## Artifacts and reproduction

Required CSVs provide ranked domains, per-run failure classifications, sampling losses, exhaustion cases and proposals. observations.jsonl.gz is the lossless detailed classification archive; traces/*.json.gz retain every captured original observation, used-word list, template and candidate window. Compression avoids committing duplicate hundred-megabyte text files. Failure classification totals are not independent run counts.

```sh
npm run bench:residual
node scripts/dictionary-residual-analysis.ts
node scripts/dictionary-residual-report.mjs
npm run dictionary:audit
npm test
npm run lint
npm run build
```

Use Node 24 and installed dependencies. Preserve the current trace archive when experimenting: deadline-sensitive diagnostics may differ despite identical seeds. The report validates protected dictionary/generator hashes and refuses changed archived trace hashes. Sampling and selection decisions are reproducible from the frozen inputs and observations. Checks are recorded separately in checks.json.
