# Batch005 targeted QA

100 relationships were sampled deterministically with SHA-256 seed `batch005-current-domains-qa-v1`. Disjoint strata prioritize rejections, uncertain register, reference conflicts, review, English large-grid domain matches, Arabic domain matches, senses, nonpreference, multiword phrases and verbs. Available cases are exhausted before approved controls fill the sample. The exact manifest and realized strata are in `sample.json` and `summary.json`.

A fresh same-assistant review was shown English and Arabic without first-pass status, preferences, POS or sense. Conversation memory remains; this is not independent-human certification or an unbiased population accuracy estimate. Every row has an explicitly authored fresh verdict in `review-notes.txt`; no default agreement is generated.

| Field | Agreement |
|---|---:|
| Status | 98/100 = 98% |
| Register | 100/100 = 100% |
| EN→AR allowance | 98/100 = 98% |
| AR→EN allowance | 98/100 = 98% |
| EN→AR preference | 97/100 = 97% |
| AR→EN preference | 97/100 = 97% |
| POS | 100/100 = 100% |
| Sense, when either pass uses a label | 11/12 = 91.67% |

Three relationships receive 13 logged high-confidence field changes:

- FALLS→السقوط: review to approved, allowed both directions but nonpreferred. Arabic naturally expresses the collective falling activity, as in prevention of falls. Add the short sense “falling” to distinguish waterfalls (six fields).
- GENRE→النوع: review to approved, allowed both ways but nonpreferred. Kind/type legitimately expresses genre; breadth and synonym alternatives are not alone grounds to withhold a valid mapping (five fields).
- DRUGS→المخدرات: preferred in both directions for the narcotics sense. Existing therapeutic and bare-form alternatives remain eligible; this is preference, not exclusion (two fields).

All four initial rejections were upheld. No register corrections or Arabic text edits. Initial decisions remain frozen beneath the separate QA dataset.

Sense agreement is numerically above Batch004's 87.5%, but the denominators are small and samples differ. Continue sparse, relationship-specific labeling rather than interpreting this as a controlled causal improvement. The two review-to-approval corrections show that construction/collective/broad-meaning caution still needs checking against the revised permissive crossword policy.
