import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createCandidateIndex, selectCandidates, type Mode, type Band } from './_lib/candidates.js';
import { DICTIONARY_BATCH003_QA } from './_lib/dictionary.stage3b.batch003.qa.generated.js';

export const config = {
  runtime: 'nodejs',
};

const MIN_ENTRIES_FOR_UI = 24;
// Warm processes reuse normalized dictionary metadata and eligibility buckets.
// Review/uncertain data remains eligible explicitly during staged curation.
// Rejected headwords/relationships and known dialect are excluded in both modes.
const candidateIndex = createCandidateIndex(DICTIONARY_BATCH003_QA, 'compatibility');
// Smallest tested pool retaining baseline success in every size/mode.
// See benchmarks/results/api-optimization.md for the seeded comparison.
const TARGET_PAIRS = 2000;

function json(res: VercelResponse, status: number, body: unknown) {
  res.status(status);
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.send(JSON.stringify(body));
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });

    const { size, mode, band } = (req.body || {}) as { size?: number; mode?: Mode; band?: Band };

    const gridSize = Number(size);
    if (![7, 9, 11, 13].includes(gridSize)) return json(res, 400, { error: 'Invalid size' });
    if (mode !== 'en_to_ar' && mode !== 'ar_to_en') return json(res, 400, { error: 'Invalid mode' });
    if (band !== 'beginner' && band !== 'intermediate' && band !== 'advanced') return json(res, 400, { error: 'Invalid band' });

    const pairs = selectCandidates(candidateIndex, gridSize, mode, band, TARGET_PAIRS);

    if (pairs.length < MIN_ENTRIES_FOR_UI) {
      return json(res, 200, { entries: [], warning: 'No entries generated from DICT_COMMON_30000_NON_EMPTY.' });
    }

    return json(res, 200, { entries: pairs });
  } catch (e: unknown) {
    return json(res, 500, { error: e instanceof Error ? e.message : String(e) });
  }
}
