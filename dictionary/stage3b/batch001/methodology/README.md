# Batch 001 methodology revision and targeted validation

This policy supersedes the earlier Batch 001/QA directional, morphology and register recommendations. Earlier datasets, decisions and QA reports remain historical evidence, unchanged. No Batch 002 work is included.

## Direction eligibility and preference

Crossword crossings disambiguate synonyms. A correct, natural MSA clue can legitimately identify several English answers. Shared Arabic, different English answer lengths, relative frequency, or another preferred synonym are **never sufficient exclusion reasons**.

| Metadata | Meaning |
|---|---|
| `allowedForEnToAr` / `allowedForArToEn` = true | Reviewed as valid in that direction; still subject to status/register safeguards |
| allowed = false | Explicitly unsuitable in that direction |
| allowed unset | No explicit direction judgment; follow the selected eligibility policy |
| `preferredForEnToAr` / `preferredForArToEn` = true | Prefer this eligible translation during candidate selection |
| preferred = false | Not preferred; does **not** exclude it |
| preferred unset | No preference judgment |

Rejected headwords/relationships and known dialect remain excluded in both policies. Compatibility mode deliberately admits review/unset records unless explicitly disallowed; it does not certify them as approved. Approved-only requires approved headword, approved relationship and MSA, with no direction veto. Production remains in compatibility mode.

Restrict reverse use only for a materially misleading sense, overly broad expression that fails to express the answer, misleading grammar, genuinely poor learner mapping, wrong translation or dialect. A less common legitimate synonym is not automatically poor. Record the actual semantic/grammatical problem, rather than counting alternatives or comparing their lengths. Correct alternatives and many-to-many relationships remain intact.

## Morphology, register and rejection

Evaluate meaning in a natural bilingual citation or construction, not identical surface forms. An English base verb can correspond to an Arabic finite citation; an English gerund/action can correspond to a masdar; an English attributive noun can correspond to an Arabic adjective. English past and Arabic past forms can agree despite implicit person marking. Adjective/participle differences are not exclusions by themselves. POS describes the reviewed English sense; add a sense only when it clarifies the mapping.

