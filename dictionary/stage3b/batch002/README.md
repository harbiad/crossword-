# Stage 3B Batch 002

This batch uses the [revised Batch 001 methodology](../batch001/methodology/README.md). Production uses `dictionary.stage3b.batch002.qa.generated.ts` with **explicit compatibility mode**. Validity and preference remain separate. No Batch 003 work, CEFR assignments, text rewrites or relationship deletions are included.

## Reproducible selection

Exactly **500 new unresolved headwords**, from SELL (dictionary index 527) through MIDDLE (1080), containing **1,543 relationships**. Candidate ranking is:

1. Exclude all headwords appearing in the frozen Stage 3A or Batch 001 decision manifests, regardless of their current status.
2. Require current headword status `review` and exclude the explicit `deferred.json` selection list.
3. Prefer presence in the tracked `api/english_arabic_10000_v3.csv` reference, then original dictionary index. Take 500; no alphabetical sort. All 500 selected happen to be in the reference.

The deferrals include inherited EBAY/YAHOO/YORK/INFO, geographic names TEXAS/WASHINGTON/CALIFORNIA/FLORIDA/AFRICA, products SONY/LINUX, shortened TECH/PICS/AUTO, and BUSH whose supplied relationship is only a name rendering. Deferral does not reject or modify these records. General technology, civic and financial terms remain eligible when useful in everyday vocabulary; technical subject matter alone is not exclusion.

`selection.json` records every selected index and reference display. `inputs.json` pins source, reference, prior manifests, selection, deferrals and original decisions using SHA-256. The immutable input is the completed `dictionary.stage3b.methodology.generated.ts`, preserving all prior review layers.

## Review and evidence

`review-notes.txt` contains one explicitly authored headword-group review per selected headword, with a code for **every relationship in existing order**, English POS and sense distinctions where useful. There is no default approval or reference-match approval. `review-details.json` adds case-specific reasoning, especially for exclusions and context-sensitive mappings. These compile reproducibly into `decisions.json` / `decisions.csv`, which retain original Arabic, status, register, confidence, both allowance flags, both preferences, POS, sense and reason.

The review is AI-assisted linguistic judgment. The 10k reference supports selection and comparison, not correctness certification. `reference_conflicts.csv` contains **42** cases where the reference supports a normalized-identical relationship this review could not approve. This definition includes unresolved orthography and constructions, not only proven wrong translations.

