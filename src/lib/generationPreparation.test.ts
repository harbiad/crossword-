import { expect, it, vi } from 'vitest';
import { generateCrossword } from './generateCrossword';
import * as candidates from './preparedCandidates';
import * as construction from './construct';
import * as templates from './templates';

it('prepares once and reuses candidate postings and geometry across attempts and identical templates', () => {
  const grid = Array.from({ length: 7 }, () => Array<number>(7).fill(1));
  const prepare = vi.spyOn(candidates, 'prepareCandidates');
  const construct = vi.spyOn(construction, 'constructCrossword').mockReturnValue([]);
  vi.spyOn(templates, 'getTemplates').mockReturnValue([grid, grid.map(row => row.slice())]);
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  try {
    expect(generateCrossword(7, [{ answer: 'EXAMPLE', clue: 'word' }], 'ltr').entries).toEqual([]);
    expect(prepare).toHaveBeenCalledTimes(1);
    expect(construct.mock.calls.length).toBeGreaterThan(2);
    const first = construct.mock.calls[0][4]!;
    for (const call of construct.mock.calls) {
      expect(call[4]!.preparedCandidates).toBe(first.preparedCandidates);
      expect(call[4]!.preparedTemplate).toBe(first.preparedTemplate);
    }
  } finally { vi.restoreAllMocks(); }
});
