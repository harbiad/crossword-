import type { VercelRequest, VercelResponse } from '@vercel/node';

export const config = {
  runtime: 'nodejs',
};

// Inline dictionaries (Vercel doesn't bundle _prefixed imports correctly)
const DICT_A1_A2: Record<string, string> = {
  FAMILY: '\u0639\u0627\u0626\u0644\u0629',
  FRIEND: '\u0635\u062f\u064a\u0642',
  SCHOOL: '\u0645\u062f\u0631\u0633\u0629',
  TEACHER: '\u0645\u0639\u0644\u0645',
  STUDENT: '\u0637\u0627\u0644\u0628',
  BOOK: '\u0643\u062a\u0627\u0628',
  PEN: '\u0642\u0644\u0645',
  PAPER: '\u0648\u0631\u0642',
  PHONE: '\u0647\u0627\u062a\u0641',
  COMPUTER: '\u0643\u0645\u0628\u064a\u0648\u062a\u0631',
  MUSIC: '\u0645\u0648\u0633\u064a\u0642\u0649',
  MOVIE: '\u0641\u064a\u0644\u0645',
  FOOD: '\u0637\u0639\u0627\u0645',
  WATER: '\u0645\u0627\u0621',
  COFFEE: '\u0642\u0647\u0648\u0629',
  TEA: '\u0634\u0627\u064a',
  BREAD: '\u062e\u0628\u0632',
  RICE: '\u0623\u0631\u0632',
  FRUIT: '\u0641\u0627\u0643\u0647\u0629',
  APPLE: '\u062a\u0641\u0627\u062d',
  BANANA: '\u0645\u0648\u0632',
  ORANGE: '\u0628\u0631\u062a\u0642\u0627\u0644',
  VEGETABLE: '\u062e\u0636\u0627\u0631',
  MEAT: '\u0644\u062d\u0645',
  FISH: '\u0633\u0645\u0643',
  MILK: '\u062d\u0644\u064a\u0628',
  CHEESE: '\u062c\u0628\u0646',
  EGG: '\u0628\u064a\u0636',
  SUGAR: '\u0633\u0643\u0631',
  SALT: '\u0645\u0644\u062d',
  CITY: '\u0645\u062f\u064a\u0646\u0629',
  STREET: '\u0634\u0627\u0631\u0639',
  HOUSE: '\u0628\u064a\u062a',
  HOME: '\u0645\u0646\u0632\u0644',
  ROOM: '\u063a\u0631\u0641\u0629',
  DOOR: '\u0628\u0627\u0628',
  WINDOW: '\u0646\u0627\u0641\u0630\u0629',
  CAR: '\u0633\u064a\u0627\u0631\u0629',
  BUS: '\u062d\u0627\u0641\u0644\u0629',
  TRAIN: '\u0642\u0637\u0627\u0631',
  AIRPORT: '\u0645\u0637\u0627\u0631',
  HOTEL: '\u0641\u0646\u062f\u0642',
  MARKET: '\u0633\u0648\u0642',
  SHOP: '\u0645\u062a\u062c\u0631',
  MONEY: '\u0645\u0627\u0644',
  PRICE: '\u0633\u0639\u0631',
  TODAY: '\u0627\u0644\u064a\u0648\u0645',
  TOMORROW: '\u063a\u062f\u0627\u064b',
  YESTERDAY: '\u0623\u0645\u0633',
  MORNING: '\u0635\u0628\u0627\u062d',
  EVENING: '\u0645\u0633\u0627\u0621',
  NIGHT: '\u0644\u064a\u0644',
  WEEK: '\u0623\u0633\u0628\u0648\u0639',
  MONTH: '\u0634\u0647\u0631',
  YEAR: '\u0633\u0646\u0629',
  HAPPY: '\u0633\u0639\u064a\u062f',
  SAD: '\u062d\u0632\u064a\u0646',
  TIRED: '\u0645\u062a\u0639\u0628',
  HUNGRY: '\u062c\u0627\u0626\u0639',
  THIRSTY: '\u0639\u0637\u0634\u0627\u0646',
  HOT: '\u062d\u0627\u0631',
  COLD: '\u0628\u0627\u0631\u062f',
  BIG: '\u0643\u0628\u064a\u0631',
  SMALL: '\u0635\u063a\u064a\u0631',
  GOOD: '\u062c\u064a\u062f',
  BAD: '\u0633\u064a\u0626',
  NEW: '\u062c\u062f\u064a\u062f',
  OLD: '\u0642\u062f\u064a\u0645',
  FAST: '\u0633\u0631\u064a\u0639',
  SLOW: '\u0628\u0637\u064a\u0621',
  RIGHT: '\u064a\u0645\u064a\u0646',
  LEFT: '\u064a\u0633\u0627\u0631',
  OPEN: '\u0627\u0641\u062a\u062d',
  CLOSE: '\u0623\u063a\u0644\u0642',
  START: '\u0627\u0628\u062f\u0623',
  STOP: '\u062a\u0648\u0642\u0641',
  WORK: '\u0639\u0645\u0644',
  STUDY: '\u064a\u062f\u0631\u0633',
  READ: '\u064a\u0642\u0631\u0623',
  WRITE: '\u064a\u0643\u062a\u0628',
  SPEAK: '\u064a\u062a\u0643\u0644\u0645',
  LISTEN: '\u064a\u0633\u062a\u0645\u0639',
  WALK: '\u064a\u0645\u0634\u064a',
  RUN: '\u064a\u062c\u0631\u064a',
  // Additional short words for better crossword fill
  NO: '\u0644\u0627',
  GO: '\u0627\u0630\u0647\u0628',
  UP: '\u0641\u0648\u0642',
  IN: '\u0641\u064a',
  ON: '\u0639\u0644\u0649',
  SUN: '\u0634\u0645\u0633',
  SKY: '\u0633\u0645\u0627\u0621',
  AIR: '\u0647\u0648\u0627\u0621',
  BOY: '\u0648\u0644\u062f',
  MAN: '\u0631\u062c\u0644',
  DAY: '\u064a\u0648\u0645',
  EAT: '\u0627\u0643\u0644',
  SEE: '\u0627\u0631\u0649',
  SIT: '\u0627\u062c\u0644\u0633',
  CUT: '\u0642\u0637\u0639',
  GIRL: '\u0628\u0646\u062a',
  BABY: '\u0637\u0641\u0644',
  BIRD: '\u0637\u0627\u0626\u0631',
  TREE: '\u0634\u062c\u0631\u0629',
  RAIN: '\u0645\u0637\u0631',
  SNOW: '\u062b\u0644\u062c',
  WIND: '\u0631\u064a\u062d',
  BLUE: '\u0627\u0632\u0631\u0642',
  KING: '\u0645\u0644\u0643',
  LOVE: '\u062d\u0628',
  NAME: '\u0627\u0633\u0645',
  HAND: '\u064a\u062f',
  HEAD: '\u0631\u0627\u0633',
  NOSE: '\u0627\u0646\u0641',
  FACE: '\u0648\u062c\u0647',
  PLAY: '\u064a\u0644\u0639\u0628',
  SWIM: '\u064a\u0633\u0628\u062d',
  JUMP: '\u064a\u0642\u0641\u0632',
  FIVE: '\u062e\u0645\u0633\u0629',
  FOUR: '\u0627\u0631\u0628\u0639\u0629',
  TIME: '\u0648\u0642\u062a',
  HAIR: '\u0634\u0639\u0631',
  GAME: '\u0644\u0639\u0628\u0629',
  LIFE: '\u062d\u064a\u0627\u0629',
  ROAD: '\u0637\u0631\u064a\u0642',
  STAR: '\u0646\u062c\u0645',
  MOON: '\u0642\u0645\u0631',
  ROSE: '\u0648\u0631\u062f\u0629',
  LION: '\u0627\u0633\u062f',
  BEAR: '\u062f\u0628',
  DUCK: '\u0628\u0637\u0629',
  COOK: '\u064a\u0637\u0628\u062e',
  FIRE: '\u0646\u0627\u0631',
  GOLD: '\u0630\u0647\u0628',
  SAND: '\u0631\u0645\u0644',
  TALL: '\u0637\u0648\u064a\u0644',
  DARK: '\u0645\u0638\u0644\u0645',
  RICH: '\u063a\u0646\u064a',
  POOR: '\u0641\u0642\u064a\u0631',
  EASY: '\u0633\u0647\u0644',
  HARD: '\u0635\u0639\u0628',
  SICK: '\u0645\u0631\u064a\u0636',
  SAFE: '\u0627\u0645\u0646',
  WIDE: '\u0648\u0627\u0633\u0639',
  LONG: '\u0637\u0648\u064a\u0644',
  NEAR: '\u0642\u0631\u064a\u0628',
  LATE: '\u0645\u062a\u0627\u062e\u0631',
  RIVER: '\u0646\u0647\u0631',
  HORSE: '\u062d\u0635\u0627\u0646',
  CHAIR: '\u0643\u0631\u0633\u064a',
  TABLE: '\u0637\u0627\u0648\u0644\u0629',
  GRASS: '\u0639\u0634\u0628',
  EARTH: '\u0627\u0631\u0636',
  PLANT: '\u0646\u0628\u0627\u062a',
  LIGHT: '\u0636\u0648\u0621',
  CLOCK: '\u0633\u0627\u0639\u0629',
  UNCLE: '\u0639\u0645',
  CHILD: '\u0637\u0641\u0644',
  QUEEN: '\u0645\u0644\u0643\u0629',
  DREAM: '\u062d\u0644\u0645',
  SLEEP: '\u064a\u0646\u0627\u0645',
  CLEAN: '\u0646\u0638\u064a\u0641',
  DANCE: '\u064a\u0631\u0642\u0635',
  THINK: '\u064a\u0641\u0643\u0631',
  DRINK: '\u064a\u0634\u0631\u0628',
  TEACH: '\u064a\u0639\u0644\u0645',
  LEARN: '\u064a\u062a\u0639\u0644\u0645',
  SMILE: '\u064a\u0628\u062a\u0633\u0645',
  SWEET: '\u062d\u0644\u0648',
  QUIET: '\u0647\u0627\u062f\u0626',
  ANGRY: '\u063a\u0627\u0636\u0628',
  DIRTY: '\u0648\u0633\u062e',
  EMPTY: '\u0641\u0627\u0631\u063a',
  EARLY: '\u0645\u0628\u0643\u0631',
  WRONG: '\u062e\u0637\u0627',
  BRAVE: '\u0634\u062c\u0627\u0639',
  MOTHER: '\u0627\u0645',
  FATHER: '\u0627\u0628',
  SISTER: '\u0627\u062e\u062a',
  WINTER: '\u0634\u062a\u0627\u0621',
  SUMMER: '\u0635\u064a\u0641',
  SPRING: '\u0631\u0628\u064a\u0639',
  FLOWER: '\u0632\u0647\u0631\u0629',
  ANIMAL: '\u062d\u064a\u0648\u0627\u0646',
  DOCTOR: '\u0637\u0628\u064a\u0628',
  STRONG: '\u0642\u0648\u064a',
  ANSWER: '\u062c\u0648\u0627\u0628',
  NUMBER: '\u0631\u0642\u0645',
  DINNER: '\u0639\u0634\u0627\u0621',
  FINGER: '\u0627\u0635\u0628\u0639',
  YELLOW: '\u0627\u0635\u0641\u0631',
  PURPLE: '\u0628\u0646\u0641\u0633\u062c\u064a',
};
const DICT_B1_B2: Record<string, string> = {};
const DICT_C1_C2: Record<string, string> = {};

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
    .replace(/[\u0640\u064B-\u065F\u0670]/g, '') // tatweel + harakat
    .replace(/[\u061F\u060C\u06D4\u066B\u066C.,;:!\-_/()[\]{}"'`~@#$%^&*+=<>\u061F\u060C]/g, '')
    .toUpperCase();
}

const WORDS_A1_A2 = [
  // Original words
  'family','friend','school','teacher','student','book','pen','paper','phone','computer',
  'music','movie','food','water','coffee','tea','bread','rice','fruit','apple',
  'banana','orange','vegetable','meat','fish','milk','cheese','egg','sugar','salt',
  'city','street','house','home','room','door','window','car','bus','train',
  'airport','hotel','market','shop','money','price','today','tomorrow','yesterday','morning',
  'evening','night','week','month','year','happy','sad','tired','hungry','thirsty',
  'hot','cold','big','small','good','bad','new','old','fast','slow',
  'right','left','open','close','start','stop','work','study','read','write',
  'speak','listen','walk','run',
  // Short words (2-3 letters)
  'no','go','up','in','on','sun','sky','air','boy','man','day','eat','see','sit','cut',
  // 4-letter words
  'girl','baby','bird','tree','rain','snow','wind','blue','king','love','name','hand',
  'head','nose','face','play','swim','jump','five','four','time','hair','game','life',
  'road','star','moon','rose','lion','bear','duck','cook','fire','gold','sand','tall',
  'dark','rich','poor','easy','hard','sick','safe','wide','long','near','late',
  // 5-letter words
  'river','horse','chair','table','grass','earth','plant','light','clock','uncle','child',
  'queen','dream','sleep','clean','dance','think','drink','teach','learn','smile','sweet',
  'quiet','angry','dirty','empty','early','wrong','brave',
  // 6-letter words
  'mother','father','sister','winter','summer','spring','flower','animal','doctor','strong',
  'answer','number','dinner','finger','yellow','purple'
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

function pickDict(cefr: string): Record<string, string> {
  if (cefr === 'A1-A2') return DICT_A1_A2;
  if (cefr === 'B1-B2') return DICT_B1_B2;
  return DICT_C1_C2;
}

// (HF fallback removed for speed + reliability on Vercel)

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });

    const { size, mode, band } = (req.body || {}) as { size?: number; mode?: Mode; band?: Band };

    const gridSize = Number(size);
    if (![7, 9, 11, 13].includes(gridSize)) return json(res, 400, { error: 'Invalid size' });
    if (mode !== 'en_to_ar' && mode !== 'ar_to_en') return json(res, 400, { error: 'Invalid mode' });
    if (band !== 'beginner' && band !== 'intermediate' && band !== 'advanced') return json(res, 400, { error: 'Invalid band' });

    const cefr = bandToCefr(band);

    // Use built-in CEFR word lists.
    // Speed strategy: local curated dict (instant). (HF fallback removed for now.)
    const dict = pickDict(cefr);

    const baseList = pickWordList(cefr);

    const pairs: Array<{ clue: string; answer: string }> = [];
    const seen = new Set<string>();

    // Return ALL valid word pairs (no limit) to maximize crossword fill
    for (const w of shuffle(baseList)) {
      const en = normalizeEnglishWord(w);
      if (en.length < 2 || en.length > gridSize) continue;
      if (seen.has(en)) continue;

      const arRaw = dict[en];
      if (!arRaw) continue;
      const ar = normalizeArabicWord(arRaw);
      if (!ar || ar.length < 2 || ar.length > gridSize) continue;

      seen.add(en);
      pairs.push(mode === 'en_to_ar' ? { clue: en, answer: ar } : { clue: ar, answer: en });
    }

    // HF fallback removed.

    if (!pairs.length) {
      return json(res, 500, {
        error:
          'No entries generated. This level needs the local dictionary expanded (HF fallback is disabled).',
      });
    }

    return json(res, 200, { entries: pairs });
  } catch (e: any) {
    return json(res, 500, { error: e?.message || String(e) });
  }
}
