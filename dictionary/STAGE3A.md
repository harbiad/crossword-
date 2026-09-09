# Stage 3A: bounded high-priority linguistic review

Reviewed **706 relationships across 544 headwords**, drawn from the requested Stage 2 categories. No broad transliteration or Stage 3B review was performed. **28,761 relationships are byte-for-byte unchanged.** Stages 1 and 2 remain separate immutable inputs. All decisions are explicitly labelled AI-assisted; medium/low confidence means unchanged text and review status, not verified correctness.

## Reproduce and inspect

`npm run dictionary:review3a` applies the explicit decision manifest to Stage 2 and regenerates outputs. It does not call AI or infer corrections from heuristics. `npm run dictionary:audit` checks Stages 1, 2 and 3A, including exact reproduction of all output files.

- [Decision manifest](stage3a/decisions.json): explicit reviewed input, matched by stable source ID AND original English/Arabic values.
- [Every decision (CSV)](stage3a/decisions.csv): confidence, original/proposed/final text, applied flag, status/register before and after, reason, sources, and before/after derived grid forms.
- [Applied corrections](stage3a/corrected.csv).
- [Rejected relationships](stage3a/rejected.csv): records are preserved, not deleted.
- [Unresolved cases](stage3a/unresolved.csv): proposals are not applied.
- [Headword status actions](stage3a/headwords.csv).
- [Before/after counts and reason totals](stage3a/report.json).

Production uses `api/_lib/dictionary.stage3a.generated.ts`. Reviewers edit the small decision manifest or prepare decisions from the CSV, rather than manually editing the giant generated dictionary. The applier rejects duplicate/out-of-scope/stale/missing decisions, medium/low-confidence edits or exclusions, approval without MSA, and reversal of prior rejections.

## Counts

| Metric | Before | After |
|---|---:|---:|
| Headwords | 16018 | 16018 |
| Relationships | 29467 | 29467 |
| Displays containing whitespace | 1521 | 1488 |
| Compatibility-eligible relationships | 29462 | 29160 |
| Strict-approved eligible relationships | 0 | 93 |
| Headwords: approved | 0 | 53 |
| Headwords: review | 16018 | 15870 |
| Headwords: rejected | 0 | 95 |
| Relationships: approved | 0 | 149 |
| Relationships: review | 29462 | 29011 |
| Relationships: rejected | 5 | 307 |
| Register: msa | 5 | 266 |
| Register: dialect | 5 | 7 |
| Register: uncertain | 29457 | 29194 |

Review outcome: **149 approved / 250 unresolved review / 307 rejected**. Rejections include the five Stage 2 dialect rejections, which remain rejected. Two additional SAW relationships (شاف and شفت) are classified dialect/rejected; no replacement is written for either.

All 16,018 headwords and 29,467 relationships remain present, in the same order and with the same relationship coordinates. Stage 2’s 59 consolidations remain intact. No new merges or deletions occur. Rejected malformed duplicates remain inspectable and cannot enter generation; where a valid counterpart already exists, it is left unchanged rather than silently approved or duplicated.

Headword status changes only when every relationship under that headword was individually reviewed at high confidence. Entirely approved heads become approved; heads whose relationships are all explicitly excluded name/brand/abbreviation senses become rejected. A bad translation alone does not make an ordinary English headword invalid. Partial reviews never approve or reject the whole headword.

## Applied text corrections

Every replacement below is explicitly high-confidence in the manifest. Unapplied proposals remain in the decision CSV. No repetition is removed by a blanket runtime rule.

