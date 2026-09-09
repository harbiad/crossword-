# Batch 002 targeted QA

This is a fresh second-pass AI-assisted review under the revised methodology. The review view contained English and natural Arabic only, omitting original status, preferences, reference and stratum. The same assistant retained conversation context, so this is **not blinded independent-human validation or a population accuracy estimate**.

The frozen original decisions precede this separate correction layer. `sample.json` / `sample.csv` record exact selections. `review-notes.txt` records all 100 fresh judgments; `reviews.json` is the replayable correction manifest, including original/revised decisions, reasons and confidence. No Arabic text changes are permitted by this batch's replay schema.

## Sample

Seed `stage3b-batch002-qa-v1`. Sequential disjoint strata, each ranked by SHA-256 of `seed|stratum|headwordIndex:translationIndex`:

| Stratum | Count |
|---|---:|
| Dialect | 3 |
| Rejected | 12 |
| Review | 12 |
| Reference conflict | 8 |
| Reverse restricted | 8 |
| Allowed but nonpreferred reverse | 15 |
| Multiple sense | 8 |
| Verb/inflection | 10 |
| Multiword | 7 |
| Approved control | 17 |
| Total | 100 |

Across the overlapping properties, the sample has 57 approved, 27 review and 16 rejected relationships from 92 headwords; 35 allowed-but-nonpreferred reverse clues, 25 explicit reverse restrictions and 16 multiword expressions. It includes every initial rejection, not just a favorable subset. Register baseline: 87 MSA, 10 uncertain, 3 dialect.

## Agreement against the frozen original

| Field | Agreement | Denominator |
|---|---:|---:|
| Status | 97% | 100 |
| MSA/register | 100% | 100 |
| EN→AR allowance | 100% | 100 |
| AR→EN allowance | 100% | 100 |
| EN→AR preference | 97% | 100 |
| AR→EN preference | 97% | 100 |
| POS | 89% | 100 |
| Sense | 88% | 25 |

Unknown allowance/preference is a third outcome, not false. Sense denominator includes rows with an old or proposed label, so absent/absent rows do not inflate agreement. These are exact metadata agreement rates; added clarifying sense labels count as disagreements even where the underlying translation was accepted.

There are 23 field disagreements across 19 relationships. `disagreements.csv` lists every one. `corrections.csv` contains 17 high-confidence fields applied across 16 relationships; `proposals_unapplied.csv` contains six medium-confidence fields across three relationships.

## Applied and unapplied findings

- GIRLS/لبنات, ENGINEERING/الهندسة الهندسية, CAREER/مسير: rejected→review. A prepositional reading, redundant expression or course/progress sense is not proven impossible. Both existing direction exclusions are retained pending resolution. None is approved or reopened by this status change.
- POS narrowed for MIND/العقل, WATCH/مشاهدة, SORT/فرز, FACE/واجه, WATCH/ساعة, QUICK/سريع, NIGHT/ليلا, CLOSE/إغلاق, FRENCH/بالفرنسية, FINE/لا بأس and SHARE/مشاركة. Arabic action nouns and prepositional constructions remain allowed where they naturally express the English sense.
- Sense added for RECORDS/المحاضر (official minutes), FRENCH/بالفرنسية (French language), NONE/لا أحد (no person).
- Preference proposals for DIRECTOR/مدير, BAR/الحانة and LICENSE/ترخيص were judged medium-confidence. They are logged but **not applied**. All remain allowed in both directions. Preference is not an exclusion control.

No register or allowance changes were required by this sample. No synonym-only exclusion was retained as such. Explicit exclusions concern wrong/corrupt/dialect data or unresolved non-MSA renderings, not competing synonyms or answer lengths. No text changes were made.

## Next-batch lessons and assessment

Direction, status and register decisions passed this targeted same-assistant check. Rejection-specific agreement is 13/16 (81.25%): three categorical rejections were too strong even though retaining their eligibility exclusions remains prudent. Review uncertain compositional readings before calling them corruption. POS agreement of 89% shows that grouping all English POS options on every relationship is too broad; use the actual relationship's English sense. Do not broaden approvals to improve a metric, and do not force subjective preferences.

The corrections and documented rules make another bounded Batch 003 reasonable, with deliberate rejection/POS QA. This does not certify the remaining unsampled relationships or support unattended bulk review. Batch 003 has not started; compatibility mode remains enabled.
