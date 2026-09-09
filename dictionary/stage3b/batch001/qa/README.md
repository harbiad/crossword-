# Batch 001 quality-assurance review

**Do not scale the original methodology to Batch 002 yet.** The sample confirms useful approvals, but finds systematic reverse-clue overrestriction, inconsistent inflection treatment, and register uncertainty being used for orthographic uncertainty. Targeted follow-up QA of the revised rules and remaining unsampled cases is needed before proceeding.

This is a fresh AI-assisted second pass by the same assistant, with targeted external dictionary checks. It is **not independent human certification or a blinded second-reviewer experiment**. Pair-only output was examined first, then original metadata and collision reasons were compared. The independent reasoning is recorded for every sampled relationship in `review-notes.txt` and `reviews.json`; agreement is never inferred merely from agreement with the 10k reference.

## Reproducible sample

Seed: `stage3b-batch001-qa-v1`. `selection.json` pins the original 1,526-decision manifest by SHA-256. `sample-baseline.json` retains the exact 150 original sampled decisions; neither the Batch 001 manifest nor its reports are overwritten.

Within each stratum, sort eligible unselected relationships by SHA-256 of `seed|stratum|headwordIndex:translationIndex`, then take the required count. Resolve strata in the following order, excluding earlier selections. This creates 150 distinct relationships, not 150 draws with duplicates:

| Stratum | Draws |
|---|---:|
| Random approved | 40 |
| Random rejected | 20 |
| Random review | 20 |
| Approved with reverse restriction | 30 |
| Positive reverse preference | 10 |
| Existing sense label | 10 |
| Reference conflict | 10 |
| Multiword Arabic | 5 |
| Verb/adverb/function-word metadata | 5 |

Across overlapping categories, the sample contains 98 approved, 24 rejected and 28 review relationships; 68 reverse-restricted approvals; 10 positive reverse preferences; 25 sense labels; 21 reference conflicts; and 16 multiword expressions. It covers 133 existing Batch 001 headwords. Nouns dominate, but verbs, adjectives, adverbs, conjunctions, prepositions, a demonstrative and quantifiers are represented. No new headwords were selected or reviewed.

## Findings and revised rules

1. **A dictionary collision is a review hint, not an automatic exclusion.** Check that each competitor is a legitimate ordinary English sense, not a name (IF/LOU, WEB/WEBB), incorrect inflection (PRICE/PRICED), or contaminated translation. Do not certify the competitor merely because it is stored in the dictionary.
2. **Consider the actual crossword constraint: answer length.** Different-length alternatives are often disambiguated by the slot. Same-length genuine alternatives such as SIGN/MARK, UNDER/BELOW and THREAD/STRING deserve more caution. Length is evidence, not an automatic approval rule; dominant sense, POS and learner expectations still matter.
3. **An absent collision does not establish fairness.** SOURCE/مصدر can compete with ORIGIN, also six letters. The positive SOURCE reverse preference was revoked. HOTELS/فنادق versus MOTELS is a medium-confidence concern, recorded for follow-up without changing it automatically.
4. **Separate linguistic register from orthographic quality.** Missing hamza in an otherwise recognizable standard form is not evidence of dialect or unknown register. Keep spelling review while recording MSA where confident. Conversely, YOU/انتي cannot confidently be diagnosed as dialect solely from this spelling; it might be a misspelling of أنتِ. That rejection was changed to review, with its directional exclusions retained.
5. **Define and apply one verb-form convention before the next batch.** An unqualified lemma, a person-marked finite form and a verbal noun are not interchangeable. SAY/نقول is held for review. SET/ضبط needed a verb POS and equipment-adjustment sense, not noun/adjustment metadata. POS must identify the English sense paired with the Arabic rendering; explicit inflection belongs in review notes until the schema supports it cleanly.
6. **Apply noun-number and adjective-agreement decisions consistently.** Singular SCHOOL versus plural المدارس remains a mismatch under the present convention. NEW/جدد is a legitimate masculine plural adjective alternative, consistent with accepting feminine adjective alternatives elsewhere, and is restored to approved.
7. **A multiword or narrower expression can represent a legitimate lexical sense.** CART has a US shopping-cart sense; GALLERY can be a picture collection/display. Both relationships were restored with sense labels. A public-library subtype or a possessive OWN construction was moved from categorical rejection to review, not automatically approved. Arbitrarily added content remains different: LIFE/حياته adds a possessive, and ACTION/الإجراء المتخذ adds “taken”.
8. **Check concept boundaries rather than relying on common loose usage.** WEB/شبكة الإنترنت conflates the Web with the Internet and is held for review; the existing correct Web borrowing is preserved.
9. **Audit fallback choices at the headword level.** Restricting SOURCE/مصدر does not exclude the unsampled definite variant المصدر, which compatibility mode may still choose. This QA intentionally does not propagate changes beyond the sample. A same-sense alternative must be examined before claiming an ambiguity is eliminated from production.
10. **Keep correctness, preference and eligibility conceptually separate.** The current API treats false as direction-specific exclusion; unset remains eligible. This QA removes 12 demonstrably unsupported hard exclusions by unsetting the flag, without inventing 12 positive preference certifications. Future shared-expression checks should generate review candidates, never blanket false assignments. No bulk lifting of the unsampled restrictions was performed.

These rules supersede the original mechanical reverse-restriction methodology for future work. Compatibility mode remains explicit. No strict-only switch, solver/UI changes, CEFR assignments, new translations or Batch 002 work occurred.

## Evidence

