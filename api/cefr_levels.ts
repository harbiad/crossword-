// CEFR level lookup for English words
// Level A = Beginner (A1-A2), Level B = Intermediate (B1-B2), Level C = Advanced (C1-C2)

export type CefrLevel = 'A' | 'B' | 'C';

// Curated beginner words (449 words from WORDS_A1_A2)
const LEVEL_A_WORDS = new Set([
  // Original words
  'FAMILY','FRIEND','SCHOOL','TEACHER','STUDENT','BOOK','PEN','PAPER','PHONE','COMPUTER',
  'MUSIC','MOVIE','FOOD','WATER','COFFEE','TEA','BREAD','RICE','FRUIT','APPLE',
  'BANANA','ORANGE','VEGETABLE','MEAT','FISH','MILK','CHEESE','EGG','SUGAR','SALT',
  'CITY','STREET','HOUSE','HOME','ROOM','DOOR','WINDOW','CAR','BUS','TRAIN',
  'AIRPORT','HOTEL','MARKET','SHOP','MONEY','PRICE','TODAY','TOMORROW','YESTERDAY','MORNING',
  'EVENING','NIGHT','WEEK','MONTH','YEAR','HAPPY','SAD','TIRED','HUNGRY','THIRSTY',
  'HOT','COLD','BIG','SMALL','GOOD','BAD','NEW','OLD','FAST','SLOW',
  'RIGHT','LEFT','OPEN','CLOSE','START','STOP','WORK','STUDY','READ','WRITE',
  'SPEAK','LISTEN','WALK','RUN',
  // 2-letter words
  'NO','GO','UP','IN','ON','IF','OR','SO','TO','AT','BY','MY','WE','HE','ME','IT','IS','AS','DO','BE',
  // 3-letter words
  'SUN','SKY','AIR','BOY','MAN','DAY','EAT','SEE','SIT','CUT','RED','BED','SET','GET','LET','NET',
  'PET','WET','YES','NOT','BUT','FOR','NOW','HOW','WHY','WHO','ALL','TOP','WAY','END','USE','TRY',
  'ASK','OWN','ADD','AGE','ARM','ART','BAG','BAT','BOX','CAT','COW','CUP','DOG','DOT',
  'EAR','EYE','FAN','FAT','FLY','FOX','FUN','GAS','GUN','HAT','HIT','ICE','JAM','JAR','JOB','JOY',
  'KEY','KID','LAW','LEG','LID','LIP','LOG','MAP','MAT','MIX','MOM','MUD','NUT','OIL','OWL','PAN',
  'PIG','PIN','PIE','POT','RAT','ROW','RUG','SEA','SIX','SKI','SON','TAP','TEN','TIE','TIP',
  'TOE','TOY','TWO','VAN','WAR','WIN','ZOO',
  // 4-letter words
  'GIRL','BABY','BIRD','TREE','RAIN','SNOW','WIND','BLUE','KING','LOVE','NAME','HAND',
  'HEAD','NOSE','FACE','PLAY','SWIM','JUMP','FIVE','FOUR','TIME','HAIR','GAME','LIFE',
  'ROAD','STAR','MOON','ROSE','LION','BEAR','DUCK','COOK','FIRE','GOLD','SAND','TALL',
  'DARK','RICH','POOR','EASY','HARD','SICK','SAFE','WIDE','LONG','NEAR','LATE',
  // 5-letter words
  'RIVER','HORSE','CHAIR','TABLE','GRASS','EARTH','PLANT','LIGHT','CLOCK','UNCLE','CHILD',
  'QUEEN','DREAM','SLEEP','CLEAN','DANCE','THINK','DRINK','TEACH','LEARN','SMILE','SWEET',
  'QUIET','ANGRY','DIRTY','EMPTY','EARLY','WRONG','BRAVE',
  // 6-letter words
  'MOTHER','FATHER','SISTER','WINTER','SUMMER','SPRING','FLOWER','ANIMAL','DOCTOR','STRONG',
  'ANSWER','NUMBER','DINNER','FINGER','YELLOW','PURPLE',
]);

