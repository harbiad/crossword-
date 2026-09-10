# Batch 004 targeted QA

100 relationships, sampled reproducibly by `sampleBatch004Qa` with seed `batch004-coverage-qa-v1`. Selection prioritizes all rejections, reference conflicts, uncertain register/review, newly allowed reverse relationships matching observed gaps, allowed/nonpreferred reverse, distinct senses, multiword expressions and verbs. `sample.json` retains the original decisions. `review-notes.txt` records all 100 explicitly authored fresh verdicts; `reviews.json` stores original and revised judgments. No default “agree” assignment is used.

The fresh display contained English and Arabic only. The same assistant conducted both passes and retains context. These are agreement rates on a targeted sample, not independent-human certification or unbiased population estimates.

| Field | Agreement |
|---|---:|
| Status | 98/100 = 98% |
| Register | 100/100 = 100% |
| EN→AR allowance | 98/100 = 98% |
| AR→EN allowance | 98/100 = 98% |
| EN→AR preference | 98/100 = 98% |
| AR→EN preference | 98/100 = 98% |
| POS | 100/100 = 100% |
| Sense (any old/new label) | 14/16 = 87.5% |

Unknown allowance/preference is a separate outcome from true/false. Sense disagreements count removal/addition as well as wording changes; 84 unlabeled cases do not inflate sense agreement.

Four relationships received 12 high-confidence field corrections:

- AMATEUR→هاوية: approve the feminine amateur noun, allowed both ways but nonpreferred. Its abyss homograph alone is not exclusion evidence (five fields).
- HITS→الزيارات: move the loose web-visits sense from approved to review, with unknown allowances/preferences. A visit and a server hit are not identical units (five fields). Compatibility may still admit this unresolved mapping; strict approval excludes it.
- ICE→جليد: remove an unnecessary frozen-water label (one field). No Arabic or meaning change.
- SAD→محزن: add “saddening” to distinguish this causal adjective from feeling sad (one field).

All six initial rejections were upheld. No text edits, new dialect labels or extra relationships. `disagreements.csv` lists every changed field; `corrections.csv` contains the applied subset. `diagnostic_notes.csv` records explanatory reason changes that do not change production metadata. `unresolved.csv`/`rejected.csv` give final effective status for the whole batch.

The directional rules remain appropriate for this sample. Sense labeling is still the weaker measurement (87.5% across only 16 cases), even with no sampled POS disagreement. Preserve the controlled relationship-specific checks and require attention to unnecessary labels versus genuine causal/state distinctions in any future batch. This sample does not justify broad unattended approvals or a new directional policy.
