# Stage 3B Batch 003

Uses the [current revised methodology](../batch001/methodology/README.md) and [Batch 002 QA lessons](../batch002/qa/README.md). This batch strengthens relationship-specific POS and short sense checks without changing semantic, register, allowance or preference policy. Compatibility remains enabled; Batch 004 has not started.

## Deterministic selection

Exactly **500 new unresolved English headwords**, MOVE through TRANSPORT, containing **1,418 relationships**. Rank by presence in the tracked 10k/common reference, then original dictionary position. Exclude every headword appearing in Stage 3A, Batch 001 or Batch 002 decisions, plus the explicit `deferred.json` selection list. All selected headwords are in the reference; none is selected alphabetically or automatically approved by a reference match.

The selection additionally defers names/places ENGLAND, VIRGINIA, CHICAGO, MEXICO, CAROLINA, IRELAND, PACIFIC, BOSTON, OHIO and GEORGE; brand/product/acronym-dominated CNET, PAYPAL, NOKIA, JAVA and ISBN; PREV/MULTI/WED shorthand/prefix records; specialist PHENTERMINE; and GRAND whose supplied relationships are name-like transliterations. Earlier deferrals are retained. Deferral changes no dictionary record. Ordinary civic, technology, health, cultural and learner vocabulary remains eligible; a subject area alone is not rejection evidence.

`selection.json` records source indexes and reference display. `inputs.json` pins the completed Batch 002 QA source, reference, earlier decision manifests, deferrals, selection, initial proposals, rejection checks and frozen decisions. The source is `api/_lib/dictionary.stage3b.batch002.qa.generated.ts`.

## Relationship review

`review-notes.txt` records 500 explicitly authored groups with one status/preference token and one controlled English POS token for each individual relationship. There is no default approval, POS inherited across a whole headword, or reference-based approval. `review-details.json` adds case-specific reasons. `proposals.json` is the complete pre-rejection-check review; `decisions.json` is the frozen original Batch 003 after all mandatory second checks. CSV exports are human-review views.

Controlled POS: noun, verb, adjective, adverb, preposition, pronoun, conjunction, determiner, interjection, other, uncertain. POS describes the English use represented by the Arabic relationship. For example, MANUAL has noun/noun/adjective relationships; BLOCK has a solid-piece noun and a prevent-access verb; GRANT has a bestow verb and a financial-award noun. LOCATED/الموقع remains uncertain. No compound labels such as noun/verb are introduced in this batch.

Sense labels are short and discriminate meanings: CAPITAL capital city/financial capital, FAN supporter/cooling device, ABSTRACT not concrete/summary. Article variants share the same sense. Do not equate Arabic finite, masdar or case morphology with a compulsory English POS; verify the actual bilingual meaning first.

Validity remains separate from preference. Shared synonyms, different English lengths and ordinary grammatical/article variants are not exclusions. Both directions are allowed for certified natural MSA relationships, including nonpreferred alternatives. Uncertain allowance is left unset unless a concrete misleading/corrupt/uncertified rendering warrants an explicit exclusion. Unset is not a positive review decision: compatibility deliberately permits unresolved records unless explicitly excluded.

There are **43 reference conflicts**, defined as a normalized-identical reference relationship the initial review left unresolved or rejected. This includes spelling and construction questions, not only proven errors. The 10k source is supporting evidence, not authoritative truth.

## Mandatory second check of every proposed rejection

Six proposed rejections received separate explicit checks in `rejection_checks.json` / `.csv`. Three were retained:

- BOYS/ولاد: colloquial form in this meaning, with the distinct MSA alternative preserved.
- SESSION/الدورة الثانية: unsupported second-session qualification on a general headword.
- GERMAN/المانيا: country rather than German language/person/adjective referent.

Three were softened to review with exclusions: FEATURED/المميزات, SUCCESS/ناجحة and CREATIVE/ابداع. Their isolated meanings remain unverified, but possible constructions make categorical rejection too strong. Do not generalize these exclusions to other noun/adjective or masdar relationships. All six proposed judgments and second-pass reasons are preserved. Existing malformed repeated phrases are held for review with exclusions rather than mechanically shortened.

## Counts