// Curated intermediate words (74 words from WORDS_B1_B2)
const LEVEL_B_WORDS = new Set([
  'ADVICE','ARGUMENT','ATTITUDE','BALANCE','BENEFIT','CAREER','CHOICE','CULTURE','DAMAGE','DECISION',
  'DEMAND','DETAIL','EFFORT','ENERGY','EXPERIENCE','FREEDOM','GOAL','HABIT','HEALTH','HISTORY',
  'IDENTITY','IMPROVE','INCREASE','INFLUENCE','INTEREST','KNOWLEDGE','LANGUAGE','MANAGE','METHOD','OPINION',
  'PATIENT','PATTERN','PERFORM','POLICY','PREPARE','PRESSURE','PROBLEM','PROCESS','PROJECT','QUALITY',
  'REASON','REDUCE','RESPECT','RESULT','ROUTINE','SCIENCE','SOCIETY','SOLUTION','STRENGTH','SUPPORT',
  'SYSTEM','TECHNOLOGY','TRADITION','TRAFFIC','TRAINING','TRAVEL','VALUE','WEATHER','WORRY','DISCOVER',
  'DISCUSS','DEVELOP','EXPLAIN','IMAGINE','CONSIDER','COMPARE','PROTECT','RECOMMEND','REQUIRE','SUGGEST',
]);

// Curated advanced words (54 words from WORDS_C1_C2)
const LEVEL_C_WORDS = new Set([
  'ABRUPT','ALLOCATE','AMBIGUOUS','ANALOGY','ANALYZE','ANTICIPATE','ASSESS','ASSUMPTION','BIAS','COHERENT',
  'COMPREHENSIVE','CONSEQUENCE','CONTROVERSY','CRITERIA','DILEMMA','DISTINCTION','DOMESTIC','EMERGE','EMPHASIS','ETHICAL',
  'EVALUATE','EXAGGERATE','FRAMEWORK','GENERATE','HYPOTHESIS','INEVITABLE','INHIBIT','INNOVATIVE','INTEGRITY','INTERPRET',
  'JUSTIFY','LEGITIMATE','MAINTAIN','NEGLIGIBLE','NOTION','PARADOX','PERSPECTIVE','PHENOMENON','PRECISE','PREVALENT',
  'PRIORITIZE','RELEVANT','RESILIENT','SOPHISTICATED','SUBTLE','SUSTAIN','TRANSFORM','UNDERMINE','VIABLE','VULNERABLE',
  'WHEREAS','NOTWITHSTANDING','CONTEMPORARY','METICULOUS','INTRICATE','UBIQUITOUS',
]);

/**
 * Get the CEFR level for a word.
 *
 * @param word - The English word to look up (case-insensitive)
 * @param indexInDict - Optional index in the dictionary (used for frequency heuristic)
 * @returns CefrLevel ('A', 'B', or 'C')
 */
export function getWordLevel(word: string, indexInDict?: number): CefrLevel {
  const normalized = word.toUpperCase().trim();

  // Check curated lists first
  if (LEVEL_A_WORDS.has(normalized)) return 'A';
  if (LEVEL_B_WORDS.has(normalized)) return 'B';
  if (LEVEL_C_WORDS.has(normalized)) return 'C';

  // Heuristics for ~15,400 uncurated words
  // Long words (10+ chars) are typically advanced
  if (normalized.length >= 10) return 'C';

  // High-frequency words (first ~6000 in dict) default to intermediate
  // This gives a good pool for puzzle generation fallback
  if (indexInDict !== undefined && indexInDict < 6000) return 'B';

  // Default: advanced
  return 'C';
}

/**
 * Check if a word's level is allowed for a given CEFR band selection.
 *
 * @param level - The word's CefrLevel
 * @param band - The user's selected difficulty band
 * @returns true if the word should be included
 */
export function isLevelAllowed(level: CefrLevel, band: 'beginner' | 'intermediate' | 'advanced'): boolean {
  switch (band) {
    case 'beginner':
      return level === 'A';
    case 'intermediate':
      return level === 'A' || level === 'B';
    case 'advanced':
      return true; // All levels allowed
  }
}
