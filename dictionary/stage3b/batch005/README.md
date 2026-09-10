# Stage 3B Batch 005 — recurring crossing domains

This batch uses the stable Stage 3B validity/preference and MSA policy, including the separate QA overlays from Batches001–004. It does not change the generator, templates, candidate sampling algorithm, budgets, normalization, CEFR or compatibility production policy. The source is the final Batch004 QA dictionary. No previously processed Stage3A/Batch001–004 headword is eligible for selection.

## Diagnose before selection

The older `bench:diagnose` harness deliberately loads pre-solver-fix snapshots; using it would have produced obsolete needs. The new **benchmark-only** observer plugin in `benchmarks/batch005-domain-instrumentation.ts` observes the current checked-in solver. It inserts observation calls into Vite's in-memory module transforms; production source is not edited. It does not replace algorithms, alter options, consume random numbers, modify domains, or loosen validation.

Baseline input: all 133 failed configurations/seeds from `../batch004/generation/runs.json`. This covers 11/13 English answers first in selection priority; 9/11/13 Arabic second; 7/9 English third. There are no failed 7×7 Arabic cases. Same production candidate pool limits, advanced band, deterministic seeds and search budgets apply. Diagnostic timing is not used for speed comparisons: hot-path observations have overhead and may affect deadline outcomes. Only cases still failing in the observed run supply selection needs.

`diagnostics/runs.json` retains every sampled slot, geometric coordinates, Across/Down direction, template, attempt, known-position pattern, crossing support sets, used canonical answers, observed live domain and independently recomputed sampled matching counts. Capture is bounded to the first 600 distinct template/slot/support-set/reason observations per run; dropped counts are explicit. Raw occurrence counts reflect search activity, not unbiased occurrence probabilities.

For fill search, the MRV probe may stop at the current best count. **That probe count is not treated as an exact small domain**: `sampledUnusedSupportUnique` is recomputed after search, and observations with more than three matching unused canonical answers are not used as small-domain evidence. For arc search, `liveDomain` is the actual remaining oriented-domain size. A live arc domain can be zero even when a literal pattern has matches, because arc propagation carries constraints from other unassigned slots.

Patterns use zero-based positions along the normal slot traversal used by prepared geometry (LTR English Across, RTL Arabic Across, top-down Down). Inversion matches position `length - 1 - index` in the same canonical word. A `?` means no singleton character constraint; **it may still have an allowed-character set**. `constraints` records those sets, and selection matches the full sets rather than misreading `?????` as unconstrained. A slot with an empty support set is not a vocabulary target that one word can repair.

## Domain needs and scoring

`domain_needs.json` / `domain_needs.csv` aggregate equivalent size/mode/length/support-set needs. They report distinct failed seeds, distinct templates, Across/Down occurrence, known positions/characters, live zero events and matching approved canonical answers in the **full size-specific indexed pool before sampling and used-word exclusions**. This separates missing approval coverage from sampling and search-history restrictions.

Selection rewards only needs recurring in at least two failed seeds and having 0–3 full-pool matches. A potential Arabic addition must supply a new canonical grid spelling; another clue for an already approved spelling receives no coverage credit. API English-length eligibility is respected in both modes.

Reproducible score:

- Learner score: 100 for common/10k reference membership, plus `80 / (1 + originalDictionaryIndex / 2000)`. Dictionary order is a frequency proxy, not a measured corpus frequency.
- Domain score: for each mode/answer-length family, take the greatest `(4 - priority) * log2(1 + distinctFailedSeeds) / (1 + existingApprovedMatches)` across matched needs; sum families, multiply by 3 and cap at 35. This prevents thousands of near-duplicate traces from overwhelming commonness.
- Relationship quality potential: 2 if a supplied Arabic grid form matches the supporting common reference. This is a selection hint, **never linguistic approval**.
- Tie breaker: original dictionary index. Prior headwords and frozen `deferred.json` name/brand/specialist deferrals are excluded.

There are no raw-length bonuses or quotas. The weights are documented design choices, not calibrated probabilities. A common word with no observed match can enter on learner value, but every such selection must remain visible with domainScore=0. Never infer that every selected relationship will help generation.

Linguistic review is independent of scoring. All relationships under each selected headword are reviewed explicitly, with a controlled per-relationship POS. Sense labels are used sparingly for genuinely distinct meanings. Rejections require a high-confidence second pass. Arabic text stays naturally spaced; an unclear rendering is left for review instead of being repaired to fit a grid.

## Artifacts and reproduction

`review-notes.txt`, `review-details.json`, `proposals.json`, `rejection_checks.json`, and `decisions.json` preserve the first-pass decisions. The `qa/` directory preserves a separate targeted sample, fresh verdicts, disagreements and applied corrections. `summary.json` contains global/batch counts and both policies' size-specific candidate availability. No default approval or default QA agreement is permitted by the replay helpers.

The post-batch benchmark uses the exact same 30 seeds per size/mode as Batch004, with unchanged solver settings. `generation/` holds runs, timings, lengths and the paired comparison. Domain coverage compares **the same frozen constraints** before/after; it does not prove that their surrounding search state is solvable. “Critically small” means 1–3 unique answers, and “healthy” means at least 5 for this descriptive report. Five is a disclosed headroom heuristic, not a validated sufficiency threshold.

Compatibility stays enabled. No CEFR assignments. No Batch006 is started. See the completion and generation reports for measured outcomes and the remaining bottleneck; extra raw candidates are not presumed to improve success.

## Completed review and measured outcomes

