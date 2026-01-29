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

const WORDS_A1_A2 = [
  'family','friend','school','teacher','student','book','pen','paper','phone','computer','music','movie','food','water','coffee','tea','bread','rice','fruit','apple','banana','orange','vegetable','meat','fish','milk','cheese','egg','sugar','salt','city','street','house','home','room','door','window','car','bus','train','airport','hotel','market','shop','money','price','today','tomorrow','yesterday','morning','evening','night','week','month','year','happy','sad','tired','hungry','thirsty','hot','cold','big','small','good','bad','new','old','fast','slow','right','left','open','close','start','stop','work','study','read','write','speak','listen','walk','run'
];

const WORDS_B1_B2 = [
  'advice','argument','attitude','balance','benefit','career','choice','culture','damage','decision','demand','detail','effort','energy','experience','freedom','goal','habit','health','history','identity','improve','increase','influence','interest','knowledge','language','manage','method','opinion','patient','pattern','perform','policy','prepare','pressure','problem','process','project','quality','reason','reduce','respect','result','routine','science','society','solution','strength','support','system','technology','tradition','traffic','training','travel','value','weather','worry','discover','discuss','develop','explain','imagine','consider','compare','protect','recommend','require','suggest'
];

const WORDS_C1_C2 = [
  'abrupt','allocate','ambiguous','analogy','analyze','anticipate','assess','assumption','bias','coherent','comprehensive','consequence','controversy','criteria','dilemma','distinction','domestic','emerge','emphasis','ethical','evaluate','exaggerate','framework','generate','hypothesis','inevitable','inhibit','innovative','integrity','interpret','justify','legitimate','maintain','negligible','notion','paradox','perspective','phenomenon','precise','prevalent','prioritize','relevant','resilient','sophisticated','subtle','sustain','transform','undermine','viable','vulnerable','whereas','notwithstanding','contemporary','meticulous','intricate','ubiquitous'
];

function pickWordList(cefr: string): string[] {
  if (cefr === 'A1-A2') return WORDS_A1_A2;
  if (cefr === 'B1-B2') return WORDS_B1_B2;
  return WORDS_C1_C2;
}

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const EN_AR_OVERRIDES: Record<string, string> = {
  HOT: 'حار',
  COLD: 'بارد',
  SCHOOL: 'مدرسة',
  YEAR: 'سنة',
  FRIEND: 'صديق',
  HOUSE: 'بيت',
  BUS: 'حافلة',
};

async function translateEnToAr(hf: HfInference, englishUpper: string) {
  const override = EN_AR_OVERRIDES[englishUpper];
  if (override) return override;

  const out = await hf.translation({
    model: 'Helsinki-NLP/opus-mt-en-ar',
    inputs: englishUpper.toLowerCase(),
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
    if (![7, 9, 11, 13].includes(gridSize)) return json(res, 400, { error: 'Invalid size' });
    if (mode !== 'en_to_ar' && mode !== 'ar_to_en') return json(res, 400, { error: 'Invalid mode' });
    if (band !== 'beginner' && band !== 'intermediate' && band !== 'advanced') return json(res, 400, { error: 'Invalid band' });

    const cefr = bandToCefr(band);
    const hf = new HfInference(token);

    // Use built-in CEFR word lists (HF free-tier doesn't always host generator models).
    const poolCount = Math.max(18, Math.min(40, gridSize * 3));
    const baseList = pickWordList(cefr);
    const words = shuffle(baseList).slice(0, Math.min(baseList.length, poolCount * 2));

    const pairs: Array<{ clue: string; answer: string }> = [];
    const seen = new Set<string>();

    for (const w of words) {
      const en = normalizeEnglishWord(w);
      if (en.length < 2 || en.length > gridSize) continue;
      if (seen.has(en)) continue;

      const arRaw = await translateEnToAr(hf, en);
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
