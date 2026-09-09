# Dictionary structural migration

**Current production review:** [Stage 3B Batch 002 and targeted QA](stage3b/batch002/README.md), using the [revised directional methodology](stage3b/batch001/methodology/README.md). Earlier datasets and reports remain preserved. Compatibility mode remains enabled.

**Stage 2 is now available:** see [classification, cleanup actions and review queues](STAGE2.md). The stage-one snapshot below remains the immutable input; its generated dataset is preserved as the input to Stage 3A. Production uses the Stage 3B dataset with explicit compatibility filtering.

The immutable Stage 1 master is `api/_lib/dictionary.generated.ts`. Each English headword has an ordered `translations` array. Each translation stores only its exact source display string in `arabic`; the crossword-safe answer is derived by `normalizeArabicWord()` in `api/_lib/dictionary.ts`. Spaces, alternative relationships, shared expressions, and source ordering are preserved.

The untouched migration source/backup is `api/DICT_COMMON_30000_non_empty.ts`, the dictionary previously used by the API. Other older dictionaries, CSVs and local edits are not merged into this migration. `api/DICT_COMMON_30000.ts` is also left untouched by this task.

## Commands

Use Node 22.18+ (tested with Node 24.10.0) for native TypeScript execution:

```sh
npm run dictionary:migrate
npm run dictionary:audit
npm test
npm run lint
npm run build
```

Migration automatically creates the new file from every original clue/display string. It refuses to overwrite the generated file if any relationship fails normalized-answer equivalence. The check is positional per headword and translation, so alternatives and duplicate occurrences cannot silently disappear. The audit additionally detects missing, added or reordered headwords, relationship count changes, and display-text changes. It exits nonzero on equivalence failure and writes complete diagnostics and review references to `dictionary/audit.json`.

Regeneration intentionally reproduces the raw snapshot; future manual curation must establish an editable master/import workflow before editing generated data, or regeneration would overwrite those edits.

## Baseline results

| Measure | Result |
|---|---:|
| Old / new English headwords | 16,018 / 16,018 |
| Old / new translation relationships | 29,526 / 29,526 |
| Migration-equivalence failures | 0 |
| Multiword Arabic translations | 1,521 |
| Duplicate Arabic occurrences within a headword | 1 |
| Arabic expressions shared across distinct English headwords | 5,257 |
| Headwords present in abbreviation dataset | 213 |
| Translations with immediately repeated Arabic words | 254 |
| Translations matching possible dialect/slang review hints | 7 |
| MSA / dialect / uncertain / unset register | 0 / 0 / 0 / 29,526 |

The review queue is informational. Shared Arabic expressions are valid many-to-many relationships, not errors. Exact duplicate strings are retained as separate translation records. Dialect hints use a short, explicit token list; they are not comprehensive linguistic classification and can produce false positives. No translations were corrected, deleted or automatically approved.

## Metadata and reverse lookup

`DictionaryHeadword` supports optional status and detailed CEFR. `DictionaryTranslation` supports optional status, register (`msa`, `dialect`, `uncertain`), directional preference booleans, part of speech and sense. All are initially unset; CEFR selection continues using the existing classifier and fallback tiers. No existing Arabic is assumed to be MSA.

The two independent preference booleans can represent either direction, both, or neither. They are not interpreted as linguistic decisions or automatic filters during migration.

`buildReverseIndex()` derives exact Arabic display phrases → all English/translation references, retaining alternatives and duplicate senses. `buildReverseIndex(dictionary, true)` exposes only references with approved headword status, approved translation status and MSA register; initially this view is empty. No manually maintained reverse dictionary exists.

**Future production policy:** approved status and MSA register are required after review. That filter is deliberately not activated during this structural migration because all existing relationships must remain usable and unclassified data must not silently disappear.

## Consumer review and compatibility

- `api/generate.ts`: uses the new master and builds the warm candidate index once.
- `api/_lib/candidates.ts`: reads `translation.arabic`, derives grid answers at runtime, and uses the unchanged display string for Arabic clues. Existing variant splitting and candidate deduplication remain runtime behavior, never destructive edits to the master. AR→EN still selects the first eligible meaning, as before; this migration does not decide which meaning is best.
- `scripts/dictionary-tools.ts`: reads old `item.answer`/`item.clue` only for migration and equivalence auditing.
- `benchmarks/fixtures/legacy-generate.ts`: intentionally retains its historical `DictMeaning` and raw source for reproducible historical API comparisons.
- `tests/fixtures/legacy-candidates.ts`: freezes the pre-migration candidate preparation for exact comparison, never imported by production.
- `benchmarks/crossword.benchmark.ts`: fingerprints both the new master/schema and the old raw source to distinguish benchmark inputs.
- Client `WordClue.answer`/`clue`, worker protocol, crossword construction, inversion, cursor behavior and UI remain unchanged by this migration. Candidate pairs still need an answer and clue; this restriction applies to master dictionary storage, not API puzzle records.

The tests verify every migrated relationship, exact full candidate indexes for all 24 size/mode/band configurations, multiword/single-word normalization and display in both modes, reverse lookup multiplicity, future approved-MSA filtering, mismatch detection, and non-destructive audit flags.
