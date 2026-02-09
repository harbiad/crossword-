import type { VercelRequest, VercelResponse } from '@vercel/node';
import { DICT_COMMON_3000 } from './dict_common_3000.js';

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
  // 2-letter words
  NO: '\u0644\u0627',
  GO: '\u0627\u0630\u0647\u0628',
  UP: '\u0641\u0648\u0642',
  IN: '\u0641\u064a',
  ON: '\u0639\u0644\u0649',
  IF: '\u0625\u0630\u0627',
  OR: '\u0623\u0648',
  SO: '\u0644\u0630\u0627',
  TO: '\u0625\u0644\u0649',
  AT: '\u0641\u064a',
  BY: '\u0628\u0648\u0627\u0633\u0637\u0629',
  MY: '\u0644\u064a',
  WE: '\u0646\u062d\u0646',
  HE: '\u0647\u0648',
  ME: '\u0623\u0646\u0627',
  IT: '\u0647\u0648',
  IS: '\u0647\u0648',
  AS: '\u0643\u0640',
  DO: '\u0627\u0641\u0639\u0644',
  BE: '\u0643\u0646',
  // 3-letter words
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
  RED: '\u0623\u062d\u0645\u0631',
  BED: '\u0633\u0631\u064a\u0631',
  SET: '\u0645\u062c\u0645\u0648\u0639\u0629',
  GET: '\u0627\u062d\u0635\u0644',
  LET: '\u062f\u0639',
  NET: '\u0634\u0628\u0643\u0629',
  PET: '\u062d\u064a\u0648\u0627\u0646',
  WET: '\u0645\u0628\u0644\u0644',
  YES: '\u0646\u0639\u0645',
  NOT: '\u0644\u0627',
  BUT: '\u0644\u0643\u0646',
  FOR: '\u0644\u0640',
  NOW: '\u0627\u0644\u0622\u0646',
  HOW: '\u0643\u064a\u0641',
  WHY: '\u0644\u0645\u0627\u0630\u0627',
  WHO: '\u0645\u0646',
  ALL: '\u0643\u0644',
  TOP: '\u0623\u0639\u0644\u0649',
  WAY: '\u0637\u0631\u064a\u0642',
  END: '\u0646\u0647\u0627\u064a\u0629',
  USE: '\u0627\u0633\u062a\u062e\u062f\u0645',
  TRY: '\u062d\u0627\u0648\u0644',
  ASK: '\u0627\u0633\u0623\u0644',
  OWN: '\u0645\u0644\u0643',
  ADD: '\u0623\u0636\u0641',
  AGE: '\u0639\u0645\u0631',
  ARM: '\u0630\u0631\u0627\u0639',
  ART: '\u0641\u0646',
  BAG: '\u062d\u0642\u064a\u0628\u0629',
  BAT: '\u062e\u0641\u0627\u0634',
  BOX: '\u0635\u0646\u062f\u0648\u0642',
  BUS: '\u062d\u0627\u0641\u0644\u0629',
  CAT: '\u0642\u0637',
  COW: '\u0628\u0642\u0631\u0629',
  CUP: '\u0643\u0648\u0628',
  DOG: '\u0643\u0644\u0628',
  DOT: '\u0646\u0642\u0637\u0629',
  EAR: '\u0623\u0630\u0646',
  EYE: '\u0639\u064a\u0646',
  FAN: '\u0645\u0631\u0648\u062d\u0629',
  FAT: '\u0633\u0645\u064a\u0646',
  FLY: '\u0630\u0628\u0627\u0628\u0629',
  FOX: '\u062b\u0639\u0644\u0628',
  FUN: '\u0645\u0631\u062d',
  GAS: '\u063a\u0627\u0632',
  GUN: '\u0645\u0633\u062f\u0633',
  HAT: '\u0642\u0628\u0639\u0629',
  HIT: '\u0627\u0636\u0631\u0628',
  ICE: '\u062b\u0644\u062c',
  JAM: '\u0645\u0631\u0628\u0649',
  JAR: '\u062c\u0631\u0629',
  JOB: '\u0639\u0645\u0644',
  JOY: '\u0641\u0631\u062d',
  KEY: '\u0645\u0641\u062a\u0627\u062d',
  KID: '\u0637\u0641\u0644',
  LAW: '\u0642\u0627\u0646\u0648\u0646',
  LEG: '\u0633\u0627\u0642',
  LID: '\u063a\u0637\u0627\u0621',
  LIP: '\u0634\u0641\u0629',
  LOG: '\u062c\u0630\u0639',
  MAP: '\u062e\u0631\u064a\u0637\u0629',
  MAT: '\u062d\u0635\u064a\u0631\u0629',
  MIX: '\u0627\u0645\u0632\u062c',
  MOM: '\u0623\u0645',
  MUD: '\u0637\u064a\u0646',
  NUT: '\u062c\u0648\u0632',
  OIL: '\u0632\u064a\u062a',
  OWL: '\u0628\u0648\u0645\u0629',
  PAN: '\u0645\u0642\u0644\u0627\u0629',
  PIG: '\u062e\u0646\u0632\u064a\u0631',
  PIN: '\u062f\u0628\u0648\u0633',
  PIE: '\u0641\u0637\u064a\u0631\u0629',
  POT: '\u0642\u062f\u0631',
  RAT: '\u0641\u0623\u0631',
  ROW: '\u0635\u0641',
  RUG: '\u0633\u062c\u0627\u062f\u0629',
  SAD: '\u062d\u0632\u064a\u0646',
  SEA: '\u0628\u062d\u0631',
  SIX: '\u0633\u062a\u0629',
  SKI: '\u062a\u0632\u0644\u062c',
  SON: '\u0627\u0628\u0646',
  TAP: '\u0635\u0646\u0628\u0648\u0631',
  TEN: '\u0639\u0634\u0631\u0629',
  TIE: '\u0631\u0628\u0637\u0629',
  TIP: '\u0646\u0635\u064a\u062d\u0629',
  TOE: '\u0625\u0635\u0628\u0639',
  TOY: '\u0644\u0639\u0628\u0629',
  TWO: '\u0627\u062b\u0646\u0627\u0646',
  VAN: '\u0634\u0627\u062d\u0646\u0629',
  WAR: '\u062d\u0631\u0628',
  WIN: '\u0641\u0648\u0632',
  ZOO: '\u062d\u062f\u064a\u0642\u0629',
  // Filler words (repeated letters) - used as last resort
  AA: '\u0623\u0623',
  BB: '\u0628\u0628',
  CC: '\u062a\u062a',
  DD: '\u062f\u062f',
  EE: '\u0639\u0639',
  FF: '\u0641\u0641',
  GG: '\u062c\u062c',
  HH: '\u062d\u062d',
  II: '\u064a\u064a',
  LL: '\u0644\u0644',
  MM: '\u0645\u0645',
  NN: '\u0646\u0646',
  OO: '\u0648\u0648',
  PP: '\u0628\u0628',
  RR: '\u0631\u0631',
  SS: '\u0633\u0633',
  TT: '\u062a\u062a',
  AAA: '\u0623\u0623\u0623',
  BBB: '\u0628\u0628\u0628',
  EEE: '\u0639\u0639\u0639',
  III: '\u064a\u064a\u064a',
  OOO: '\u0648\u0648\u0648',
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
type DictMeaning = { answer: string; clue: string };
type DictValue = string | string[] | DictMeaning | DictMeaning[];
type DictMap = Record<string, DictValue>;

