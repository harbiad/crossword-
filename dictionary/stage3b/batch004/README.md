# Stage 3B Batch 004: common vocabulary plus observed coverage

This checkpoint reviews 500 new English headwords and **all 1,307 existing relationships** under them. The immutable input is `api/_lib/dictionary.stage3b.batch003.qa.generated.ts`. Every preceding stage, Arabic display string, relationship position, and CEFR value is preserved. Compatibility remains production policy. No generator, template, validation, normalization, API sampling algorithm or time budget changed.

## Selection, frozen before applying metadata

`selection.json` is the ordered manifest; `selection.csv` exposes every score component and matching pattern. `selection_length_distribution.csv` compares its **input** relationships with Batches 001–003, independently of the later approvals. Candidate selection is reproducible with `selectBatch004` in `scripts/stage3b-batch004.ts`.

Eligible headwords have status `review`, consist of English alphabetic letters, and were never processed in Stage 3A or Batches 001–003. Prior-stage `decisions.json` files establish that exclusion, including headwords previously left unresolved. Frozen `deferred.json` preserves earlier deferrals and adds 22 name/place/brand-dominated headwords; this is prioritization, not rejection or a dictionary classification change.

Score (descending, original dictionary index breaks ties):

- Reference membership: 100 points. All selected headwords belong to the tracked common/10k reference.
- Earlier dictionary order: `80 * (1 - headwordIndex / 16018)` points. This is an order proxy, not a measured corpus frequency.
- English answer length: 18 for length 3; 10 for lengths 7, 9, 11 or 13; otherwise zero. Length 2 has no bonus.
- Arabic grid lengths: 8 if any supplied relationship normalizes to length 2–4.
- Observed zero-domain patterns: `min(12, 3 * EnglishMatches) + min(6, 2 * ArabicMatches)`.

These bounded weights are a documented selection design, not statistically optimized weights or an approval criterion. There are **no length quotas**. Commonness plus an explicit name/brand deferral pass is the learner-value proxy; relationship-level linguistic review can still withhold every translation. We did not infer MSA validity from letter shapes, reference agreement, relationship count, or a useful length.

`diagnostic_patterns.json` contains unique `(mode, pattern)` pairs from `generator_failure_analysis/pattern_domains.csv` where `experiment=baseline`, `policy=approved-only`, and the last `prefixCounts.remaining` equals zero. The same extraction is replayed against the underlying `diagnostic_runs.json` during audit. Repeated observations are deduplicated, not treated as independent frequency evidence. Matching checks either physical orientation of the same canonical string; no reversed dictionary answers are stored. Arabic matching folds hamza forms as the existing client does. This supports selection only: unknown linguistic quality, used-word constraints, API length eligibility and simultaneous crossing constraints can still prevent a puzzle.

`diagnostic_pattern_coverage.csv` contains 179 historical patterns: 147 English and 32 Arabic. Support increases for 36 English and five Arabic patterns. Zero-support English patterns fall from 130 to 105; Arabic from 27 to 22 in the full indexed pool. These are historical samples, not current failure attribution.

`diagnostic_pattern_coverage.csv` measures before/after **unique canonical answers in the approved 13-cell indexed pool**, before API sampling and without used-word exclusions. It is not a claim that the corresponding failed template is now solvable, nor a count of independent solver failures.

English length distribution (headwords):

| Batch | 3 | 7 | 9 | 11 | 13 |
|---|---:|---:|---:|---:|---:|
| 001 | 55 | 59 | 14 | 6 | 1 |
| 002 | 25 | 73 | 32 | 6 | 2 |
| 003 | 16 | 88 | 34 | 16 | 5 |
| 004 | 58 | 198 | 121 | 29 | 18 |

Arabic input relationship lengths 2/3/4 are respectively 48/192/338 (001), 13/160/330 (002), 11/130/282 (003), and 9/146/366 (004). The weighted selection improved short Arabic coverage mainly at lengths 3–4; it did not maximize two-letter forms.

This batch increases useful full-grid and short-word representation substantially; the benchmark, not that distribution alone, determines whether it helped.

## Linguistic decisions and audit trail

The semantic/directional rules remain those in `../batch001/methodology/README.md`, strengthened with the relationship-specific controlled POS and short sense policy in Batch 003. Synonyms, different answer lengths, natural finite-verb/infinitive differences and valid article variants do not themselves justify rejection. Allowed and preferred remain separate. No optional CEFR assignments or speculative new senses were added.