The review combines Arabic/English grammatical judgment with targeted primary-source checks, not 150 externally certified translations. Source URLs are attached only to decisions where consulted. Failed page fetches were not treated as full-document verification; the gallery finding also used the publisher's indexed definition of a photo collection.

- [Cambridge: cart](https://dictionary.cambridge.org/us/dictionary/english-arabic/cart): supports a US shopping-cart sense.
- [Cambridge: gallery](https://dictionary.cambridge.org/us/dictionary/english/gallery): supports a picture collection/display sense, including online collections.
- [Cambridge: set](https://dictionary.cambridge.org/dictionary/english-arabic/set): distinguishes the equipment-setting verb from noun senses.
- [Cambridge: library](https://dictionary.cambridge.org/us/dictionary/english-arabic/library): supports the ordinary library equivalent.
- [Cambridge: source](https://dictionary.cambridge.org/us/dictionary/english-arabic/source) and [Arabic Academy: مصدر](https://www.arabicacademy.gov.eg/ar/محرك-البحث/معجم/dic-19/المَصْدَرُ): inform the source/origin ambiguity judgment; the restriction remains a QA judgment, not a source's crossword recommendation.
- [Arabic Academy: فلس](https://www.arabicacademy.gov.eg/ar/محرك-البحث/معجم/dic-19/فلس): supports the currency-unit basis of فلوس; does not certify every colloquial money use as MSA.
- [W3C help](https://www.w3.org/help/) and [MDN: World Wide Web](https://developer.mozilla.org/en-US/docs/Glossary/World_Wide_Web): distinguish the Web from its Internet infrastructure.

## Outputs, corrections and reproducibility

- `sample.csv`: all 150 original decisions, fresh judgments, rationales, sources and proposed changes.
- `disagreements.csv`: **every proposed field change**, including medium-confidence disagreements; 81 relationships have at least one disagreement.
- `corrections.csv`: 61 applied high-confidence metadata changes across 46 relationships, with exact original/new values. Empty optional values mean the flag was removed, not changed to true.
- `reverse_direction_audit.csv`: every sampled relationship with an original reverse flag. Four-way ambiguity classifications apply only to originally approved restricted relationships; rejected-data exclusions are not ambiguity judgments.
- `summary.json`: exact denominators, counts, before/after data and progression gate.
- `reviews.json`: frozen QA decisions, edited separately from the original Batch 001 manifest.

Run `npm run dictionary:qa3b` to regenerate the QA reports and `api/_lib/dictionary.stage3b.qa.generated.ts`. Production imports this QA snapshot. `npm run dictionary:audit` verifies all earlier stages and the QA layer, including deterministic sample and baseline hashes. Medium/low-confidence changes cannot be applied; stale/out-of-sample or unlogged changes fail validation.

No Arabic strings changed. All 29,467 relationships and 16,018 headwords are preserved, including many-to-many relationships. All Stage 1/2/3A and original Batch 001 datasets and decision reports remain unchanged. The 35 medium-confidence proposals are visible but unapplied.

## How to interpret the metrics

These are descriptive agreement rates against the **pre-correction** baseline. They are not estimates of whole-dictionary accuracy: the sample deliberately oversamples risk categories and observations within a headword are correlated. No confidence interval or population error estimate is claimed.

Approval/rejection/review denominators use original status. POS and sense denominators include only originally populated fields. EN preference agreement includes all originally assigned true/false flags; the separate positive-only metric is 39/39. Reverse-restriction agreement includes 68 originally approved restricted relationships; “clearly” and “probably justified” both count as agreement. Medium-confidence disagreements count against agreement even though no correction is applied. Register agreement includes all 150 records. The reverse-positive metric is separately 8/10.

| Metric | Agreement | Rate |
|---|---:|---:|
| approvalAgreement | 96/98 | 97.96% |
| rejectionAgreement | 19/24 | 79.17% |
| unresolvedAgreement | 27/28 | 96.43% |
| enPreferenceAgreement | 61/63 | 96.83% |
| enPositivePreferenceAgreement | 39/39 | 100% |
| arRestrictionAgreement | 22/68 | 32.35% |
| arPositivePreferenceAgreement | 8/10 | 80% |
| posAgreement | 96/98 | 97.96% |
| senseLabelAgreement | 24/25 | 96% |
| registerAgreement | 126/150 | 84% |

Reverse restrictions: **16 clearly justified, 6 probably justified, 34 probably too restrictive, 12 clearly too restrictive**. Thus 46/68 (67.65%) are judged too restrictive, but only the 12 high-confidence cases are changed. This does not establish that 67.65% of all 682 restrictions are wrong. FEATURES/المميزات stays restricted: FEATURES and BENEFITS are both eight letters, providing a better justification than the original inflection-only collision list.

Applied changes: 8 status, 24 register, 5 POS, 3 sense and 21 directional-field changes. Four serious status errors are listed in `summary.json`; spelling/register conflation and directional issues are separate categories.

| Whole-dictionary relationship status | Before QA | After QA |
|---|---:|---:|
| approved | 1,223 | 1,224 |
| review | 27,861 | 27,865 |
| rejected | 383 | 378 |

Batch 001 after QA: 1,075 approved, 380 review, 71 rejected. Preferred EN→AR: 454; preferred AR→EN: 61; approved reverse restrictions: 671.

**Batch 002 gate: not ready to proceed under the old methodology.** Validate the revised direction and verb/POS rules through targeted follow-up, and assess the remaining flagged restrictions and compatibility fallbacks before scaling. This task does not perform that additional linguistic review.
