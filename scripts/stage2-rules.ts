// Small explicit evidence tables, not automatic translation or broad approval.
// Match a whole English/Arabic relationship; an Arabic homograph elsewhere is
// only a review hint. No network is used when regenerating this dataset.
export const dialectEvidence = new Map([
  ['NOT|مش', 'https://en.wiktionary.org/wiki/مش#Egyptian_Arabic'],
  ['HOW|ازاي', 'https://en.wiktionary.org/wiki/ازاي#Egyptian_Arabic'],
  ['HOW|شلون', 'https://en.wiktionary.org/wiki/شلون#Gulf_Arabic'],
  ['WHY|ليش', 'https://uark.pressbooks.pub/levantinecolloquialarabic/chapter/6-4-grammar-2-asking-why-ليش/'],
  ['BECAUSE|عشان', 'https://en.wiktionary.org/wiki/عشان#Egyptian_Arabic'],
]);
// Register evidence only; this does not approve translation accuracy or senses.
export const msaEvidence = new Map([
  ['BOOK|كتاب', 'https://en.wiktionary.org/wiki/كتاب#Arabic'],
  ['BOOK|الكتاب', 'https://en.wiktionary.org/wiki/كتاب#Arabic (definite article)'],
  ['PROPERLY|بشكل صحيح', 'User-specified valid MSA multiword example'],
  ['FOR|من أجل', 'User-specified valid MSA multiword example'],
  ['PERCENTAGE|النسبة المئوية', 'User-specified valid MSA multiword example'],
]);
export const dialectTokens = new Set(['مش', 'عايز', 'عاوز', 'شو', 'ليش', 'ازاي', 'شلون', 'كده', 'هيك', 'دلوقتي', 'عشان', 'بدي', 'بتاع', 'كويس']);
// Conservative English sense hints. Uppercase spelling alone is NOT evidence:
// every headword in the source is uppercase. All categories remain review-only.
export const clearAcronyms = new Set(['USA','NASA','BBC','DNA','UK','IBM','CSS','HTML','HTTP','USB','ISO','SEO','PHD','CDS','EUR','ETC','MRS','LOL']);
export const lexicalWords = new Set(['THE','OUT','GAY','NET','GAS','SIX','VIA','AID','SAW','CUP','BUS','BUG','SPA','MOM','ROW','CAP','GNU','RAM','PUB','SUM','GAP','ERA','MAD','BET','DAD','DEN','EVE','ROD','EGG','ARC','ION','CRY','ACE','SUE','FLU','COD','GEL','CAB','DAM','ASH','BRA','COW','DOE','AYE','RIM','LIT','DUO','FOG','RUG','ANT','APT','GEM','ATE','HAY','COP','DIM']);
export const personNames = new Set(['JOHN','MICHAEL','JAMES','DAVID','ROBERT','MARY','SARAH','WILLIAM','ELIZABETH','JENNIFER','AHMED','MUHAMMAD','SHAW','TOM','LEE','JIM','JOE','ANN','DAN','TIM','BEN','SAM','KIM','RON','IAN','AMY','TED','ALI','LEO','EVA','LIZ','PAM']);
export const placeNames = new Set(['LONDON','PARIS','TOKYO','CAIRO','RIYADH','BERLIN','FRANCE','GERMANY','EGYPT','CHINA','INDIA','AMERICA','AMAZON','JORDAN','GEORGIA','RIO']);
export const brandNames = new Set(['GOOGLE','MICROSOFT','FACEBOOK','AMAZON','APPLE','SAMSUNG','TOYOTA','COCA','PEPSI','IPHONE','WINDOWS','NIKE']);

export function possibleTransliteration(english: string, arabic: string) {
  const en = english.toLowerCase().replace(/sh|ch/g, 's').replace(/th/g, 't').replace(/ph/g, 'f')
    .replace(/kh/g, 'k').replace(/gh/g, 'g').replace(/[aeiouwyh]/g, '').replace(/c|q/g, 'k').replace(/(.)\1+/g, '$1');
  const consonants: Record<string, string> = { ب:'b',ت:'t',ث:'t',ج:'j',ح:'',خ:'k',د:'d',ذ:'d',ر:'r',ز:'z',س:'s',ش:'s',ص:'s',ض:'d',ط:'t',ظ:'z',ع:'',غ:'g',ف:'f',ق:'k',ك:'k',ل:'l',م:'m',ن:'n',ه:'',ة:'' };
  const ar = [...arabic].map(c => consonants[c] ?? (/[اويىأإآؤئء\s\u064B-\u065F]/.test(c) ? '' : '?')).join('').replace(/(.)\1+/g, '$1');
  return en.length >= 3 && ar === en;
}
