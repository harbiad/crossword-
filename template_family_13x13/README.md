# 13×13 template-family experiments: keep English answers at 3+

Historical experiment report. The subsequent authorized production integration is documented in [production/README.md](production/README.md). Statements below about unchanged production describe the experimental checkpoint.

**Recommendation A:** retain a three-letter minimum and adopt the tested balanced,
rotationally symmetric, partially checked family for 13×13 English answers after
product review. It achieved 30/30 approved-only and 30/30 compatibility successes.
**This task does not change production.** Two-letter English and approved-only
production remain disabled. Dictionary decisions and CEFR remain unchanged.

## Why the old family forces four long entries

The earlier proof has an important premise: **every positive white run in both
axes must have length at least three**. That is stronger than requiring every
*answer* to have at least three letters.

| Rule | Source / role | Experiment |
|---|---|---|
| At least 3 letters per English answer | Current product requirement | Preserved in all 3+ families |
| Every white cell must belong to two entries | Implicit in `templates.ts` rejecting perpendicular singleton runs | Relaxed to one or two entries; each white cell still belongs to a real 3+ answer |
| No 3 consecutive blocks | `construct.ts:validateBlockRuns`, enforced by `validatePuzzle`; historical product rule | Preserved in accepted families; a separately labeled three-block control fails validation |
| Every contiguous run of 2+ cells has one matching clue | `getGridRuns` and `validatePuzzle` | Preserved; 3+ families forbid length-2 runs |
| Every cell has an owner; intersection graph connected | `validatePuzzle` | Preserved |
| Rotational symmetry | Optional `getNYTTemplate` generator, not validator; current generator also uses asymmetric layouts | Tested separately; symmetry itself is not the obstruction |
| At most 30% blocks | Template-generator heuristic, not a correctness validator rule | Preserved; lower ceilings tested independently |
| Borders and minimum white runs in both axes | Template-generator implementation | Border singleton in one axis may belong to a 3+ word in the other axis |
| Four length-13 entries | Emergent consequence, not an explicit product requirement | No longer forced |

Under full checking, a block at index 2 of a line would leave a short white run
before it or produce three consecutive blocks. Index 10 follows by reflection.
Thus rows/columns 2 and 10 are entirely white. Symmetry is not needed for the proof.

Exhaustive enumeration finds 116 legal one-dimensional patterns under the old
rule, all white at indices 2 and 10. Allowing a singleton *perpendicular run*
produces 1,050 patterns with no universally forced white position. A singleton is
**not a one-letter entry**: the full-grid check requires that cell to belong to a
3+-letter answer in the other direction. `.##` at a border can then be legal.
See `line_rule_control.json` and the full-grid solution witnesses.

## Rule-isolation discovery

Independent discovery seed: 81281, separate from evaluation seeds 1–30. Each
family samples 500 layouts, with the same sequence of density ceilings
30%, 26%, 22%, 18% repeated across ten 50-layout batches. These are controls, not
new runtime settings. Analysis solver budget: 150ms/layout. Both orientations
and canonical all-different are unchanged. Initial propagation precedes deeper
search; complete proofs and timeouts are recorded separately.

| Family, minimum answer 3 | Valid solutions / 500 | Interpretation |
|---|---:|---|
| Fully checked, asymmetric | 0 | Removing symmetry alone does not fix it |
| Partially checked, asymmetric | 165 | Changing the implicit full-checking requirement creates feasibility |
| Partially checked, rotational symmetry | 169 | Symmetry can be retained |
| Fully checked, maximum block run 3 | 0 | Six fills found; all violate the unchanged block validator and are rejected |

Of 334 valid discovery solutions, 214 have no 13-letter entries, 69 have one,
48 have two, and three have more than two. Long words are not intrinsically bad;
the old forced positions and their combined crossing constraints were the issue.

At the 30% block ceiling, both partially checked families found 127/150 valid
solutions within 150ms/layout. At 26%, they found 37/150 and 41/150; at 22%, one
solution each; at 18%, none within the analysis budget. This supports using the
existing 30% ceiling rather than imposing an arbitrary new length quota.

`rule_isolation.csv` includes unknown-within-budget cases. A timeout is never
labeled impossible. `feasible.json` preserves every accepted discovery witness.
The six rejected three-block controls remain visible in `discovery.csv`.

## Evaluation and quality refinement

The actual production `generateCrossword` is invoked under a Vitest-only template
provider override. Candidate selection, canonical indexing, inversion, value
ordering, propagation, uniqueness, quality validation and search budgets are
unchanged. The override is never imported by the application.

