import { HfInference } from '@huggingface/inference';

export type DirectionMode = 'en_to_ar' | 'ar_to_en';

export type VocabPair = {
  answer: string; // goes in grid
  clue: string; // shown to user
};

export type GenerateParams = {
  size: number;
  direction: DirectionMode;
  cefr: string; // e.g. A1-A2
  count: number;
};

export function buildPrompt(p: GenerateParams): string {
  const modeLine =
    p.direction === 'en_to_ar'
      ? 'Generate English words as clues and Arabic single-word meanings as answers.'
      : 'Generate Arabic words as clues and English single-word meanings as answers.';

  return [
    'You are generating entries for a classic crossword puzzle.',
    modeLine,
    `Difficulty: CEFR ${p.cefr}.`,
    `Grid size: ${p.size}x${p.size}.`,
    `Return exactly ${p.count} items as JSON array of objects with keys: clue, answer.`,
    'Rules:',
    '- answer must be a single word with NO spaces, no punctuation.',
    '- Arabic answers: no harakat/diacritics, no tatweel, no spaces.',
    '- English answers: A-Z letters only, no spaces.',
    `- answer length must be between 2 and ${p.size}.`,
    '- clue should be short (max ~8 words).',
    'Return ONLY valid JSON. No markdown.',
  ].join('\n');
}

export async function generateVocabWithHF(opts: {
  token: string;
  model: string;
  params: GenerateParams;
}): Promise<VocabPair[]> {
  const hf = new HfInference(opts.token);
  const prompt = buildPrompt(opts.params);

  const out = await hf.textGeneration({
    model: opts.model,
    inputs: prompt,
    parameters: {
      max_new_tokens: 800,
      temperature: 0.6,
      return_full_text: false,
    },
  });

  const text = (out.generated_text || '').trim();
  const parsed = JSON.parse(text);
  if (!Array.isArray(parsed)) throw new Error('HF output is not an array');

  return parsed
    .map((x: any) => ({ clue: String(x.clue ?? '').trim(), answer: String(x.answer ?? '').trim() }))
    .filter((x: any) => x.clue && x.answer);
}