const DICT_A1_A2_EXPANDED: DictMap = {
  ...DICT_A1_A2,
  ...DICT_COMMON_3000,
};
const DICT_B1_B2: DictMap = {};
const DICT_C1_C2: DictMap = {};

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
  const firstVariant = s.split('/')[0].split('،')[0].split(';')[0].split('|')[0];
  return firstVariant
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
  // 2-letter words
  'no','go','up','in','on','if','or','so','to','at','by','my','we','he','me','it','is','as','do','be',
  // 3-letter words
  'sun','sky','air','boy','man','day','eat','see','sit','cut','red','bed','set','get','let','net',
  'pet','wet','yes','not','but','for','now','how','why','who','all','top','way','end','use','try',
  'ask','own','add','age','arm','art','bag','bat','box','cat','cow','cup','dog','dot',
  'ear','eye','fan','fat','fly','fox','fun','gas','gun','hat','hit','ice','jam','jar','job','joy',
  'key','kid','law','leg','lid','lip','log','map','mat','mix','mom','mud','nut','oil','owl','pan',
  'pig','pin','pie','pot','rat','row','rug','sea','six','ski','son','tap','ten','tie','tip',
  'toe','toy','two','van','war','win','zoo',
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

// Extra common words to increase candidate pool for HF translation.
const WORDS_COMMON_EXTRA = `
able about above accept across act action activity actually add address adult affect after again against age agency agent agree ahead air allow almost alone along already also although always among amount analysis and animal another answer any anyone anything appear apply approach area argue arm around arrive art article as ask assume at attack attention attorney audience author authority available avoid away baby back bad bag ball bank bar base be beat beautiful because become bed before begin behavior behind believe benefit best better between beyond big bill billion bit black blood blue board body book born both box boy break bring brother budget build building business but buy by call camera campaign can cancer candidate capital car card care career carry case catch cause cell center central century certain certainly chair challenge chance change character charge check child choice choose church citizen city civil claim class clear clearly close coach cold collection college color come commercial common community company compare computer concern condition conference congress consider consumer contain continue control cost could country couple course court cover create crime cultural culture cup current customer cut dark data daughter day dead deal debate decide decision deep defense degree democrat democratic describe design despite detail determine develop development die difference different difficult direction director discover discuss discussion disease do doctor dog door down draw dream drive drop drug during each early east easy eat economic economy edge education effect effort eight either election else employee end energy enjoy enough enter entire environment environmental especially establish even evening event ever every everybody everyone everything evidence exactly example executive exist expect experience expert explain eye face fact factor fail fall family far fast father fear federal feel feeling few field fight figure fill film final finally finance find fine finger finish fire firm first fish five floor fly focus follow food foot for force foreign forget form former forward four free friend from front full fund future game garden gas general generation get girl give glass go goal good government great green ground group grow growth guess gun guy hair half hand hang happen happy hard have he head health hear heart heat heavy help her here herself high him himself his history hold home hope hospital hot hotel hour house however huge human hundred husband I idea identify if image imagine impact important improve in include including increase indeed indicate individual industry information inside instead institution interest interesting international interview into investment involve issue it item its itself job join just keep key kid kill kind kitchen know knowledge land language large last late later laugh law lawyer lay lead leader learn least leave left leg legal less let letter level lie life light like likely line list listen little live local long look lose loss lot love low machine magazine main maintain major majority make man manage management manager many market marriage material matter may maybe me mean measure media medical meet meeting member memory mention message method middle might military million mind minute miss mission model modern moment money month more morning most mother mouth move movement movie Mr Mrs much music must my myself name nation national natural nature near nearly necessary need network never new news newspaper next nice night no none nor north not note nothing notice now number occur of off offer office officer official often oh oil ok old on once one only onto open operation opportunity option or order organization other others our out outside over own owner page pain painting paper parent part participant particular particularly partner party pass past patient pattern pay peace people per perform performance perhaps period person personal phone physical pick picture piece place plan plant play player PM point police policy political politics poor popular population position positive possible power practice prepare present president pressure pretty prevent price private probably problem process produce product production professional professor program project property protect prove provide public pull purpose push put quality question quickly quite race radio raise range rate rather reach read ready real reality realize really reason receive recent recently recognize record red reduce reflect region relate relationship religious remain remember remove report represent republican require research resource respond response responsibility rest result return reveal rich right rise risk road rock role room rule run safe same save say scene school science scientist score sea season seat second section security see seek seem sell send senior sense series serious serve service set seven several sex sexual shake share she shoot short shot should shoulder show side sign significant similar simple simply since sing single sister sit site situation six size skill skin small smile so social society soldier some somebody someone something sometimes son song soon sort sound source south southern space speak special specific speech spend sport spring staff stage stand standard star start state statement station stay step still stock stop store story strategy street strong structure student study stuff style subject success successful such suddenly suffer suggest summer support sure surface system table take talk task tax teach teacher team technology television tell ten tend term test than thank that the their them themselves then theory there these they thing think third this those though thought thousand threat three through throughout throw thus time to today together tonight too top total tough toward town trade traditional training travel treat treatment tree trial trip trouble true truth try turn TV two type under understand unit until up upon us use usually value various very victim view violence visit voice vote wait walk wall want war watch water way we weapon wear week weight well west western what whatever when where whether which while white who whole whom whose why wide wife will win wind window wish with within without woman wonder word work worker world worry would write writer wrong yard year yes yet you young your yourself
`.trim().split(/\s+/);

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

