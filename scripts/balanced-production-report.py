"""Summarize the unchanged-seed production promotion; no generation or data edits."""
import csv
import hashlib
import json
from pathlib import Path
from statistics import median

root = Path('template_family_13x13/production')
read = lambda p: json.loads(Path(p).read_text())
after = read(root / 'after/summary.json')
before = read('template_feasibility_13x13/after/summary.json')
experiment = read('template_family_13x13/comparison.json')

def write_csv(name, rows):
    with (root / name).open('w', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=list(rows[0]))
        writer.writeheader()
        writer.writerows(rows)

rows = []
for current in after['configurations']:
    old = next(c for c in before['configurations'] if all(c[k] == current[k] for k in ['size', 'mode', 'policy']))
    row = {k: current[k] for k in ['size', 'mode', 'policy']}
    for label, c in [('before', old), ('after', current)]:
        row.update({f'{label}_success': c['successful'], f'{label}_median_ms': c['generationMs']['median'],
                    f'{label}_p95_ms': c['generationMs']['p95'], f'{label}_words': c['entries']['median'],
                    f'{label}_intersections': c['intersections']['median']})
    rows.append(row)
write_csv('before_after.csv', rows)
quality = []
for policy in ['approved-only', 'compatibility']:
    old = [r for r in experiment if r['family'] == 'current' and r['policy'] == policy]
    good = [r for r in old if r['success']]
    c = next(c for c in after['configurations'] if c['size'] == 13 and c['mode'] == 'ar_to_en' and c['policy'] == policy)
    quality.append({'policy': policy, 'before_success': len(good), 'after_success': c['successful'],
                    'before_median_ms': median(r['ms'] for r in old), 'after_median_ms': c['generationMs']['median'],
                    'before_p95_ms': sorted(r['ms'] for r in old)[28], 'after_p95_ms': c['generationMs']['p95'],
                    **{f'before_{name}': median(r[field] for r in good) if good else None for name, field in [('words', 'words'), ('intersections', 'intersections'), ('white_pct', 'whitePct'), ('crossed_pct', 'checkedPct')]},
                    **{f'after_{name}': c[field]['median'] for name, field in [('words', 'entries'), ('intersections', 'intersections'), ('white_pct', 'whitePct'), ('crossed_pct', 'crossedPct')]},
                    'distinct_layouts': c['distinctLayouts']})
write_csv('13x13_quality.csv', quality)
# Validate the protected production inputs and exact validator text against the experiment.
inputs = read('template_family_13x13/input_hashes.json')
protected = {p: hashlib.sha256(Path(p).read_bytes()).hexdigest() == h for p, h in inputs.items()
             if p not in ['src/lib/generateCrossword.ts', 'src/lib/templates.ts']}
assert all(protected.values()), protected
old_generator = Path('template_family_13x13/baseline/generateCrossword.txt').read_text()
new_generator = Path('src/lib/generateCrossword.ts').read_text()
# Everything above generation, including all validation/build/numbering helpers, is byte-identical.
validation_prefix = lambda s: s[s.index('export type WordClue'):s.index('export function generateCrossword')]
assert validation_prefix(old_generator) == validation_prefix(new_generator)
summary = {'scope': 'production 13x13 LTR template family only', 'seeds': after['seeds'], 'runs': 480,
           'warmups': 16, 'qualityFailures': after['returnedPuzzleQualityFailures'], 'minimumEnglishAnswerLength': 3,
           'validatorUnchanged': True, 'compatibilityProductionEnabled': True, 'protectedInputs': protected,
           'fullComparisonBaseline': 'template_feasibility_13x13/after',
           'qualityComparisonBaseline': 'template_family_13x13/comparison.json (current family)',
           'comparison': rows, 'quality13x13': quality}
(root / 'summary.json').write_text(json.dumps(summary, indent=2) + '\n')
lines = ['# Production balanced 13×13 English templates', '',
         'The validated symmetric family is now selected only for 13×13 AR→EN. Minimum answer length remains three; no two-letter English entries are enabled. Compatibility remains the production dictionary policy.', '',
         '## Implementation', '',
         '`getBalancedEnglishTemplates13` generates 24 fresh symmetric layouts with the existing 30% block ceiling, maximum two consecutive blocks and connected white cells. Perpendicular singleton runs are permitted only when the cell belongs to another 3+ entry. Layouts exceeding 60% three-letter clues are filtered without refilling. All returned puzzles pass the unchanged validator, including entry-graph connectivity, numbering, clue/run matching and canonical-answer uniqueness.', '',
         'The production code has no imports from experimental tooling and no global experimental switches. Template and candidate RNG streams remain independent. Other sizes and RTL retain their previous template generation, random call sequence and search settings. No solver budgets, dictionary decisions or UI behavior changed.', '',
         '## Reproduction', '', '```sh',
         'APPROVED_BENCH_OUTPUT=template_family_13x13/production/after npm run bench:approved',
         'python3 scripts/balanced-production-report.py',
         'npm run dictionary:audit', 'npm test', 'npm run lint', 'npm run build', '```', '',
         'Thirty identical seeds (1–30), plus excluded seed-0 warmups, for all 16 configurations: 480 measured calls. Same advanced band, API limits and wall-clock solver budgets as the archived baseline. No network or concurrent benchmark processes. All timings include unsuccessful calls; puzzle quality medians include successes only.', '',
         'The full comparison uses the prior all-configuration run in `template_feasibility_13x13/after`. The focused quality comparison uses the later paired current-family control in `template_family_13x13/comparison.json`, which also recorded cell coverage. These are historical measured baselines, not simultaneous runs. Wall-clock deadlines can change individual outcomes on unchanged paths.', '',
         '| Grid | Mode | Policy | Success before → after | Median ms before → after | P95 ms before → after |',
         '|---|---|---|---:|---:|---:|']
for r in sorted(rows, key=lambda r: (r['size'], r['mode'], r['policy'])):
    lines.append(f"| {r['size']} | {r['mode']} | {r['policy']} | {r['before_success']}/30 → {r['after_success']}/30 | {r['before_median_ms']:.1f} → {r['after_median_ms']:.1f} | {r['before_p95_ms']:.1f} → {r['after_p95_ms']:.1f} |")
lines += ['', 'See `13x13_quality.csv` for word/crossing counts and white/crossed-cell percentages; `after/RESULTS.md` for all current measurements; `summary.json` for protected-input checks. The original experiment, two-letter controls and reports remain archived in the parent directory. No two-letter control is part of production.', '']
(root / 'README.md').write_text('\n'.join(lines))
