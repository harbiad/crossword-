import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getWordLevel, isLevelAllowed, type CefrLevel } from './cefr_levels.js';

export const config = {
  runtime: 'nodejs',
};

type DictMeaning = { answer: string; clue: string };
type DictValue = string | string[] | DictMeaning | DictMeaning[];
type DictMap = Record<string, DictValue>;
let cachedPrimaryDict: DictMap | null = null;

async function getPrimaryDict(): Promise<DictMap> {
  if (cachedPrimaryDict) return cachedPrimaryDict;

  const loadDict = async (candidates: string[], exportName: string): Promise<DictMap | null> => {
    for (const spec of candidates) {
      try {
        const mod = await import(spec);
        const dict = (mod as Record<string, unknown>)[exportName] as DictMap | undefined;
        if (dict && Object.keys(dict).length > 0) return dict;
      } catch {
        // try next specifier
      }
    }
    return null;
  };

  const nonEmpty = await loadDict(
    ['./DICT_COMMON_30000_non_empty', './DICT_COMMON_30000_non_empty.ts', './DICT_COMMON_30000_non_empty.js'],
    'DICT_COMMON_30000_NON_EMPTY'
  );
  if (nonEmpty) {
    cachedPrimaryDict = nonEmpty;
    return cachedPrimaryDict;
  }

  const full = await loadDict(
    ['./DICT_COMMON_30000', './DICT_COMMON_30000.ts', './DICT_COMMON_30000.js'],
    'DICT_COMMON_30000'
  );
  if (full) {
    cachedPrimaryDict = full;
    return cachedPrimaryDict;
  }

  cachedPrimaryDict = {};
  return cachedPrimaryDict;
}

type Mode = 'en_to_ar' | 'ar_to_en';
type Band = 'beginner' | 'intermediate' | 'advanced';
const MIN_ENTRIES_FOR_UI = 24;

function json(res: VercelResponse, status: number, body: any) {
  res.status(status);
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.send(JSON.stringify(body));
}

function normalizeEnglishWord(s: string) {
  return s
    .trim()
    .replace(/[^a-zA-Z]/g, '')
    .toUpperCase();
}

