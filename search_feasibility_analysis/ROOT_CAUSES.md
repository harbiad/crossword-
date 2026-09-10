# Findings and retained fixes

## Why adding Batch006 words regressed seeds

English API pools retained every prior answer/clue pair. Nonetheless, adding records changes the per-length Fisher–Yates order, subsequent rotating attempt offsets, and the random stream consumed before template discovery. Therefore both branches and layouts can change under the same seed. A bounded generator is not monotonic in vocabulary size.

The fixed-set order controls hold template RNG consumption constant. For 11×11 AR→EN seed 1, current order failed while old, lexical and frequency order succeeded. For seed 16, some of those same orders lost a success. For 9×9 seed 16, current order failed while old and lexical order succeeded. These are actual search-order effects, not missing vocabulary. Independent template-stream controls were also run; they did not give a universal improvement, so no random-stream change was promoted to production.

See historical_seed_transitions.json for all 240 Batch005→Batch006 transitions. regressions/ retains the original available failed-call diagnostics, including templates, used answers, windows and constrained patterns. Order controls preserve exact API pools and discovered template signatures. “Old order” retains the old answer ranking and appends new records; it does not remove the additions.

## Solver truncation

All **658,521 captured failed-domain observations** retained every full matching canonical answer in their solver window: **zero window losses, zero window-induced empty domains, zero healthy-to-small window losses**. Therefore no omitted-window candidate could explain a lost known solution in this captured population. solver_window_domains.csv.gz lists each observation, full/window/live sizes, constraints and omitted answers.

The production fill-all and arc paths do not use maxCandidatesPerSlot. Fill-all stops counting larger domains only to implement MRV; the selected domain is complete. Arc domains can be smaller than a fresh local pattern lookup because of prior sound propagation, not a hidden first-N slice. API sampling is a separate boundary and is unchanged.

The redundant per-length solver cap was removed: received candidates remain available regardless of pool growth. Attempts can still rotate their order. This is not a claim that API sampling never omits Arabic answers, or that a bounded search visits every eligible value before its deadline.

## MRV and value ordering

The baseline already uses MRV with static crossing-degree ties. Remaining degree, fixed-neighbor count, stable slot order, longest-slot ties, and constrained-neighbor ties were tested. None rescued the four regressed 9×9 seeds in the targeted tie-break control. No tie-break change was retained.

LCV computes the combined remaining support at unassigned crossings. It rescued **all four** regressed 9×9 AR→EN seeds (16, 20, 25, 30), taking approximately 430–919 ms instead of failing near four seconds. It preserves original order on score ties and never removes candidate values. It is retained only for 9×9 English answers.

LCV is not a universal fix: the complete 30-seed 11×11 LCV-plus-proof-cache pilot solved only **1/30**, versus 7/30 in the baseline. It was not deployed there. Bounded full-propagation value probes were also tested without a convincing improvement on the targeted cases.

## Simultaneous feasibility

The baseline arc solver already propagates repeatedly to a fixed point before search and after assignments. It removes every assigned canonical answer from every unassigned same-length domain.

For 13×13 AR→EN seeds 1, 10 and 16, the controls exhaustively proved all 24 initial templates unsatisfiable for the complete received pool, even though root domains were individually nonempty. Changing order could not create a solution to those layouts. Additional-template controls with a cap of 96 found no solution and proved 85–95 distinct layouts impossible per sampled seed before stopping. They were not retained: spending more CPU on that template family did not help.

A separate Python implementation independently verified two representative 13×13 templates (seeds 1 and 16). Both remained nonempty after root arc consistency, but all first-slot choices led to contradictions; the exhaustive search returned unsatisfiable. The slot graph and complete oriented input domains are preserved in representative_traces/. This is a proof for those exact layouts and pools, not for every possible 13×13 crossword. A timeout is never classified as a proof.

## Canonical uniqueness and propagation

Canonical reuse remains prohibited across clues and orientations. Singleton-word propagation, crossing-pair uniqueness support, and a root bipartite-matching/Hall feasibility check were tested. They expose or remove invalid branches but did not materially rescue the difficult tested English configurations. Those extra algorithms were not retained.

The smaller-grid fill solver previously checked only intersecting neighbors immediately after placement. Its forward checking now also checks remaining same-length slots, so uniqueness losses cannot wait until a later MRV step. Existing candidate lookup already excluded used canonical answers; this strengthens the timing of detection, not the validity rule.

## Retained production changes

1. Cache only **complete impossibility proofs**, scoped to one immutable prepared pool and template geometry. Never cache a timeout, a sampled-subset failure or a failed branch as global impossibility. This avoids retrying a fully exhausted layout with reordered versions of the same words.
2. Use LCV on 9×9 English grids only, as supported by the control.
3. On 11×11 English grids, use a brief first pass, then revisit unresolved templates by deepest consistent assignment fraction with a deterministic lexical alternative. The 30-seed pilot improved from **7/30 to 11/30**. The second pass is bounded by the same 4,500 ms request deadline and existing 350 ms inner limit. No quality threshold is lowered.
4. Retain all received candidates in solver windows and strengthen small-solver uniqueness forward checking.

The 11×11 strategy is an evidence-based search portfolio, not a claim that lexical ordering is intrinsically superior. First-pass candidate ordering is retained, no random MRV ties were introduced, and no dictionary frequency/classification metadata was changed.

## Final comparison and next step

See RESULTS.md and before_after.csv for the complete 30-seed comparison under both policies, including median/p95 time, words and crossings. Before/after use the same Batch006 QA dictionary and production API settings; baseline_hashes.json and archived solver sources identify the starting implementation.

Do not start Batch007. The remaining 13×13 problem requires feasibility-aware template work with this fixed pool, or evidence about jointly necessary vocabulary—not another batch aimed only at individually empty slot patterns. The investigation does not prove that all possible layouts are unsatisfiable, nor that adding more words is the only remedy.

Compatibility remains enabled. No translation, status, register, CEFR, clue semantics, inversion or structural-validation rule changed.


## Final measured outcome

Approved-only 9×9 AR→EN rose from 86.7% to 100%; 11×11 rose from 23.3% to 36.7%. All other configuration success rates held. Across all 480 paired calls there were no lost successes and eight gains. No returned puzzle failed quality validation.

The 13×13 AR→EN nonzero-success target was not met: success remains 0%. Its median failed-call time fell from 4514.4 to 1361.7 ms through proof reuse. This is faster failure, not improved puzzle availability.

The compatibility trade-off is explicit: 11×11 AR→EN median time increased from 790.9 to 1205.6 ms and median words fell from 44 to 42 (crossings 95 to 88), while success stayed 100% and p95 improved from 2700.1 to 2343.7 ms. 9×9 compatibility median words changed from 32 to 31. No validation or minimum-quality rule was lowered; changed search ordering can select a different valid layout. These costs should be considered when testing the checkpoint.
