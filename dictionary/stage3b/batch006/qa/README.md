# Batch006 targeted QA

45 relationships were selected deterministically using `batch006-67-headwords-qa-v1`: both proposed rejections, three uncertain-register cases, five other unresolved cases, eight multiple-meaning cases, eight allowed-but-nonpreferred cases, eight verb/inflection cases and eleven approved reverse controls.

The second pass used a fresh English/Arabic-only presentation, followed by explicit authored verdicts in `review-notes.txt`. This was the same assistant, with conversation memory; it is not independent-human certification or a random population accuracy estimate. High QA confidence can mean confidence in *leaving a relationship unresolved*, not confidence that its Arabic should be approved.

| Field | Agreement before correction |
|---|---:|
| Status | 45/45 (100%) |
| Register | 45/45 (100%) |
| AR→EN allowance | 45/45 (100%) |
| AR→EN preference | 45/45 (100%) |
| EN→AR allowance | 45/45 (100%) |
| EN→AR preference | 45/45 (100%) |
| POS | 44/45 (97.78%) |
| Sense, applicable cases | 3/3 (100%) |

One high-confidence metadata correction was applied: **INVITE→الدعوة**, POS `verb`→`noun`. English *invite* also has the noun use “invitation”; the definite Arabic noun expresses that use. Both direction allowances and nonpreference remain unchanged. Other action-noun translations of English verbs are not automatically converted to noun POS: DONATE, ARRANGE and ADVISE remain verbal relationships where that is the English use expressed.

Both semantic rejections were upheld: ANGEL→انجيل (Gospel) and PRAISE→ماشاء (an incomplete expression). No text edits, register changes, approval changes, or allowance/preference changes. All original decisions remain beneath the QA overlay. Sparse sense labeling continues; a denominator of three is too small to claim a general improvement in sense accuracy.
