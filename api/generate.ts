import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getWordLevel, isLevelAllowed, type CefrLevel } from './cefr_levels.js';
import { DICT_COMMON_30000_NON_EMPTY } from './DICT_COMMON_30000_non_empty.js';

export const config = {
  runtime: 'nodejs',
};

type DictMeaning = { answer: string; clue: string };
type Mode = 'en_to_ar' | 'ar_to_en';
type Band = 'beginner' | 'intermediate' | 'advanced';

const MIN_ENTRIES_FOR_UI = 24;
const TARGET_PAIRS = 3000;

function json(res: VercelResponse, status: number, body: unknown) {
  res.status(status);
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.send(JSON.stringify(body));
}

function normalizeEnglishWord(s: string) {
  return s.trim().replace(/[^a-zA-Z]/g, '').toUpperCase();
}

function normalizeArabicWord(s: string) {
  return s
    .trim()
    .replace(/\s+/g, '')
    .replace(/[ـ\u064B-\u065F\u0670]/g, '')
    .replace(/[\u061F\u060C\u06D4\u066B\u066C.,;:!\-_/()[\]{}\"'`~@#$%^&*+=<>]/g, '')
    .toUpperCase();
}

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildCandidateWords(band: Band): string[] {
  const allWords = Object.keys(DICT_COMMON_30000_NON_EMPTY);
  const seen = new Set<string>();
  const candidatesWithLevel: Array<{ word: string; level: CefrLevel }> = [];

  for (let i = 0; i < allWords.length; i++) {
    const normalized = normalizeEnglishWord(allWords[i]);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    const level = getWordLevel(normalized, i);
    candidatesWithLevel.push({ word: normalized, level });
  }

  let filtered = candidatesWithLevel
    .filter((c) => isLevelAllowed(c.level, band))
    .map((c) => c.word);

  // Keep generation reliable when level-filtered set is too small.
  if (filtered.length < 1200 && band !== 'advanced') {
    filtered = candidatesWithLevel.map((c) => c.word);
  }

  return filtered;
}

function getMeanings(en: string): DictMeaning[] {
  const val = DICT_COMMON_30000_NON_EMPTY[en];
  if (!val) return [];

  const out: DictMeaning[] = [];
  const seen = new Set<string>();

  for (const item of val) {
    const clueRaw = (item?.clue ?? '').trim();
    const answerRaw = item?.answer ?? '';
    if (!answerRaw) continue;

    const clue = clueRaw && clueRaw !== '[]' ? clueRaw : answerRaw;
    const variants = answerRaw.split(/[\/،;|]/).map((s) => s.trim()).filter(Boolean);

    for (const v of variants) {
      const answer = normalizeArabicWord(v);
      if (answer.length < 2) continue;
      if (seen.has(answer)) continue;
      seen.add(answer);
      out.push({ answer, clue });
    }
  }

  return out;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });

    const { size, mode, band } = (req.body || {}) as { size?: number; mode?: Mode; band?: Band };

    const gridSize = Number(size);
    if (![7, 9, 11, 13].includes(gridSize)) return json(res, 400, { error: 'Invalid size' });
    if (mode !== 'en_to_ar' && mode !== 'ar_to_en') return json(res, 400, { error: 'Invalid mode' });
    if (band !== 'beginner' && band !== 'intermediate' && band !== 'advanced') return json(res, 400, { error: 'Invalid band' });

    const baseList = buildCandidateWords(band);
    const pairs: Array<{ clue: string; answer: string }> = [];
    const seenPair = new Set<string>();

    for (const w of shuffle(baseList)) {
      const en = normalizeEnglishWord(w);
      if (en.length < 2 || en.length > gridSize) continue;

      const meanings = getMeanings(en);
      if (!meanings.length) continue;

      for (const meaning of meanings) {
        const ar = meaning.answer;
        if (!ar || ar.length < 2 || ar.length > gridSize) continue;

        const clue = mode === 'en_to_ar' ? en : meaning.clue;
        if (/repeated/i.test(clue)) continue;

        const answer = mode === 'en_to_ar' ? ar : en;
        const key = `${clue}::${answer}`;
        if (seenPair.has(key)) continue;
        seenPair.add(key);
        pairs.push({ clue, answer });
      }

      if (pairs.length >= TARGET_PAIRS) break;
    }

    if (pairs.length < MIN_ENTRIES_FOR_UI) {
      return json(res, 200, { entries: [], warning: 'No entries generated from DICT_COMMON_30000_NON_EMPTY.' });
    }

    return json(res, 200, { entries: pairs });
  } catch (e: any) {
    return json(res, 500, { error: e?.message || String(e) });
  }
}