`review-notes.txt` explicitly authors one decision/POS token for **each relationship**, in selection order. It is not a default approval algorithm. Tokens use the existing Batch 003 compiler: P=approved/preferred both, A=approved/allowed but nonpreferred both, C=MSA construction/sense review, O=MSA orthography review, R=uncertain register review, H=review with both directions withheld, X=proposed clear MSA rejection. POS is per relationship. `review-details.json` supplies case-specific reasoning for difficult decisions; expanded identities and reasons appear in `proposals.json` and `decisions.csv`.

All seven proposed rejections received an explicit second pass in `rejection_checks.json`. Six remain rejected: RUSSIAN→روسيا, LEG→القدم, BOOKING→جز, SUGGESTED→رحت, SPANISH→اسبانيا and TIN→تين. SAD→حزن was softened to review because grammatical construction could matter. No Arabic text was altered, no relationship was deleted/added, and no register was newly labeled dialect without evidence. Review is a real unresolved state, not approval.

Initial decisions are preserved in `decisions.json` and `dictionary.stage3b.batch004.generated.ts`. Final production data comes from the separate QA overlay, `dictionary.stage3b.batch004.qa.generated.ts`. Top-level `unresolved.csv` and `rejected.csv` show the initial pass; their `qa/` counterparts show effective final status. `corrections.csv` is empty because there are zero text corrections; QA metadata corrections are in `qa/corrections.csv`.

## Separate targeted QA

See `qa/README.md`. A 100-relationship sample uses SHA-256 ordering with seed `batch004-coverage-qa-v1`. It includes all six rejections, eight reference conflicts, register and unresolved cases, twenty coverage-prioritized reverse approvals, twelve allowed-but-nonpreferred reverse relationships, senses, multiword Arabic, verbs and approved controls. Strata are disjoint; when a category is smaller than its target, all are included and approved controls complete 100. Actual membership/counts are in `qa/summary.json`.

The fresh pass was shown English and Arabic without the earlier status/preference/POS/sense columns. It was performed by the **same assistant**, with conversation memory: this is bounded AI-assisted QA, not blinded external review, source verification, or an independent-human accuracy estimate. The common-word reference is supporting evidence only; 43 reference conflicts remain reported rather than automatically approved.

## Results and reproduction

The generated Batch004 TS files use fully typed 100-headword chunks to avoid a TypeScript `Map maximum size exceeded` failure on the giant array literal. Concatenation preserves the same data/order; historical files and solver behavior are unchanged.

After QA: 481 approved and 19 review headwords; 1,066 approved, 235 review and six rejected relationships. Register: 1,276 MSA and 31 uncertain. Both directions: 1,066 explicitly allowed, 503 preferred, 563 allowed/nonpreferred, 14 explicitly withheld (six rejected plus eight review). The other 227 review relationships have unknown allowance; compatibility explicitly continues to admit otherwise eligible unresolved data. POS: 1,290 assigned and 17 uncertain. Short sense labels: 170. Natural multiword Arabic: 54.

Global totals: **16,018 headwords, 29,467 relationships; 4,628 approved, 24,457 review, 382 rejected**. No unexplained losses. New approvals: 1,066 in each direction. This is relationship availability; AR→EN currently selects one eligible clue per English headword, so extra relationships do not all become distinct English answers.

`summary.json` contains before/after global and batch counts, every change category, and both policies' candidate availability by size/mode. `candidate_availability.csv` exposes the latter. It distinguishes eligible relationships before limits from indexed pairs; indexed Arabic pairs can share a canonical grid answer. Compatibility is intentionally not approved-only.

Commands:

```sh
npm run dictionary:batch004
npm run dictionary:audit
npm test
npm run lint
npm run build
APPROVED_BENCH_POLICY=approved-only APPROVED_BENCH_OUTPUT=dictionary/stage3b/batch004/generation npm run bench:approved
node scripts/dictionary-batch004-report.mjs
```

Immutable dictionary inputs and review manifests are pinned by SHA-256 in `inputs.json`. Benchmark-era generator/API algorithm hashes are separately recorded in `generation/generator_input_hashes.json` and verified by the comparison script; future authorized solver work need not invalidate the historical dictionary audit. Generation/audit replays the frozen first pass, rejection checks and QA overlay; audits compare generated outputs byte-for-byte. Future changes should add another review layer, not rewrite these source decisions.

The generation comparison uses the post-solver-fix/pre-Batch004 baseline in `generator_failure_analysis/after/`, seeds 1–30, one seed-0 warmup per configuration, advanced band, unchanged production candidate limits and solver settings. This is a paired-seed practical sample, not a guarantee across all CEFR bands or devices. Timing uses wall-clock budgets and can vary across runs. `generation/` and `GENERATION_COMPARISON.md` contain the actual measurements, candidate distributions, readiness and Batch005 recommendation. Production stays in compatibility mode regardless of readiness. Batch005 is not started.