| Source | English | Original | Applied display | Reason |
|---|---|---|---|---|
| h91:t0 | THAN | من... | من | editorial-residue |
| h1468:t5 | PLANT | مصنع مصنع | مصنع | accidental-repetition |
| h2660:t0 | PROPER | السليم السليم | السليم | accidental-repetition |
| h2771:t2 | REASONABLE | معقول معقول | معقول | accidental-repetition |
| h2916:t1 | KILL | قتل قتل | قتل | accidental-repetition |
| h3147:t1 | GUN | بندقية بندقية | بندقية | accidental-repetition |
| h3257:t0 | OUTLET | منفذ منفذ | منفذ | accidental-repetition |
| h3903:t3 | ALARM | إنذار إنذار | إنذار | accidental-repetition |
| h4244:t0 | VENTURE | مشروع مشروع | مشروع | accidental-repetition |
| h4321:t1 | EAR | الأذن الأذن | الأذن | accidental-repetition |
| h4551:t0 | INDOOR | داخلي داخلي | داخلي | accidental-repetition |
| h4600:t1 | MILL | مطحنة مطحنة | مطحنة | accidental-repetition |
| h4655:t0 | RECORDER | مسجل مسجل | مسجل | accidental-repetition |
| h4714:t0 | PAD | وسادة وسادة | وسادة | accidental-repetition |
| h5301:t2 | ISLAM | الإسلام” | الإسلام | editorial-residue |
| h5329:t0 | ACUTE | حاد حاد | حاد | accidental-repetition |
| h5449:t1 | PLANNER | مخطط مخطط | مخطط | accidental-repetition |
| h5538:t0 | SPECTACULAR | مذهلة مذهلة | مذهلة | accidental-repetition |
| h5648:t0 | SUCKING | مص مص | مص | accidental-repetition |
| h5862:t0 | AUTOS | السيارات السيارات | السيارات | accidental-repetition |
| h6044:t0 | STREAMING | تدفق تدفق | تدفق | accidental-repetition |
| h6182:t2 | STRAIN | سلالة سلالة | سلالة | accidental-repetition |
| h6768:t2 | BRICK | الطوب الطوب | الطوب | accidental-repetition |
| h6841:t0 | BIZARRE | غريب غريب | غريب | accidental-repetition |
| h7528:t1 | DEEPER | أعمق أعمق | أعمق | accidental-repetition |
| h7716:t1 | BIND | ربط ربط | ربط | accidental-repetition |
| h8201:t0 | COATING | طلاء طلاء | طلاء | accidental-repetition |
| h8267:t0 | ADAPTOR | محول محول | محول | accidental-repetition |
| h8589:t2 | NEEDLE | إبرة إبرة | إبرة | accidental-repetition |
| h8853:t0 | LOCKING | قفل قفل | قفل | accidental-repetition |
| h214:t1 | DID | فعل (ماضي) | فعل | editorial-note |
| h1434:t0 | ADS | الاعلانات | الإعلانات | orthography |
| h1434:t1 | ADS | اعلانات | إعلانات | orthography |
| h1605:t0 | SAW | راى | رأى | orthography |
| h1727:t2 | CUP | كاس | كأس | orthography |
| h1727:t3 | CUP | الكاس | الكأس | orthography |
| h7162:t0 | AYE | نعم (رسمي) | نعم | editorial-note |
| h8375:t0 | ATE | أكل (ماضي) | أكل | editorial-note |
| h12829:t1 | DUG | حفر (ماضي) | حفر | editorial-note |
| h15210:t0 | ERE | قبل (شاعري) | قبل | editorial-note |

## Rejections and unresolved work

| Rejection reason | Relationships |
|---|---:|
| wrong-or-foreign-relation | 7 |
| dialect | 7 |
| personal-or-geographic-name | 103 |
| redundant-repetition | 91 |
| geographic-name | 39 |
| unusable-lexical-rendering | 2 |
| brand-product | 12 |
| personal-name | 4 |
| redundant-editorial-residue | 1 |
| abbreviation-initialism | 41 |

| Unresolved reason | Relationships |
|---|---:|
| unresolved-sense | 226 |
| meaningful-repetition | 4 |
| wrong-or-incomplete-sense | 4 |
| register-or-sense-review | 11 |
| lexical-sense-needs-confirmation | 3 |
| orthography-review | 2 |

Meaningful repetition is retained for review: STEP→خطوة خطوة expresses step-by-step distribution, REALLY→حقا حقا may express emphasis, PIECE→قطعة قطعة may be distributive, and BOOM→بوم بوم can be onomatopoeic. FREEWARE→مجانية مجانية needs a software sense, not just token removal; its proposed compound is not applied. Similar context-dependent senses remain unresolved.

## Display, policy and source limits

Valid multiword phrases such as بشكل صحيح, من أجل, and النسبة المئوية remain unchanged. The whitespace-containing display count decreases only through the 40 logged corrections (repetition, editorial labels, stray punctuation and orthography). This is not grid concatenation. The normalization function is unchanged; changed grid forms are an explicit consequence of the logged text corrections and are recorded in the CSV.

Compatibility remains explicit and excludes rejected headwords/relationships and known dialect, while permitting review/uncertain records without relabelling them approved. Only 93 relationships qualify for strict approval across the whole dictionary; that is not a demonstrated reliable pool for all grid sizes, so strict production mode is NOT enabled. Existing API tests still require 2,000 candidates in each size/mode/band. No fresh solver reliability benchmark is claimed.

APPLE fruit and WINDOWS window senses are approved separately from rejected brand renderings. FAX/GEL borrowings are retained as lexical vocabulary. COCA’s botanical sense is retained; the [Cairo Arabic Academy entry](https://www.arabicacademy.gov.eg/ar/محرك-البحث/الكُوكا?exact_search=true) supports it rather than a blanket brand exclusion. Arabic register classifications and text corrections are AI-assisted linguistic judgments, not a claim of exhaustive dictionary certification. Many approvals use ordinary lexical knowledge; external sources are attached where consulted, not invented for every decision.

The additional SAW dialect assessment uses the [شاف entry](https://en.wiktionary.org/wiki/شاف) and its colloquial seeing sense. Prior dialect sources remain in each retained Stage 2 decision. A [Merriam-Webster mound sense of tell](https://www.merriam-webster.com/dictionary/tell) supports caution about TEL-like archaeological terms; that uncertain row remains review. Cambridge pages for GEL/FLU could not be fetched successfully, so no full-page verification is claimed.

No CEFR, sense, part-of-speech, or preferred-direction fields were assigned. Sources, policy scripts, decision manifest and generated data are separate. There are no changes to UI, cursor, inversion, traversal or generation algorithms.
