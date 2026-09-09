import type { Mode } from './candidates.js';

// Paired generation controls found that the uniformly balanced 2,000-pair
// pool discarded crossing support needed by dense English templates. Keep
// semantic/CEFR filtering and balancing unchanged; do not enlarge Arabic pools.
export function candidatePoolLimit(size: number, mode: Mode): number {
  if (mode === 'ar_to_en' && size >= 11) return 6000;
  if (mode === 'ar_to_en' && size === 9) return 4000;
  return 2000;
}