| Batch measure | Before separate QA | After QA |
|---|---:|---:|
| Headwords / relationships | 500 / 1,418 | 500 / 1,418 |
| Approved relationships | 1,090 | 1,091 |
| Review relationships | 325 | 324 |
| Rejected relationships | 3 | 3 |
| Approved / review / rejected headwords | 487 / 13 / 0 | 488 / 12 / 0 |
| MSA / uncertain / dialect | 1,370 / 47 / 1 | 1,370 / 47 / 1 |
| Allowed EN→AR / AR→EN | 1,090 / 1,090 | 1,091 / 1,091 |
| Preferred EN→AR / AR→EN | 492 / 492 | 493 / 493 |
| Explicit restrictions per direction | 36 | 36 |
| Allowed but nonpreferred per direction | 598 | 598 |
| Resolved POS / uncertain POS | 1,405 / 13 | 1,405 / 13 |
| Sense labels | 160 | 160 |
| Multiword displays | 59 | 59 |
| Text corrections | 0 | 0 |

Equal directional totals are observed results, not targets or a requirement. All 1,418 relationships have logged decisions; 488 headwords become approved because at least one relationship qualifies. No headword is rejected merely because one Arabic translation is unsuitable.

| Whole dictionary | Before Batch 003 | After QA |
|---|---:|---:|
| Headwords | 16,018 | 16,018 |
| Relationships | 29,467 | 29,467 |
| Approved relationships | 2,471 | 3,562 |
| Review relationships | 26,623 | 25,529 |
| Rejected relationships | 373 | 376 |
| Approved / review / rejected headwords | 994 / 14,929 / 95 | 1,482 / 14,441 / 95 |
| MSA / uncertain / dialect | 2,943 / 26,504 / 20 | 4,313 / 25,133 / 21 |

All prior raw, migrated and reviewed snapshots remain unchanged. No relationship additions, deletions, unexplained losses, CEFR assignments, Arabic text changes or grid-normalization changes. Multiword source displays and many-to-many reverse references are preserved exactly.

## Candidate availability

Actual advanced candidate-index counts before request pool sampling:

| Grid | Compatibility EN→AR | Compatibility AR→EN | Approved-only EN→AR | Approved-only AR→EN |
|---|---:|---:|---:|---:|
| 7 | 16,370 | 9,829 | 2,439 | 1,128 |
| 9 | 23,821 | 13,519 | 3,194 | 1,373 |
| 11 | 27,304 | 15,240 | 3,405 | 1,455 |
| 13 | 28,563 | 15,795 | 3,480 | 1,477 |

Before length limits, compatibility has 29,009 eligible relationships per direction and approved-only 3,506. AR→EN chooses one eligible clue per English headword; EN→AR includes eligible normalized alternatives, so candidate and relationship totals differ. Full before/after measurements are in `summary.json`. Approved-only remains disabled; these are availability counts, not solver-reliability claims.

## Separate QA and readiness

[QA report](qa/README.md): 100 relationships with all three rejections and deliberate oversampling of POS, senses, multiple-POS headwords, nonpreference, review, register and reference conflicts. POS agreement is **98%** versus Batch 002's 89%; sense agreement is **100% (29/29 applicable rows)** versus 88%. These are different targeted samples reviewed by the same assistant, not a causal improvement estimate or independent-human certification.

Seven high-confidence fields are corrected across three relationships: two MALE POS labels and WORTH/قيمة approval, allowances and preferences. Two medium-confidence VOTE preference proposals remain unapplied. CORE/الأساسية also has a separately recorded diagnostic correction: its spelling is not defective, but the intended construction remains in review with unknown allowance. No Arabic is rewritten.

The semantic/directional policy remains stable; no methodology redesign is indicated by this bounded QA. **Batch 003 passed with logged corrections. Another bounded Batch 004 is reasonable under the same rules and targeted QA**, not unattended bulk approval. Batch 004 has not been started.

## Replay and checks

```sh
npm run dictionary:batch003
npm run dictionary:audit
npm test
npm run lint
npm run build
```

The generator checks source hashes, exact selection, complete relationship notes and mandatory second-pass rejection coverage before writing the initial and separate QA snapshots. Audit verifies generated reports byte-for-byte. Decision and QA manifests are preserved review inputs, not rewritten during regeneration. Root CSVs represent the original review; `qa/` preserves all disagreements, applied corrections, pending proposals and final unresolved/rejected rows.

Tests verify controlled relationship POS, discriminative/shared senses, rejection gates, all-relationship preservation, canonical normalization/display, independent allowance/preference, valid nonpreferred candidates, rejected exclusion, confidence gates, candidate counts and immutable earlier layers. UI, generation algorithm and inversion/cursor behavior are unchanged.