External checks were limited. The RUN operate sense has [Cambridge support](https://dictionary.cambridge.org/us/dictionary/english-arabic/run). The distinction between percent and percentage is supported by the [NYU bilingual mathematics glossary](https://docs.steinhardt.nyu.edu/pdfs/metrocenter/atn293/suppmath/hs_matha_b_arabic_combined_A-Z.pdf); PERCENT/النسبة المئوية remains unresolved. Attempts to fetch Cambridge entries for career/bar/though returned 403, and were not treated as evidence. No claim is made that all decisions were externally verified.

Allowed MSA alternatives include articles, finite forms, action nouns and gender/case variants where the meaning is natural. Synonyms, different English lengths and multiple senses never independently trigger exclusion. Examples include BANK/مصرف/بنك, CELL prison/biological senses, and WATCH watching/timepiece senses. Spaces remain in كلمة السر, قاعدة بيانات and other multiword displays.

Borrowings without sufficient register evidence remain uncertain/review; informal is not automatically dialect. Clearly colloquial relationships SOMETHING/حاجه, ALWAYS/دايما and CAME/جيت are rejected without replacement. Spelling defects remain review, not silently corrected. Compatibility deliberately retains unresolved/unset records unless explicitly disallowed; this is not approved-MSA certification.

## Batch counts

| Measure | Original Batch 002 | After QA |
|---|---:|---:|
| Headwords | 500 | 500 |
| Relationships | 1,543 | 1,543 |
| Approved relationships | 1,235 | 1,235 |
| Review relationships | 292 | 295 |
| Rejected relationships | 16 | 13 |
| Approved / review / rejected headwords | 484 / 16 / 0 | 484 / 16 / 0 |
| MSA / uncertain / dialect | 1,499 / 41 / 3 | 1,499 / 41 / 3 |
| Allowed EN→AR / AR→EN | 1,235 / 1,235 | 1,235 / 1,235 |
| Preferred EN→AR / AR→EN | 486 / 486 | 486 / 486 |
| Explicit restrictions per direction | 41 | 41 |
| Allowed but nonpreferred AR→EN | 749 | 749 |
| POS assignments | 1,543 | 1,543 |
| Sense assignments | 241 | 244 |
| Multiword displays | 50 | 50 |
| Text corrections | 0 | 0 |

The equal directional totals are outcomes of this review, not a target quota. Every approved relationship was judged valid both ways; uncertain direction judgments remain unset, or explicitly excluded for a clear semantic problem. Preference can later differ by direction without removing eligibility.

All 1,543 selected relationships receive logged metadata decisions; 484 headwords become approved because at least one relationship qualifies. Unsuitable translations never automatically reject a suitable headword. The final 13 rejections comprise 10 wrong/corrupt relationships and 3 dialect relationships. Twenty-eight additional review relationships retain explicit exclusions pending resolution; 267 review relationships have unknown allowances and remain subject to compatibility behavior.

## Entire dictionary before/after

| Measure | Before Batch 002 | After QA |
|---|---:|---:|
| Headwords | 16,018 | 16,018 |
| Relationships | 29,467 | 29,467 |
| Approved relationships | 1,236 | 2,471 |
| Review relationships | 27,871 | 26,623 |
| Rejected relationships | 360 | 373 |
| Approved / review / rejected headwords | 510 / 15,413 / 95 | 994 / 14,929 / 95 |
| MSA / uncertain / dialect | 1,444 / 28,006 / 17 | 2,943 / 26,504 / 20 |

No unexplained losses, new relationships, Arabic display changes, grid-normalization changes or CEFR assignments. All raw/migrated/Stage 2/Stage 3A/Batch 001/QA/methodology sources remain intact.

## Production candidate availability

These are actual advanced candidate-index counts before request pool sampling. AR→EN selects one eligible clue per English headword; EN→AR retains eligible normalized alternatives. Therefore candidate counts differ from master relationship counts.

| Size | Compatibility EN→AR | Compatibility AR→EN | Approved-only EN→AR | Approved-only AR→EN |
|---|---:|---:|---:|---:|
| 7 | 16,397 | 9,829 | 1,784 | 801 |
| 9 | 23,852 | 13,519 | 2,264 | 945 |
| 11 | 27,336 | 15,241 | 2,372 | 983 |
| 13 | 28,597 | 15,796 | 2,407 | 992 |

Before length/index limits, eligibility is 29,045 relationships per direction in compatibility and 2,415 in approved-only. `summary.json` includes full before/after availability. Approved-only remains disabled; these are availability measurements, not generation reliability benchmarks.

## Separate QA layer

See [QA method, agreement and every disagreement](qa/README.md). The original 1,543 decisions and generated Batch 002 snapshot are preserved beneath a distinct 100-relationship QA manifest and generated production snapshot.

QA applied **17 high-confidence field corrections across 16 relationships**: three rejected→review statuses, eleven POS refinements and three sense additions. Existing direction restrictions on the three softened rejections remain in place. Six medium-confidence preference proposals across three relationships remain unapplied. There are 295 unresolved relationships after QA.

The revised direction/register/status policy passed this bounded second pass. POS needs relationship-specific labels rather than carrying all headword POS possibilities; future reviewers should write the sense-specific POS before marking a row complete. Redundancy or possible prepositional composition warrants review unless corruption is clear. Do not replace one blanket rejection rule with another.

**Batch 003 is suitable to proceed only as another bounded review with these lessons and targeted QA.** It has not begun. This is same-assistant validation, not independent human certification or authorization for unattended bulk approval.

## Replay and validation

```sh
npm run dictionary:batch002
npm run dictionary:audit
npm test
npm run lint
npm run build
```

The generator verifies pinned inputs and explicit note coverage, then replays the frozen initial manifest and separate QA manifest. Audit compares every generated report/dataset byte-for-byte. The master decision JSON files are review inputs, never replaced by regeneration. Root CSVs show the original review; `qa/` CSVs and `summary.json` distinguish final effective outcomes.

Tests cover exact selection/exclusions, all-relationship review, preserved source/text/normalization/reverse relationships, independent direction flags, valid-but-nonpreferred candidates, rejected exclusion, high-confidence-only QA, candidate availability and malformed/stale manifests. Production generation, UI, inversion and cursor algorithms were not modified.
