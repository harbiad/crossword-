# Stage 2: classification and mechanical cleanup

The stage-one snapshot `api/_lib/dictionary.generated.ts` remains unchanged. Stage 2 produces `api/_lib/dictionary.stage2.generated.ts`, now used by `/api/generate` with the explicit `compatibility` policy. No translations are generated or retranslated. No CEFR levels, parts of speech, senses, or directional preferences are assigned.

Run `npm run dictionary:cleanup` to regenerate stage-two data, provenance and queues. Run `npm run dictionary:audit` to check both the stage-one migration and exact deterministic stage-two output. Auditing fails if data, reports, queues or source relationships differ unexpectedly. Review generated changes before committing. Regeneration uses local frozen rules and never calls AI or the network.

## Results

| Metric | Count |
|---|---:|
| Original / current headwords | 16,018 / 16,018 |
| Original / current relationships | 29,526 / 29,467 |
| Explicit duplicate consolidations | 59 |
| Unexplained missing/changed grid relationships | 0 |
| Headwords approved / review / rejected / unset | 0 / 16,018 / 0 / 0 |
| Relationships approved / review / rejected / unset | 0 / 29,462 / 5 / 0 |
| Relationships MSA / dialect / uncertain | 5 / 5 / 29,457 |
| Immediately repeated-word reviews | 254 |
| Abbreviation/acronym candidates | 215 |
| Clear abbreviation/acronym / likely normal word / uncertain | 12 / 56 / 147 |
| Proper-name candidates (distinct headwords) | 32 |
| Brand/place candidates (distinct headwords combined) | 25 |
| Suspicious transliteration relationships | 2,043 |
| Article-variant groups | 5,405 |
| Multiword translations | 1,521 |
| Headwords with alternative meanings | 8,038 |
| Shared-phrase direction-ambiguity groups | 5,251 |
| Latin-in-Arabic / noisy-English flags | 0 / 0 |
| Relationships with English or Arabic answer over 13 cells | 458 |
| Parenthetical/editorial-note flags | 41 |
| Other possibly malformed Arabic flags | 19 |
| Possible dialect cases retained for review | 3 |
| Priority 1 / 2 / 3 queue rows | 340 / 2,537 / 48,619 |
| Metadata action records | 45,485 |
| Invented/replaced translation text / CEFR assignments | 0 / 0 |

Queue counts overlap: one relationship may have multiple flags. Heuristics are not comprehensive linguistic certification. Names, places and brands use small explicit spelling lists; homonymous common nouns remain eligible. Consonant-skeleton transliteration matching is only a review hint and may flag legitimate loanwords. English uppercase spelling alone is never used as acronym evidence.

## Every automatic action

1. **59 duplicate consolidations:** only within one English headword, with identical normalized grid form and identical original non-Arabic metadata. Distinct senses/status/register/preferences prevent consolidation. First display wins, except that an already-existing spaced form is retained over a concatenated form. All original strings and source references remain in the consolidation log and unchanged source. No merging across English headwords occurs.
2. **16,018 headword metadata updates:** unset status becomes `review`; CEFR is represented as `null`. No headwords are rejected or approved automatically.
3. **29,467 retained relationship metadata updates:** unspecified status becomes `review`, and unspecified register becomes `uncertain`, except for the explicit evidence table below. No relationship is approved automatically. An MSA register classification is not a translation/sense approval.
4. **Five relationship-specific dialect rejections:** NOT→مش; HOW→ازاي; HOW→شلون; WHY→ليش; BECAUSE→عشان. They remain in the dataset as `status: rejected`, `register: dialect`, but are excluded from both production modes. Other occurrences of dialect-like spellings are not rejected without sense evidence.
5. **Five MSA register classifications:** BOOK→كتاب and BOOK→الكتاب (Arabic dictionary evidence); PROPERLY→بشكل صحيح, FOR→من أجل, and PERCENTAGE→النسبة المئوية (the user’s explicit valid examples). All five remain `status: review`.