Do not use this flexibility to approve arbitrary noun/verb substitutions, changed participants, tense, or countable referents. If a construction is needed but unsupported, leave review instead of inventing context. The sample retains unresolved possessive/collective cases, while explicitly recording natural action readings such as COMPARE/مقارنة and USING/باستعمال. SECOND has a sequencing adverb sense ([Cambridge](https://dictionary.cambridge.org/dictionary/english/second)); MAKE/صنع has direct bilingual support ([Cambridge](https://dictionary.cambridge.org/us/dictionary/english-arabic/make)). Most decisions are explicit AI-assisted linguistic judgments, not externally certified dictionary attestations.

Classify register separately from semantic correctness. Informal is not automatically dialect; spelling defects do not alone establish dialect. Use MSA only when reasonably supported, dialect for a clear contextual dialect reading, and uncertain otherwise. Uncertain register entails review. A clearly wrong relationship with uncertain register can remain review **with both directions explicitly disallowed**. No Arabic text is repaired here.

Reject for a genuinely wrong or unsuitable mapping, not nonpreference, synonymy, uncommon but valid sense, answer length or mere morphology. High-confidence changes only are applied. Medium/low-confidence permission proposals remain unapplied; a high-confidence move from categorical rejection to review does not by itself reopen a previously excluded relationship.

## Reproducible sample and review

Source: frozen `dictionary.stage3b.qa.generated.ts`. Seed: `batch001-methodology-v2-validation`. Source/proposal hashes are pinned in `selection.json`; review hash is recorded in `summary.json`. Within sequential disjoint strata, rank by SHA-256 of `seed|stratum|headwordIndex:translationIndex` and take the quota:

| Stratum | Relationships |
|---|---:|
| All unapplied QA proposals | 35 |
| All register disagreements | 24 |
| Verb/inflection | 30 |
| Previous rejection | 30 |
| Previous reverse restriction | 60 |
| Multiple sense | 10 |
| SOURCE counterexample from QA | 1 |
| Previously accepted reverse controls | 10 |
| Total | 200 |

These are 166 existing Batch 001 headwords. `sample.json` retains the original Batch 001 decisions and post-QA translation. `proposals.json` freezes the revised-rule prediction before explicit review: approved MSA → allowed, rejected/dialect → disallowed, otherwise unresolved. `review-notes.txt` records all 200 authored judgments; `reviews.json` is the replayable manifest with per-field confidence, reasons, original values and sources. `decisions.csv` distinguishes original, revised and actually applied metadata.

Prediction/review agreement is **178/200 (89%)**. Among previously approved-but-restricted sampled relationships it is **107/107 (100%)**. These are same-assistant proposal/review concordance, with unresolved as a third outcome. They are not independent-human agreement, a population accuracy estimate, or a directly matched comparison with the old 32.35% QA statistic. The 22 disagreements are retained for review rather than converted into approvals.

## Applied actions and preserved history

Two distinct layers are reported:

1. Model migration: 823 explicit allowance fields logged in `migration_actions.csv`. It removes 671 obsolete preference vetoes on already approved MSA relationships, without making new linguistic approvals. It preserves 152 existing nonapproved direction exclusions independently of preference. This is not a claim that all 671 relationships received fresh linguistic review.
2. Targeted review: 245 high-confidence relationship-field corrections on 167 sampled relationships, logged in `corrections.csv`: 143 EN allowances, 36 AR allowances, 28 statuses, 12 registers, 13 POS and 13 sense fields. Three headwords move review → approved, separately logged in `headword_corrections.csv`.

Across Batch 001, previous AR vetoes removed/retained/added: **673 / 74 / 0**. Within the targeted sample: **109 / 30 / 0**. Remaining vetoes include preserved unresolved exclusions; they are not all newly certified rejections. Eighteen former rejections change: two to approved (TAX/ضرائب, SALES/البيع), sixteen to review. Twelve registers change uncertain → MSA. Thirteen relationships receive POS/sense clarification. Forty-four sample relationships remain unresolved, with 22 unapplied field proposals. Every action and unresolved decision is retained in CSV/JSON.

| Entire dictionary | Before | After |
|---|---:|---:|
| Headwords | 16,018 | 16,018 |
| Relationships | 29,467 | 29,467 |
| Approved relationships | 1,224 | 1,236 |
| Review relationships | 27,865 | 27,871 |
| Rejected relationships | 378 | 360 |
| MSA | 1,432 | 1,444 |
| Uncertain | 28,018 | 28,006 |
| Dialect | 17 | 17 |

Headwords after: 510 approved, 15,413 review, 95 rejected. No Arabic changes, additions, deletions, unexplained losses or CEFR assignments. Raw, migrated, Stage 2, Stage 3A, original Batch 001 and QA snapshots remain preserved. The script-only `legacyDirectionalView` adapter replays historical reports using their former preference-as-veto semantics; production never uses that adapter.

## Direction counts and candidate availability

| Relationships across dictionary | EN→AR | AR→EN |
|---|---:|---:|
| Explicit allowed=true | 143 | 707 |
| Explicit allowed=false | 74 | 74 |
| Preferred=true | 454 | 61 |
| Eligible in compatibility mode | 29,086 | 29,086 |
| Eligible in approved-only mode | 1,180 | 1,180 |

Unset allowance is not a new positive linguistic judgment. Preferences remain unchanged. The following counts use the actual advanced candidate index, before request pool sampling. AR→EN chooses one eligible clue per English headword; EN→AR includes eligible normalized answer alternatives, so indexed counts differ from relationship eligibility totals.

| Size | Compatibility EN→AR | Compatibility AR→EN | Approved-only EN→AR | Approved-only AR→EN |
|---|---:|---:|---:|---:|
| 7 | 16,430 | 9,830 | 956 | 440 |
| 9 | 23,888 | 13,520 | 1,130 | 494 |
| 11 | 27,373 | 15,242 | 1,171 | 508 |
| 13 | 28,636 | 15,797 | 1,177 | 509 |

## Replay and next-batch gate

Run `npm run dictionary:methodology` to regenerate this new layer from preserved QA plus pinned review inputs. Run `npm run dictionary:audit` to verify all historical and new artifacts. Tests cover separate eligibility/preference semantics, shared same-length synonyms, one-direction vetoes, rejected exclusion, explicit compatibility, reviewed grammar cases, manifest safeguards and unchanged text/grid forms/relationships/CEFR.

The revised rules are suitable for another bounded, explicitly reviewed batch with targeted QA, not unattended bulk approval. Keep uncertain cases unresolved and continue checking register and grammatical construction decisions. Batch 002 has not begun; strict approved-only generation remains disabled. This assessment is subject to passing audit, tests, lint and build and is not independent human certification.