- Same fixed Batch006 QA dictionary, advanced candidate band, API pool limits.
- Same seeds 1–30; seed 0 warm-up excluded per configuration.
- Same candidates per seed/policy across families; no network.
- Same 24 generated layouts, 4,500ms request budget and 350ms inner ceiling.
- Both approved-only and compatibility measured separately.
- One sequential benchmark process, without concurrent lint/build work.

Both 3+ partially checked families initially reached 100% success. However,
some selected layouts had more than 70% three-letter entries. A separate quality
control filters the same 24 symmetric layouts to at most **60% three-letter
entries**. The threshold rounds the current compatibility median (59.38%) and
removes those outliers; it is disclosed rather than treated as an existing rule.
No upper answer-length limit or fixed length quota is added. Filtering changes
the eligible template count; the existing generator redistributes its unchanged
overall time budget. It still reached 100% under both policies.

See `RESULTS.md` for all timings and quality statistics. The recommended balanced
family has median 52 words, 90 crossings, 70.4% white cells, 75.6% checked white
cells, average answer length 4.01, and a median 50.4% three-letter share. Every
word crosses another; the full entry graph is connected. All answers are 3+.
There are 30 distinct approved-only layouts, not a reused canned solution.

The quality trade-off is explicit: compared with current compatibility output,
white density falls from 77.5% to 70.4%, median words from 62 to 52, and crossings
from 131 to 90. Most cells remain crossed; the three-letter share falls from
59.4% to 50.4%. `examples.svg` shows actual median-word-count examples, selected
by nearest median then lowest seed, for visual product review.

## Two-letter control — not deployed

This ran only after completing the 3+ discovery and 30-seed comparison. It uses
three separate families: partially checked asymmetric, partially checked
symmetric, and fully checked. Minimum answer length is the only changed word
eligibility rule within each corresponding family. It does not use the later
60% three-letter quality filter, since that filter was motivated by 3+ layouts.

Approved-only results: 70%, 76.7%, and 0%. They are worse and slower than the 3+
alternatives. Compatibility reaches 100%, but many two-letter tokens come from
records still awaiting linguistic review.

The actual approved-only two-letter vocabulary was:
`AT BY DO EX HE IF IN NO OF OK ON OR TO UP WE`.
Across the 44 successful approved-only control puzzles there were 585 two-letter
placements: 470 function words, 40 DO placements, 38 OK placements, and 37 EX
placements. EX is flagged for a future clipped-form/sense policy review, not
rejected or edited. No name is identified by existing audit flags.

Across 90 successful compatibility control puzzles, 47 distinct two-letter
answers account for 2,928 placements. Of these, 993 are function words, 126 are
common short forms (ID/OK), 1,336 have historical abbreviation-source flags,
and 1,577 are flagged for learner-focused review (categories overlap).
Examples include EL, EM, MM, OE, OS, TA, UR and UT. This is not a new linguistic
approval/rejection pass. An abbreviation-source hit does not prove the word is
an abbreviation, and an interjection is not automatically invalid. No existing
proper-name flags occur; unresolved tokens are not certified as non-names.

`two_letter_frequency.csv` lists every actual answer, clue, occurrence count,
policy, family, category and review basis. Counts are occurrences in successful
puzzles; failed puzzles contribute no words. `two_letter_categories.csv` gives
category totals. Generic two-letter eligibility is not recommended, and improved
speed alone would not justify it.

## Reproduce

```sh
npm run bench:template-families
npm run bench:template-families:compare
FAMILY_COMPARE=1 COMPARE_FAMILIES=two-unchecked,two-symmetric-unchecked,two-fully-checked npx vitest run --config vitest.template-families.config.ts benchmarks/template-families/compare.benchmark.ts
FAMILY_COMPARE=1 COMPARE_FAMILIES=balanced-symmetric FAMILY_COMPARE_OUTPUT=balanced npx vitest run --config vitest.template-families.config.ts benchmarks/template-families/compare.benchmark.ts
python3 scripts/template-family-report.py
npm run dictionary:audit
npm test
npm run lint
npm run build
```

Run benchmark commands sequentially. The two-letter command asserts that the
3+-letter comparison has all 30 seeds for both policies first. All failed runs
are retained. `input_hashes.json` and `protected_inputs.json` verify production
code and the fixed dictionary remained unchanged during this task. No other
grid size is modified, and no experimental template family is deployed.
