import type { VercelRequest, VercelResponse } from '@vercel/node';
import { HfInference } from '@huggingface/inference';

type Mode = 'en_to_ar' | 'ar_to_en';
type Band = 'beginner' | 'intermediate' | 'advanced';

function bandToCefr(b: Band): string {
  switch (b) {
    case 'beginner':
      return 'A1-A2';
    case 'intermediate':
      return 'B1-B2';
    case 'advanced':
      return 'C1-C2';
  }
}

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

function normalizeArabicWord(s: string) {
  return s
    .trim()
    .replace(/\s+/g, '')
    .replace(/[ـ\u064B-\u065F\u0670]/g, '') // tatweel + harakat
    .replace(/[\u061F\u060C\u06D4\u066B\u066C\u06D4.,;:!\-_/()\[\]{}"'`~@#$%^&*+=<>؟،]/g, '')
    .toUpperCase();
}

async function flanGenerateWordList(hf: HfInference, cefr: string, count: number) {
  const prompt = [
    'Return ONLY valid JSON.',
    `Give exactly ${count} common English vocabulary words for CEFR ${cefr}.`,
    'Rules:',
    '- Output must be a JSON array of strings.',
    '- Single words only (no spaces, no hyphens).',
    '- No duplicates.',
  ].join('\n');

  const out = await hf.textGeneration({
    model: 'google/flan-t5-base',
    inputs: prompt,
    parameters: {
      max_new_tokens: 400,
      temperature: 0.2,
      return_full_text: false,
    },
  });

  const text = (out.generated_text || '').trim();
  const parsed = JSON.parse(text);
  if (!Array.isArray(parsed)) throw new Error('word list is not an array');
  return parsed.map((x) => String(x));
}

async function translateEnToAr(hf: HfInference, english: string) {
  const out = await hf.translation({
    model: 'Helsinki-NLP/opus-mt-en-ar',
    inputs: english,
  });
  return (out.translation_text || '').trim();
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });

    const token = process.env.HF_TOKEN;
    if (!token) return json(res, 500, { error: 'Missing HF_TOKEN env var on server' });

    const { size, mode, band } = (req.body || {}) as { size?: number; mode?: Mode; band?: Band };

    const gridSize = Number(size);
    if (![5, 7, 9, 11, 13].includes(gridSize)) return json(res, 400, { error: 'Invalid size' });
    if (mode !== 'en_to_ar' && mode !== 'ar_to_en') return json(res, 400, { error: 'Invalid mode' });
    if (band !== 'beginner' && band !== 'intermediate' && band !== 'advanced') return json(res, 400, { error: 'Invalid band' });

    const cefr = bandToCefr(band);
    const hf = new HfInference(token);

    // Generate a pool bigger than needed; crossword layout will drop some.
    const poolCount = Math.max(18, Math.min(40, gridSize * 3));
    const words = await flanGenerateWordList(hf, cefr, poolCount);

    const pairs: Array<{ clue: string; answer: string }> = [];
    const seen = new Set<string>();

    for (const w of words) {
      const en = normalizeEnglishWord(w);
      if (en.length < 2 || en.length > gridSize) continue;
      if (seen.has(en)) continue;

      const arRaw = await translateEnToAr(hf, en.toLowerCase());
      const ar = normalizeArabicWord(arRaw);
      if (!ar || ar.length < 2 || ar.length > gridSize) continue;

      seen.add(en);

      if (mode === 'en_to_ar') {
        pairs.push({ clue: en, answer: ar });
      } else {
        pairs.push({ clue: ar, answer: en });
      }

      if (pairs.length >= poolCount) break;
    }

    return json(res, 200, { entries: pairs });
  } catch (e: any) {
    return json(res, 500, { error: e?.message || String(e) });
  }
}
