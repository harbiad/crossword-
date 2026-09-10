# Stage 3B Batch006: the 67 residual-domain candidates

Only the 67 proposed headwords from `../batch006_analysis/proposed_headwords.txt` were reviewed, in the original selection order. Their analysis scores, residual constraint IDs and 11×11/13×13 AR→EN relevance remain in `selection.json`, `selection.csv` and `reviewed_headwords.csv`. There was no new selection or expansion to 500 words. The source is the immutable final Batch005 QA dictionary.

## Linguistic outcome

All **136 current translation relationships** were reviewed explicitly. After a separate 45-relationship QA pass:

- **103 approved / 31 review / 2 rejected** relationships.
- **60 approved / 7 review** headwords; no entire headword rejected solely because its translation was poor.
- **103 newly approved relationships allowed in each direction**; 62 preferred in each direction and 41 allowed but nonpreferred.
- 128 relationships classified MSA, eight uncertain, none classified dialect in this batch.
- 136 relationship-specific POS assignments, five short sense labels and nine naturally spaced multiword relationships.
- Nine supporting-reference conflicts remain documented. Reference agreement and crossword utility never imply approval.

Global totals: **16,018 headwords, 29,467 relationships; 5,758 approved, 23,321 review, 388 rejected**. No relationships were added or removed. Arabic source text and grid normalization are unchanged. No CEFR assignments.

All decisions are AI-assisted, explicitly authored in `review-notes.txt` with reasons in `review-details.json`, compiled into a replayable manifest. Approved relationships require high-confidence natural MSA meaning and reasonable learner mappings. Synonyms, case/gender variation and natural finite-verb/verbal-noun differences do not cause exclusion. Borrowing/register uncertainty, spelling issues and unclear constructions remain review cases; no new translations are invented to satisfy a domain.

The two rejected relationships received separate high-confidence second checks: **ANGEL→انجيل** expresses the Gospel rather than an angel; **PRAISE→ماشاء** is an incomplete expression rather than a usable praise equivalent. The records and original Arabic remain preserved. Name-like or unclear forms under LANCE, MESA, MINT and ANGEL are not silently converted into new meanings. LANCE, MESA, EAGLE, INTAKE, AFFORD, RETRO and TECHNO remain entirely unresolved rather than being approved for their repair scores.

QA corrected one field: INVITE→الدعوة POS changed from verb to noun. No QA text, status, register, allowance or preference changes. See `qa/` for every independent-pass verdict and the original-versus-revised comparison. This is targeted same-assistant QA, not independent-human certification. Status/register/directional agreements are 100%; POS is 97.78%; sense agreement is 3/3, a small denominator.

## Data and production safeguards

The original decision dataset and QA dataset are separate generated artifacts. Replay helpers now accept an explicit batch/sample size, retaining their existing defaults for older 500-headword/100-QA stages. The Batch006 wrapper enforces exactly 67 headwords and 45 QA cases. Existing stages retain identical data and decisions.

The API advances to the Batch006 QA dataset with **compatibility still explicitly enabled**. Rejected relationships and explicit directional disallowances remain excluded. Preference false does not exclude an otherwise allowed relationship. Generator, candidate sampling, time limits, templates, inversion, cursor and UI behavior are unchanged.

The historical residual-analysis test continues to verify its frozen dictionary and generator inputs. Its old API import hash is a measurement checkpoint, not a requirement to keep using an outdated production dictionary; the current API is separately checked for explicit compatibility behavior.

## Measurement and reproduction

The approved-only benchmark uses the same eight size/mode configurations, thirty seeds (1–30), seed-0 warmup, advanced band and production candidate limits as Batch005. It checks returned-puzzle structural validity, canonical traversal, eligibility and source provenance. The semantic dictionary snapshot and unchanged runtime hashes are verified in the comparison report.

The same 788 frozen recurring target domains are matched against the full size-specific approved indexes before and after review. This measures distinct canonical support, not merely translation counts and not guaranteed puzzle solutions. Remaining failed calls across all eight configurations receive the same per-attempt bounded observer as the pre-review analysis. Zero/exhaustion/small-domain counts are search observations, not independent causal puzzle-failure percentages; comparing different numbers of failed calls requires caution.

```sh
npm run dictionary:batch006
npm run dictionary:audit
APPROVED_BENCH_POLICY=approved-only APPROVED_BENCH_OUTPUT=dictionary/stage3b/batch006/generation npm run bench:approved
npm run bench:batch006:domains
BATCH006_DIAGNOSTIC_BASELINE_CONTROLS=1 npm run bench:batch006:domains
node scripts/dictionary-batch006-domains.ts
node scripts/dictionary-batch006-containment.ts
node scripts/dictionary-batch006-report.mjs
npm test
npm run lint
npm run build
```

See `GENERATION_COMPARISON.md` for the measured outcome and whether another batch is justified. No Batch007 has started, and approved-only production is not enabled.

## Measurement conclusion

769 of 788 targeted domains improved (141/150 for 11×11 and 628/638 for 13×13), but every supported target still has only 1–3 distinct answers. Nineteen remain empty. Approved-only AR→EN changed from 26.7% to 23.3% at 11×11 and stayed at 0% at 13×13; 9×9 also regressed from 96.7% to 86.7%. No returned puzzle failed quality validation.

Every English after-pool contains every old answer/clue pair, including the formerly successful seeds that now fail. Those regressions implicate bounded search order/time; the old solutions were not removed. This does not prove that 13×13 has a feasible solution. Fresh English failure traces are dominated by true gaps, and 1,079 of 1,262 recurring true-gap domains have no potential match under the remaining common-reference screen. Do not automatically start Batch007: investigate fixed-pool search ordering and simultaneous feasibility first, without loosening validation.

## Generated representation

Only the new Batch006 artifacts use typed overlays over the immutable Batch005 snapshot (67 changed headwords, then one QA headword). This avoids two redundant full-dictionary TypeScript ASTs, which exceeded Node's default compiler heap. Values, order and semantic SHA-256 are identical to the full snapshots used in the benchmark. No old snapshot, generator algorithm or dictionary relationship was changed by this representation fix. Node reporting scripts install the existing local `.js`→`.ts` resolution hook before dynamically loading these artifacts. The comparison report pins the semantic hash and generator source hashes.