One consolidation changes the chosen Arabic display for NOTHING from the existing concatenated `لاشيء` record to the existing natural `لا شيء` record. Its grid form is unchanged; this is a recorded representative selection, not a newly written translation. Other consolidations retain the first display. Every survivor's text is copied exactly from a source record. The multiword count remains 1,521.

The full [report](stage2/report.json) records every consolidation, every metadata update with old/new values and reason, and a one-to-one source lineage entry for all 29,526 original relationships. IDs such as `h1042:t1` mean zero-based headword and translation positions in the immutable stage-one snapshot. Source/rule SHA-256 hashes identify the input and evidence tables. Consolidated source IDs point to the retained source ID and output coordinates; rejected relationships still have output coordinates.

## Review files

- [Priority 1](stage2/priority-1.csv): repeated/malformed Arabic, confirmed or possible dialect, and the consolidation log entries. Repetition suggestions only remove immediate repetitions and are NOT applied.
- [Priority 2](stage2/priority-2.csv): abbreviation categories, acronym/name/place/brand hints, transliterations, Latin letters and editorial notes. Dataset membership never automatically rejects a lexical word.
- [Priority 3](stage2/priority-3.csv): article variants, alternative meanings, direction ambiguity, preferred-form review, unverified translations and answer lengths. Valid multiword phrases remain unchanged.

CSV files have UTF-8 BOMs, quoted fields, stable source references and explicit reasons. Reviewers can filter/group them without editing the large production object. This stage exports review queues; importing human approval decisions is a subsequent workflow, not automatic approval based on these flags.

## Production compatibility and strict mode

Both policies exclude rejected headwords, rejected relationships and `register: dialect`. Compatibility explicitly permits review/unset/uncertain data while retaining those labels. It currently permits 16,018 headwords and 29,462 relationships before the existing candidate eligibility and deduplication rules. The API still applies its existing English length eligibility, first eligible Arabic clue selection for AR→EN, candidate limit, CEFR tiers/fallback and runtime normalization.

Strict `approved-only` additionally requires approved headword AND relationship status and MSA register. **It currently yields zero headwords and zero relationships**, so enabling it would prevent all puzzle generation. It is not enabled. The existing API tests verify 2,000 returned candidates for both modes at all four sizes and all three bands; this does not claim a fresh solver reliability benchmark.

Excluded first meanings fall through to the next eligible meaning: HOW now uses كيف and WHY uses لماذا as their Arabic clues. Those are existing translations, not replacements written by this task. Normalization, inversion, solver algorithms, UI, cursor behavior, and CEFR selection logic are unchanged.

## Evidence and limits

Rules are versioned in `scripts/stage2-rules.ts`. The exact relationship/sense is part of each dialect rule: MESH→مش remains uncertain/review because negation evidence does not establish its intended sense. SHAW→شو and HECK→هيك likewise remain uncertain/review.

- [مش: Egyptian Arabic negation](https://en.wiktionary.org/wiki/مش#Egyptian_Arabic)
- [ازاي: Egyptian Arabic](https://en.wiktionary.org/wiki/ازاي#Egyptian_Arabic)
- [شلون: Gulf/North Levantine Arabic](https://en.wiktionary.org/wiki/شلون)
- [ليش: University of Arkansas Levantine Arabic textbook](https://uark.pressbooks.pub/levantinecolloquialarabic/chapter/6-4-grammar-2-asking-why-ليش/)
- [عشان: dialectal because/in-order-to senses](https://en.wiktionary.org/wiki/عشان)
- [كتاب: Arabic dictionary entry](https://en.wiktionary.org/wiki/كتاب#Arabic)

These sources support the small explicit classifications, not broad automated approval. Existing datasets provide abbreviation membership; lexical/name/brand/place hints are review-only and never cause automatic rejection.