Exactly **500 new headwords / 1,321 relationships** were reviewed. All selected headwords occur in the common reference; 441 have positive measured domain contribution and 59 enter on learner value alone. None were previously processed in Stage3A or Batches001–004. Selection matches 1,239 recurring weak support-set domains.

After the separate 100-relationship QA overlay:

- Relationships: **1,027 approved, 290 review, 4 rejected**; 1,261 MSA, 58 uncertain, 2 dialect.
- Headwords: 460 approved, 40 review, none rejected wholesale.
- New explicit allowances: 1,027 in each direction; preferences: 485 in each direction. 542 approved relationships are allowed but nonpreferred in each direction.
- POS: 1,284 assigned, 37 uncertain; 57 short sense assignments; 59 naturally spaced multiword translations.
- 76 reference conflicts are preserved for review. No Arabic text corrections, new relationships, relationship deletions, or CEFR assignments.
- Global totals: **16,018 headwords / 29,467 relationships; 5,655 approved, 23,426 review, 386 rejected**.

Every decision is AI-assisted, explicitly authored and replayable from the manifests. Deterministic code selects the batch, compiles those decisions, validates identity and produces reports; it does not infer linguistic approval from reference agreement or domain scores. No independent human review is claimed.

Five proposed rejections received a second pass. HIDE→تبي and UNCLE→عمو remain rejected as dialect/misleading mappings; LIVER→كب remains rejected as corruption/different meaning; WHOSE→الذين remains rejected for the missing possessive relationship. AUCTIONS→المناقصات was softened to review because auction/tender distinctions need contextual judgment. QA then made 13 metadata changes on three relationships: FALLS→السقوط and GENRE→النوع became approved/allowed but nonpreferred, and DRUGS→المخدرات gained preference. See the QA CSV for every field and reason. No text changed in either pass.

QA agreement: status and each allowance 98%; register/POS 100%; each preference 97%; sense 91.67% (11/12 applicable cases). These are targeted same-assistant agreement rates, not population accuracy estimates.

Of 6,891 recurring frozen domains, 1,227 improved; 249 formerly zero domains gained support, 1,557 remain zero, and 208 moved from 1–3 answers to at least five. Within the 1,239 selected targets, 1,099 improved and 44 remain zero. Coverage never decreased. Full details and all 240 paired benchmark runs are in [GENERATION_COMPARISON.md](GENERATION_COMPARISON.md) and `generation/`.

The remaining-failure investigation sampled the first five failed seeds per configuration (all when fewer): 26 observed runs, all still failing. It found missing full-pool support as well as used-word exhaustion and Arabic sampling losses. For 13×13 English, only 67/1,375 recurring domains improved and 155 remain zero; success remains 0/30. This does not establish that the solver has become the primary limitation. Nor do branch-local zero domains prove global unsatisfiability. Refresh recurring residual gaps before deciding on a narrower Batch006; do not automatically review the next 500 words or impose long-word quotas. No Batch006 has started.

## Commands

Run from the repository root using Node 24 and installed dependencies:

```sh
# Frozen before-Batch005 diagnostics use the preserved Batch004 dictionary.
npm run bench:domains005
node scripts/dictionary-batch005-domains.ts

# Replay explicit linguistic and QA manifests; does not invent decisions.
npm run dictionary:batch005
npm run dictionary:audit

# Same production settings and 30 seeds per size/mode; output is explicit.
APPROVED_BENCH_POLICY=approved-only APPROVED_BENCH_OUTPUT=dictionary/stage3b/batch005/generation npm run bench:approved
node scripts/dictionary-batch005-coverage.ts
BATCH005_DOMAINS_PHASE=after npm run bench:domains005
node scripts/dictionary-batch005-residual.ts
node scripts/dictionary-batch005-report.mjs

npm test
npm run lint
npm run build
```

Archived traces/selection are hash-pinned. Re-running deadline-sensitive diagnostics can change trace bytes even with identical seeds; preserve these archives and run exploratory diagnostics in a separate checkout instead of replacing the approved batch's evidence. The comparison script verifies unchanged generator/input hashes. Generated Batch005 TypeScript checks each headword with `satisfies` before widening its array element type; this avoids the compiler's literal-union comparison limit and erases entirely at runtime. The semantic dictionary hash is identical to the benchmarked data.

Examples of the frozen recurring needs (positions are zero-based in normal traversal; inversion is evaluated separately):

| Grid/mode | Pattern and full support sets | Failed seeds | Approved answers before → after |
|---|---|---:|---:|
| 11 AR→EN | `??T`: 0∈{B,L,N,P,W}, 1∈{A,P}, 2=T | 5 | 0 → 2 (BAT, inverted TAP) |
| 13 AR→EN | `?AP`: 0∈{L,P,W}, 1=A, 2=P | 5 | 0 → 0 |
| 11 EN→AR | `?س`: position 1=س | 21 | 0 → 3 |
| 11 EN→AR | `س?`: position 0=س | 20 | 0 → 3 |

The two Arabic constraints gain the canonical forms سر، قس، سن through normal/inverted traversal. They are distinct oriented constraints; they must not be counted as independent vocabulary gains. The unrepaired English example illustrates that selection potential never overrides linguistic uncertainty.

Final validation: dictionary audit passed with no unexplained losses; **375 tests across 24 files passed**, including 11 new Batch005 tests; lint and build passed. The approved-generation benchmark passed all provenance/structural checks across 240 measured runs. See `checks.json` and `completion.json` for the consolidated machine-readable result. No solver, inversion, cursor, UI, raw dictionary, or previous linguistic layer was changed by Batch005.