function normalizeArabicWord(s: unknown) {
  if (typeof s !== 'string') return '';
  const firstVariant = s.split('/')[0].split('،')[0].split(';')[0].split('|')[0];
  return firstVariant
    .trim()
    .replace(/\s+/g, '')
    .replace(/[\u0640\u064B-\u065F\u0670]/g, '') // tatweel + harakat
    .replace(/[\u061F\u060C\u06D4\u066B\u066C.,;:!\-_/()[\]{}"'`~@#$%^&*+=<>\u061F\u060C]/g, '')
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

type FilterResult = { words: string[]; usedFallback: boolean };

function buildCandidateWords(band: Band, dict: DictMap): FilterResult {
  // Build all candidate words with their index for frequency heuristic
  const allWords = Object.keys(dict);
  const seen = new Set<string>();
  const candidatesWithLevel: Array<{ word: string; level: CefrLevel }> = [];

  for (let i = 0; i < allWords.length; i++) {
    const normalized = normalizeEnglishWord(allWords[i]);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    const level = getWordLevel(normalized, i);
    candidatesWithLevel.push({ word: normalized, level });
  }

  // Filter by allowed levels for the selected band
  let filtered = candidatesWithLevel
    .filter((c) => isLevelAllowed(c.level, band))
    .map((c) => c.word);

  // Cascading fallback if too few candidates
  // Higher threshold ensures enough words for large grids (13x13 needs ~2000+ for reliable generation)
  const MIN_CANDIDATES = 1500;
  let usedFallback = false;

  if (filtered.length < MIN_CANDIDATES && band === 'beginner') {
    // Try adding intermediate words
    const withIntermediate = candidatesWithLevel
      .filter((c) => isLevelAllowed(c.level, 'intermediate'))
      .map((c) => c.word);
    if (withIntermediate.length >= MIN_CANDIDATES) {
      filtered = withIntermediate;
      usedFallback = true;
    } else {
      // Use all words
      filtered = candidatesWithLevel.map((c) => c.word);
      usedFallback = true;
    }
  } else if (filtered.length < MIN_CANDIDATES && band === 'intermediate') {
    // Use all words
    filtered = candidatesWithLevel.map((c) => c.word);
    usedFallback = true;
  }

  return { words: filtered, usedFallback };
}

function getLengthCapBySize(size: number, len: number): number {
  const midpoint = Math.ceil(size * 0.55);
  const distance = Math.abs(len - midpoint);
  const base = size <= 7 ? 659 : size <= 9 ? 857 : size <= 11 ? 1054 : 1252;
  const cap = base - distance * 32;
  return Math.max(80, cap);
}

function getMeanings(dict: DictMap, en: string): DictMeaning[] {
  const val = dict[en];
  if (!val) return [];
  const arr = Array.isArray(val) ? val : [val];
  return arr
    .map((v) => {
      if (typeof v === 'string') {
        return { answer: normalizeArabicWord(v), clue: v };
      }
      const clueRaw = typeof v?.clue === 'string' ? v.clue.trim() : '';
      const clue = clueRaw === '[]' ? '' : clueRaw;
      const answer = normalizeArabicWord(v?.answer);
      return { answer, clue };
    })
    .filter((m) => m.answer.length >= 2);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const isRepeatedToken = (s: string) => /^([A-Z])\1+$/.test(s.trim().toUpperCase());

  const buildEmergencyEntries = (mode: Mode, gridSize: number, dict: DictMap) => {
    const entries: Array<{ clue: string; answer: string }> = [];
    for (const [en] of Object.entries(dict)) {
      const enNorm = normalizeEnglishWord(en);
      if (enNorm.length < 2 || enNorm.length > gridSize) continue;
      if (isRepeatedToken(enNorm)) continue;
      const meanings = getMeanings(dict, enNorm);
      for (const m of meanings) {
        if (!m.clue || m.clue === '[]') continue;
        if (m.answer.length < 2 || m.answer.length > gridSize) continue;
        entries.push(mode === 'en_to_ar' ? { clue: enNorm, answer: m.answer } : { clue: m.clue || m.answer, answer: enNorm });
      }
      if (entries.length >= 300) break;
    }
    return entries;
  };

  try {
    if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });

    const { size, mode, band } = (req.body || {}) as { size?: number; mode?: Mode; band?: Band };

    const gridSize = Number(size);
    if (![7, 9, 11, 13].includes(gridSize)) return json(res, 400, { error: 'Invalid size' });
    if (mode !== 'en_to_ar' && mode !== 'ar_to_en') return json(res, 400, { error: 'Invalid mode' });
    if (band !== 'beginner' && band !== 'intermediate' && band !== 'advanced') return json(res, 400, { error: 'Invalid band' });

    await getPrimaryDict();

    // Use primary dictionary with CEFR filtering
    const dict = cachedPrimaryDict ?? {};
    const { words: baseList, usedFallback: cefrFallback } = buildCandidateWords(band, dict);

    const pairs: Array<{ clue: string; answer: string; isRepeatedLetter?: boolean }> = [];
    const seenPair = new Set<string>();
    const answerLengthCount = new Map<number, number>();
    const targetPairs = 10546;
    const shuffledBase = shuffle(baseList);
    const clueUseCount = new Map<string, number>();
    const deferredClueRepeats: Array<{ clue: string; answer: string; answerLen: number }> = [];

    for (const w of shuffledBase) {
      const en = normalizeEnglishWord(w);
      if (en.length < 2 || en.length > gridSize) continue;

      const meanings = getMeanings(dict, en);
      if (!meanings.length) continue;

      for (const meaning of meanings) {
        const ar = meaning.answer;
        if (!ar || ar.length < 2 || ar.length > gridSize) continue;

        const answer = mode === 'en_to_ar' ? ar : en;
        const clue = mode === 'en_to_ar' ? en : (meaning.clue || ar);
        const answerLen = answer.length;
        if (answerLen < 2 || answerLen > gridSize) continue;

        const capForLen = getLengthCapBySize(gridSize, answerLen);
        const curLenCount = answerLengthCount.get(answerLen) ?? 0;
        if (curLenCount >= capForLen) continue;

        const pairKey = `${clue}::${answer}`;
        if (seenPair.has(pairKey)) continue;
        seenPair.add(pairKey);

        const clueCount = clueUseCount.get(clue) ?? 0;
        if (clueCount === 0) {
          pairs.push({ clue, answer });
          answerLengthCount.set(answerLen, curLenCount + 1);
          clueUseCount.set(clue, 1);
        } else if (clueCount === 1) {
          deferredClueRepeats.push({ clue, answer, answerLen });
        }
      }
      if (pairs.length >= targetPairs) break;
    }

    if (pairs.length < targetPairs && deferredClueRepeats.length) {
      for (const item of shuffle(deferredClueRepeats)) {
        if (pairs.length >= targetPairs) break;
        const curClueCount = clueUseCount.get(item.clue) ?? 0;
        if (curClueCount >= 2) continue;
        const capForLen = getLengthCapBySize(gridSize, item.answerLen);
        const curLenCount = answerLengthCount.get(item.answerLen) ?? 0;
        if (curLenCount >= capForLen) continue;
        pairs.push({ clue: item.clue, answer: item.answer });
        answerLengthCount.set(item.answerLen, curLenCount + 1);
        clueUseCount.set(item.clue, curClueCount + 1);
      }
    }

    if (pairs.length < MIN_ENTRIES_FOR_UI) {
      const emergency = buildEmergencyEntries(mode, gridSize, dict);
      if (emergency.length >= MIN_ENTRIES_FOR_UI) {
        return json(res, 200, { entries: emergency, fallback: true, source: 'emergency_dict' });
      }
      return json(res, 200, { entries: [], fallback: true, warning: 'No entries generated from local dictionaries.' });
    }

    return json(res, 200, cefrFallback ? { entries: pairs, fallback: true, source: 'cefr_cascade' } : { entries: pairs });
  } catch (e: any) {
    try {
      const { size, mode } = (req.body || {}) as { size?: number; mode?: Mode };
      const gridSize = [7, 9, 11, 13].includes(Number(size)) ? Number(size) : 7;
      const safeMode: Mode = mode === 'ar_to_en' ? 'ar_to_en' : 'en_to_ar';
      const dict = await getPrimaryDict();
      const emergency = buildEmergencyEntries(safeMode, gridSize, dict);
      if (emergency.length >= MIN_ENTRIES_FOR_UI) {
        return json(res, 200, { entries: emergency, fallback: true, source: 'emergency_dict_catch' });
      }
    } catch {
      // ignore and return 500 below
    }
    return json(res, 500, { error: e?.message || String(e), stage: 'handler' });
  }
}
