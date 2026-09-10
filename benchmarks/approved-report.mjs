import { readFileSync, writeFileSync } from 'node:fs';
const directory = process.env.APPROVED_BENCH_OUTPUT ?? 'benchmarks/results/approved-current';
const summary = JSON.parse(readFileSync(`${directory}/summary.json`, 'utf8'));
const runs = JSON.parse(readFileSync(`${directory}/runs.json`, 'utf8'));
const number = value => value === null ? '—' : value.toFixed(1);
const modeName = value => value === 'en_to_ar' ? 'EN→AR' : 'AR→EN';
function wilson(successes, n) {
  const z = 1.96, p = successes / n, divisor = 1 + z * z / n;
  const middle = (p + z * z / (2 * n)) / divisor;
  const radius = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / divisor;
  return [Math.max(0, 100 * (middle - radius)), Math.min(100, 100 * (middle + radius))];
}
const lines = ['# Measured results', '', `Measured ${summary.started} through ${summary.finished}; baseline commit \`${summary.commit}\`.`, '', `Runtime ${summary.runtime}; ${summary.machine.cpu}; ${summary.machine.platform} ${summary.machine.release}.`, '', 'Generation time includes failed calls. Word and crossing statistics include successful puzzles only. Each row has 30 calls.', '', '| Grid | Mode | Policy | Success | Median ms | P95 ms | Max ms | Median words | Min words | Median crossings | Pool size |', '|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|'];
for (const size of [7, 9, 11, 13]) for (const mode of ['en_to_ar', 'ar_to_en']) for (const policy of ['compatibility', 'approved-only']) {
  const c = summary.configurations.find(c => c.size === size && c.mode === mode && c.policy === policy);
  if (!c) continue;
  lines.push(`| ${size}×${size} | ${modeName(mode)} | ${policy} | ${c.successful}/30 (${number(c.successRate)}%) | ${number(c.generationMs.median)} | ${number(c.generationMs.p95)} | ${number(c.generationMs.slowest)} | ${number(c.entries.median)} | ${c.minimumEntries ?? '—'} | ${number(c.intersections.median)} | ${number(c.candidateCount.median)} |`);
}
lines.push('', '## Approved-only readiness', '', 'Thresholds: READY ≥95%, NEARLY READY ≥80% and <95%, NOT READY <80%. Confidence intervals are 95% Wilson intervals; seed trials are a practical empirical sample, not a guarantee about real user traffic.', '', '| Grid | Mode | Assessment | Success % | 95% interval |', '|---|---|---|---:|---|');
for (const c of summary.configurations.filter(c => c.policy === 'approved-only')) lines.push(`| ${c.size}×${c.size} | ${modeName(c.mode)} | ${c.recommendation} | ${number(c.successRate)} | ${wilson(c.successful, c.attempts).map(number).join('–')}% |`);
lines.push('', '## Observed failure evidence', '', '| Policy | Mode | Reason | Failed calls |', '|---|---|---|---:|');
const failures = new Map();
for (const r of runs.filter(r => !r.success)) {
  const k = `${r.policy} | ${modeName(r.mode)} | ${r.failureReason}`;
  failures.set(k, (failures.get(k) ?? 0) + 1);
}
for (const [k, count] of failures) lines.push(`| ${k} | ${count} |`);
lines.push('', `Returned puzzles: ${runs.filter(r => r.success).length}. Returned-puzzle quality failures: ${summary.returnedPuzzleQualityFailures}. Internal validation error messages: ${runs.reduce((n, r) => n + r.validationErrors.length, 0)}.`, '', 'A deadline observation is not proof that candidate scarcity caused the failure. No vocabulary-size target can be inferred reliably from a comparison of just two differently composed pools. See README for scope and coverage limitations.', '');
writeFileSync(`${directory}/RESULTS.md`, lines.join('\n'));
