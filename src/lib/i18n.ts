// i18n translations for crossword puzzle UI
// UI language follows the SOURCE language of the puzzle

export type Mode = 'en_to_ar' | 'ar_to_en' | 'en_to_es' | 'ar_to_fr';

// Map mode to UI locale (the language the interface displays)
// UI follows the source language: EN→AR shows English UI, AR→EN shows Arabic UI
// Extract source language from mode (e.g., 'en_to_ar' -> 'en')
export function getSourceLocale(mode: Mode): string {
  return mode.split('_')[0];
}

// Translations for each supported locale
type Translations = {
  // Header & Controls
  crossword: string;
  grid: string;
  level: string;
  mode: string;
  loading: string;
  newPuzzle: string;

  // Difficulty levels
  beginner: string;
  intermediate: string;
  advanced: string;

  // Clues
  clues: string;
  across: string;
  down: string;

  // Actions
  check: string;
  reveal: string;
  solveAll: string;
  solve: string;
  clear: string;

  // Feedback
  correct: string;
  notCorrect: string;

  // Meta info
  words: string;

  // Start prompt
  startPrompt: string;
  start: string;
};

const translations: Record<string, Translations> = {
  en: {
    crossword: 'Crossword',
    grid: 'Grid',
    level: 'Level',
    mode: 'Mode',
    loading: 'Loading…',
    newPuzzle: 'New Puzzle',
    beginner: 'Beginner',
    intermediate: 'Intermediate',
    advanced: 'Advanced',
    clues: 'Clues',
    across: 'Across',
    down: 'Down',
    check: 'Check',
    reveal: 'Reveal',
    solveAll: 'Solve All',
    solve: 'Solve',
    clear: 'Clear',
    correct: 'Correct!',
    notCorrect: 'Not correct yet.',
    words: 'words',
    startPrompt: 'Tap ⋮ to configure and start a new puzzle',
    start: 'Start',
  },
  ar: {
    crossword: 'لغز الكلمات المتقاطعة',
    grid: 'المصفوفة',
    level: 'المستوى',
    mode: 'الوضع',
    loading: 'جاري التحميل…',
    newPuzzle: 'لغز جديد',
    beginner: 'مبتدئ',
    intermediate: 'متوسط',
    advanced: 'متقدم',
    clues: 'التلميحات',
    across: 'أفقي',
    down: 'عمودي',
    check: 'تحقق',
    reveal: 'كشف',
    solveAll: 'حل الكل',
    solve: 'حل',
    clear: 'مسح',
    correct: 'صحيح!',
    notCorrect: 'ليس صحيحاً بعد.',
    words: 'كلمات',
    startPrompt: 'اضغط ⋮ للإعداد وبدء لغز جديد',
    start: 'ابدأ',
  },
  es: {
    crossword: 'Crucigrama',
    grid: 'Cuadrícula',
    level: 'Nivel',
    mode: 'Modo',
    loading: 'Cargando…',
    newPuzzle: 'Nuevo Puzzle',
    beginner: 'Principiante',
    intermediate: 'Intermedio',
    advanced: 'Avanzado',
    clues: 'Pistas',
    across: 'Horizontal',
    down: 'Vertical',
    check: 'Verificar',
    reveal: 'Revelar',
    solveAll: 'Resolver Todo',
    solve: 'Resolver',
    clear: 'Limpiar',
    correct: '¡Correcto!',
    notCorrect: 'Aún no es correcto.',
    words: 'palabras',
    startPrompt: 'Toca ⋮ para configurar y comenzar un nuevo puzzle',
    start: 'Comenzar',
  },
  fr: {
    crossword: 'Mots Croisés',
    grid: 'Grille',
    level: 'Niveau',
    mode: 'Mode',
    loading: 'Chargement…',
    newPuzzle: 'Nouveau Puzzle',
    beginner: 'Débutant',
    intermediate: 'Intermédiaire',
    advanced: 'Avancé',
    clues: 'Indices',
    across: 'Horizontal',
    down: 'Vertical',
    check: 'Vérifier',
    reveal: 'Révéler',
    solveAll: 'Tout Résoudre',
    solve: 'Résoudre',
    clear: 'Effacer',
    correct: 'Correct !',
    notCorrect: 'Pas encore correct.',
    words: 'mots',
    startPrompt: 'Appuyez sur ⋮ pour configurer et démarrer un nouveau puzzle',
    start: 'Commencer',
  },
};

// Get translations for a given mode
export function getTranslations(mode: Mode): Translations {
  const locale = getSourceLocale(mode);
  return translations[locale] || translations.en;
}

// Helper to get display text for mode
export function getModeLabel(mode: Mode): string {
  const labels: Record<Mode, string> = {
    en_to_ar: 'EN → AR',
    ar_to_en: 'AR → EN',
    en_to_es: 'EN → ES',
    ar_to_fr: 'AR → FR',
  };
  return labels[mode];
}

// Helper to get mode display for meta info
export function getModeDisplay(mode: Mode): string {
  const displays: Record<Mode, string> = {
    en_to_ar: 'EN→AR',
    ar_to_en: 'AR→EN',
    en_to_es: 'EN→ES',
    ar_to_fr: 'AR→FR',
  };
  return displays[mode];
}