function pickDict(cefr: string): DictMap {
  if (cefr === 'A1-A2') return DICT_A1_A2_EXPANDED;
  if (cefr === 'B1-B2') return Object.keys(DICT_B1_B2).length ? DICT_B1_B2 : DICT_A1_A2_EXPANDED;
  return Object.keys(DICT_C1_C2).length ? DICT_C1_C2 : DICT_A1_A2_EXPANDED;
}

function buildCandidateWords(cefr: string, dict: DictMap): string[] {
  const base = pickWordList(cefr);
  const fallback = cefr === 'A1-A2' ? [] : WORDS_A1_A2;
  const commonA1 = cefr === 'A1-A2' ? Object.keys(DICT_COMMON_3000) : [];
  const merged = [...base, ...fallback, ...WORDS_COMMON_EXTRA, ...commonA1, ...Object.keys(dict)];
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const w of merged) {
    const normalized = normalizeEnglishWord(w);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    unique.push(normalized);
  }
  return unique;
}

async function translateBatch(words: string[], token: string): Promise<string[]> {
  if (!words.length) return [];
  const resp = await fetch('https://api-inference.huggingface.co/models/Helsinki-NLP/opus-mt-en-ar', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ inputs: words.length === 1 ? words[0] : words }),
  });
  if (!resp.ok) {
    throw new Error(`HF translate failed: ${resp.status}`);
  }
  const data = await resp.json();
  if (Array.isArray(data)) {
    if (data.length && Array.isArray(data[0]) && data[0][0]?.translation_text) {
      return data.map((d: any) => d[0]?.translation_text ?? '');
    }
    if (data[0]?.translation_text) {
      return data.map((d: any) => d.translation_text ?? '');
    }
  }
  if (data?.translation_text) return [data.translation_text];
  return [];
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

    const baseList = buildCandidateWords(cefr, dict);

    const pairs: Array<{ clue: string; answer: string; isRepeatedLetter?: boolean }> = [];
    const seen = new Set<string>();

    const targetPairs = 2000;

    // Return ALL valid word pairs (no limit) to maximize crossword fill
    for (const w of shuffle(baseList)) {
      const en = normalizeEnglishWord(w);
      if (en.length < 2 || en.length > gridSize) continue;
      if (seen.has(en)) continue;

      const meanings = getMeanings(dict, en);
      if (meanings.length) {
        for (const meaning of meanings) {
          const ar = meaning.answer;
          if (!ar || ar.length < 2 || ar.length > gridSize) continue;
          const key = `${en}::${ar}`;
          if (seen.has(key)) continue;
          seen.add(key);
          const clueAr = meaning.clue || ar;
          pairs.push(mode === 'en_to_ar' ? { clue: en, answer: ar } : { clue: clueAr, answer: en });
        }
      }
      if (pairs.length >= targetPairs) break;
    }

    // HF translation fallback to reach target pairs
    if (pairs.length < targetPairs && process.env.HF_TOKEN) {
      const token = process.env.HF_TOKEN;
      const candidates = shuffle(baseList);
      const missing: string[] = [];
      for (const w of candidates) {
        const en = normalizeEnglishWord(w);
        if (en.length < 2 || en.length > gridSize) continue;
        if (seen.has(en)) continue;
        missing.push(en);
        if (missing.length >= 200) break; // avoid long requests
      }

      const batchSize = 10;
      for (let i = 0; i < missing.length && pairs.length < targetPairs; i += batchSize) {
        const batch = missing.slice(i, i + batchSize);
        let translations: string[] = [];
        try {
          translations = await translateBatch(batch, token);
        } catch {
          break;
        }
        for (let j = 0; j < batch.length; j++) {
          const en = batch[j];
          const arRaw = translations[j] || '';
          const ar = normalizeArabicWord(arRaw);
          if (!ar || ar.length < 2 || ar.length > gridSize) continue;
          if (seen.has(en)) continue;
          seen.add(en);
          const clueAr = arRaw.trim() || ar;
          pairs.push(mode === 'en_to_ar' ? { clue: en, answer: ar } : { clue: clueAr, answer: en });
          if (pairs.length >= targetPairs) break;
        }
      }
    }

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
function getMeanings(dict: DictMap, en: string): DictMeaning[] {
  const val = dict[en];
  if (!val) return [];
  const arr = Array.isArray(val) ? val : [val];
  return arr.map((v) => {
    if (typeof v === 'string') {
      return { answer: normalizeArabicWord(v), clue: v };
    }
    return { answer: normalizeArabicWord(v.answer), clue: v.clue };
  });
}
