# Stage 3B — Batch 001

**This document and its counts describe the preserved pre-QA baseline.** [QA findings, applied corrections and revised review rules](qa/README.md) now govern the current production snapshot (`dictionary.stage3b.qa.generated.ts`). Do not reuse the original automatic reverse-exclusion method for Batch 002.

This batch reviews exactly **500 English headwords / 1,526 existing relationships**. It is AI-assisted linguistic review, not independent human certification. `decisions.json` is the authoritative, editable decision manifest; `review-notes.txt` preserves first-pass notes, which the final manifest supersedes. No text replacements were applied. No new relationships, consolidation, CEFR assignments or Batch 002 work occurred.

## Reproducible selection

1. Start with the immutable `api/_lib/dictionary.stage3a.generated.ts` snapshot.
2. Require headword status `review` and membership in the tracked `api/english_arabic_10000_v3.csv` reference.
3. Exclude every headword already considered in the Stage 3A decision manifest, preserving those decisions exactly.
4. Defer EBAY and YAHOO (brands), YORK (place), and INFO (abbreviation), explicitly recorded in `deferred.json`.
5. Take the first 500 remaining headwords in original dictionary order, not alphabetical order. This frequency proxy includes everyday web/computer vocabulary; it is not a newly validated frequency ranking or CEFR list.

`selection.json` records every selected source position and reference Arabic. `summary.json` fingerprints the source, reference, selection and decisions. The audit recomputes selection and all outputs; it fails on drift. The reference supports selection and conflict detection, never automatic approval. Other local quality-check CSVs are not inputs.

## Review decisions

All relationships within the selected headwords were considered together. Existing clear MSA equivalents were explicitly selected. Definite/indefinite and grammatical-gender variants remain separate; distinct senses are labelled where needed (e.g. PARTY political organization / celebration, TABLE furniture / tabulated information). Noun and verb senses are identified where reasonably clear. Ambiguous tense/person, missing hamza, uncertain loanword spelling and context-dependent phrases remain review. A standard Arabic expression can be rejected for semantic mismatch while retaining `register: msa`.

Multiword translations remain unchanged, including `من أجل`, `مرة أخرى` and the untouched `بشكل صحيح`. No dialect expression was converted to MSA. Uncertain data remains in the dataset. An unsuitable translation never causes rejection of an otherwise ordinary English headword.

Every decision records original text, status, register, reason, confidence, optional POS/sense/preferences, and whether a text change was applied. The CSV also records source coordinates, prior status/register, and before/after grid forms. `corrections.csv` contains a header only because no text was corrected.

## Directional policy

- `preferredForEnToAr: true`: reviewer chose the first preferred equivalent for that headword. Valid alternatives remain unset and available.
- `preferredForArToEn: true`: positive reviewer choice with no shared-expression conflict identified in the existing compatibility pool.
- `false`: exclude **only that direction** from candidates. Rejected relationships are excluded in both directions regardless of preferences.
- Unset means no positive suitability certification. It remains eligible under compatibility; approved-only additionally requires approved headword, approved relationship and MSA, but does not require a preference flag.

A conservative mechanical second check flags reviewed approved Arabic expressions shared by other eligible English headwords. It ignores article, punctuation and diacritics **for review comparison only**. These relationships receive `preferredForArToEn: false`; EN→AR remains available. The exact other headwords and restriction reason are recorded in each decision. This check is a potential ambiguity screen, not endorsement of the other headwords' translations. Some restrictions may later be relaxed by human review or sense-qualified clues. The 682 restrictions are reported separately from semantic rejections.

Preferred eligible relationships are stably placed before alternatives in API preparation. No global translations are merged; the reverse index remains many-to-many. The API keeps its existing single-clue-per-English selection in AR→EN, so indexed candidate count can be smaller than the eligible relationship count.

## Reports and commands

- `reviewed_headwords.csv`: all 500 headword decisions and source/reference coordinates.
- `decisions.csv` / `decisions.json`: every relationship decision.
- `unresolved.csv`: 376 relationships requiring further review.
- `rejected.csv`: 76 rejected relationships, with reasons.
- `reference_conflicts.csv`: 87 reference-supported relationships not certified in this review; includes uncertainty, not just proven reference errors.
- `summary.json`: full before/after metrics and candidate availability by direction, policy and grid size.

Run `npm run dictionary:review3b` to regenerate from the frozen manifest, then `npm run dictionary:audit` to verify all four stages. Production imports `api/_lib/dictionary.stage3b.generated.ts` and explicitly uses compatibility mode. Strict approved-only generation is **not enabled**. CEFR remains unassigned in all dictionary records; the existing API selection classifier is unchanged.

## Counts

| Metric | Before | After |
|---|---:|---:|
| Headwords | 16,018 | 16,018 |
| Relationships | 29,467 | 29,467 |
| Headwords: review | 15,870 | 15,416 |
| Headwords: approved | 53 | 507 |
| Headwords: rejected | 95 | 95 |
| Relationships: review | 29,011 | 27,861 |
| Relationships: approved | 149 | 1,223 |
| Relationships: rejected | 307 | 383 |
| Register: msa | 266 | 1,409 |
| Register: uncertain | 29,194 | 28,040 |
| Register: dialect | 7 | 18 |

Actions: 1,179 relationship metadata updates; 454 headword approvals; 454 preferred EN→AR assignments; 62 preferred AR→EN assignments; 682 reverse restrictions on otherwise approved relationships; 57 headwords with sense labels. Zero text edits or relationship losses. The 76 rejections comprise 66 semantic/form mismatches and 10 dialect-form decisions (one additional wrong-sense rejection is also labelled dialect).

## Candidate availability after Batch 001

Counts are eligible **relationships / actual indexed candidates**, before random pool-size selection. The index retains existing length and CEFR/fallback behavior.

| Size | Compatibility EN→AR | Compatibility AR→EN | Approved-only EN→AR | Approved-only AR→EN |
|---|---:|---:|---:|---:|
| 7 | 16,428 / 16,429 | 17,564 / 9,699 | 946 / 946 | 425 / 241 |
| 9 | 23,888 / 23,886 | 24,105 / 13,369 | 1,117 / 1,117 | 475 / 268 |
| 11 | 27,373 / 27,370 | 27,187 / 15,087 | 1,157 / 1,157 | 483 / 273 |
| 13 | 28,637 / 28,634 | 28,211 / 15,642 | 1,164 / 1,164 | 485 / 274 |
