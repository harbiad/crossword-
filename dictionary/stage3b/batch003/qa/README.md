# Batch 003 targeted QA

Fresh second-pass AI-assisted review from English/Arabic-only rows. The original decision, reference, status, preferences and stratum were omitted from the review view, but the same assistant retained conversation context. This is not blinded independent-human validation or an estimate of population accuracy.

The original post-rejection-check Batch 003 decisions remain frozen. `sample.json` and `sample.csv` record the sample; `review-notes.txt` records all fresh judgments; `reviews.json` preserves original/revised metadata, reasons, confidence and limited supporting sources. `disagreements.csv`, `corrections.csv`, `proposals_unapplied.csv` and `diagnostic_notes.csv` list every finding and its disposition.

## Reproducible sample

Seed: `stage3b-batch003-pos-sense-qa-v1`. Rank within sequential disjoint strata by SHA-256 of `seed|stratum|headwordIndex:translationIndex`. Include all rejections up to 20 (there are three), then 20 approved sense-labelled rows, 20 approved relationships from headwords with multiple resolved POS, 15 allowed-but-nonpreferred reverse relationships, 12 review, 8 uncertain-register and 8 reference-conflict rows. Fill the remaining 14 with approved POS controls, totalling 100.

Sample: 84 headwords, 69 approved / 28 review / 3 rejected relationships; 88 MSA / 11 uncertain / 1 dialect. Overlapping properties include 44 allowed-but-nonpreferred reverse clues, 10 explicit reverse restrictions, 29 sense-labelled rows and 8 multiword expressions. All three initial rejections are included.

## Exact agreement

| Field | Batch 003 | Batch 002 |
|---|---:|---:|
| Status | 99/100 = 99% | 97% |
| MSA/register | 100/100 = 100% | 100% |
| EN→AR allowance | 99/100 = 99% | 100% |
| AR→EN allowance | 99/100 = 99% | 100% |
| EN→AR preference | 98/100 = 98% | 97% |
| AR→EN preference | 98/100 = 98% | 97% |
| POS | 98/100 = 98% | 89% |
| Sense | 29/29 = 100% | 88% |

Unknown is a third outcome, not false. Sense denominator includes rows with an old or revised label; absent/absent rows do not inflate agreement. POS is numerically 9 percentage points higher; sense is 12 points higher. Different sampling strata and the same-assistant limitation prevent interpreting those differences as independently measured accuracy gains.

## Every disagreement and action

Nine metadata-field disagreements across four relationships:

- MALE/ذكرا and MALE/الذكر: two high-confidence adjective→noun POS refinements. The entity reading is better supported for these individual citations. Both directions remain allowed; case/article forms are not rejected.
- WORTH/قيمة: five high-confidence changes: review→approved, both allowances unset→true and both preferences unset→true. WORTH has a clear noun meaning value. No invented relationship or Arabic change.
- VOTE/التصويت: two proposed nonpreferred→preferred changes, one per direction, judged medium-confidence. They are **not applied**; preferring this article form over تصويت is subjective. The relationship remains allowed both ways.

Thus seven high-confidence fields are applied across three relationships, and two fields remain unapplied. Register, sense and Arabic text receive no changes. WORTH's headword becomes approved because it now has an approved MSA relationship.

One additional diagnostic note, separate from the eight scored metadata fields: CORE/الأساسية was initially called an orthographic defect. It is correctly spelled; the second pass instead identifies an unresolved construction/sense question. The record remains review with unknown allowances; no production metadata is changed. The diagnostic reason is preserved in the QA notes rather than silently replacing the original review.

Limited external supporting evidence: [Cambridge WORTH](https://dictionary.cambridge.org/dictionary/english/worth) identifies its noun value use, and [Cambridge MALE](https://dictionary.cambridge.org/us/dictionary/english/male) identifies its noun use. Search extracts supplied these facts after direct fetches returned 403. Most other judgments are explicit AI-assisted linguistic review, not external dictionary certification.

## Assessment

All three initial rejections were retained in QA. Natural synonyms, different English lengths, article variants and finite/masdar morphology did not trigger exclusions. Controlled per-relationship POS and short shared sense labels performed better on this sample than the broader Batch 002 labels. Continue leaving unclear POS explicitly uncertain rather than guessing.

**Passed this bounded QA with corrections.** The current methodology remains suitable for a bounded Batch 004 with rejection checks and targeted QA. It does not justify unattended approval of unsampled records. Compatibility stays enabled, CEFR stays unset, and Batch 004 has not begun.
