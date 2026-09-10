import { expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import * as templates from '../src/lib/templates';
import { getBalancedEnglishTemplates13, getTemplates } from '../src/lib/templates';
import { generationRandom } from '../src/lib/generationRandom';
import { generateCrossword, validatePuzzle } from '../src/lib/generateCrossword';
import { getEntryCellAt } from '../src/lib/crossword';
import { DICTIONARY_BATCH006_QA as dictionary } from '../api/_lib/dictionary.stage3b.batch006.qa.generated';
import { createCandidateIndex, selectCandidates } from '../api/_lib/candidates';
import { candidatePoolLimit } from '../api/_lib/candidatePool';
import { configure, getNYTTemplate as experimentalSymmetric, getTemplate as experimentalTemplate } from '../benchmarks/template-families/layouts';
const random = (seed: number) => () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
const signature = (t: number[][]) => t.map(r => r.join('')).join('/');

it('production reproduces all 30 validated balanced template families exactly', () => {
  const records = JSON.parse(readFileSync('template_family_13x13/balanced-templates.json', 'utf8')) as {seed: number; policy: string; signatures: string[]}[];
  for (const row of records.filter(r => r.policy === 'approved-only')) {
    const streams = generationRandom(Math.floor(random(row.seed)() * 4294967296));
    expect(getBalancedEnglishTemplates13(24, streams.templates).map(signature)).toEqual(row.signatures);
  }
});

it('other sizes and RTL retain the original template algorithm and random call order', () => {
  const original = Math.random;
  configure({ density: .30, unchecked: false });
  try {
    for (const size of [7, 9, 11, 13]) for (const min of [2, 3]) {
      if (size === 13 && min === 3) continue;
      Math.random = random(123);
      const expected = Array.from({ length: 6 }, () => Math.random() < .5 ? experimentalSymmetric(size, min) : experimentalTemplate(size, min));
      expect(getTemplates(size, min, 6, random(123))).toEqual(expected);
    }
  } finally { Math.random = original; }
});

it('production solves diverse approved English grids with single-entry cells, canonical inversion and no short/duplicate answers', () => {
  const index = createCandidateIndex(dictionary, 'approved-only');
  const original = Math.random, layouts = new Set<string>(), invertedDirections = new Set<string>();
  try {
    for (const seed of [1, 2, 3, 4]) {
      Math.random = random(seed);
      const pairs = selectCandidates(index, 13, 'ar_to_en', 'advanced', candidatePoolLimit(13, 'ar_to_en'));
      Math.random = random(seed);
      const cw = generateCrossword(13, pairs, 'ltr');
      expect(cw.entries.length).toBeGreaterThan(0);
      expect(validatePuzzle(cw.grid, cw.entries, 'ltr').errors).toEqual([]);
      expect(cw.grid.flat().some(c => c.type === 'letter' && c.entries.size === 1)).toBe(true);
      expect(cw.entries.every(e => e.answer.length >= 3)).toBe(true);
      expect(cw.entries.filter(e => e.answer.length === 3).length / cw.entries.length).toBeLessThanOrEqual(.60);
      expect(new Set(cw.entries.map(e => e.answer)).size).toBe(cw.entries.length);
      const eligible = new Set(pairs.map(p => JSON.stringify([p.answer, p.clue.trim()])));
      for (const e of cw.entries) {
        expect(eligible.has(JSON.stringify([e.answer, e.clue]))).toBe(true);
        if (e.isInverted) invertedDirections.add(e.direction);
        for (let i = 0; i < e.answer.length; i++) {
          const { r, c } = getEntryCellAt(e, i, 'ltr');
          const cell = cw.grid[r][c];
          expect(cell.type === 'letter' && cell.char === e.answer[i] && cell.entries.has(e.id)).toBe(true);
        }
      }
      layouts.add(signature(cw.grid.map(row => row.map(c => Number(c.type === 'letter')))));
    }
  } finally { Math.random = original; }
  expect(layouts.size).toBe(4);
  expect([...invertedDirections].sort()).toEqual(['across', 'down']);
});

it('routes only 13x13 LTR to the balanced family', () => {
  const legacy = vi.spyOn(templates, 'getTemplates').mockReturnValue([]);
  const balanced = vi.spyOn(templates, 'getBalancedEnglishTemplates13').mockReturnValue([]);
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  try {
    for (const size of [7, 9, 11, 13]) for (const direction of ['rtl', 'ltr'] as const) {
      legacy.mockClear(); balanced.mockClear();
      generateCrossword(size, [], direction);
      const special = size === 13 && direction === 'ltr';
      expect(balanced).toHaveBeenCalledTimes(special ? 1 : 0);
      expect(legacy).toHaveBeenCalledTimes(special ? 0 : 1);
      if (!special) expect(legacy).toHaveBeenCalledWith(size, direction === 'ltr' ? 3 : 2, direction === 'ltr' ? 24 : 6, undefined);
    }
  } finally { vi.restoreAllMocks(); }
});
