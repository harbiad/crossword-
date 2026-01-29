export type CefrBand = 'beginner' | 'intermediate' | 'advanced';

export function bandToCefr(band: CefrBand): string {
  switch (band) {
    case 'beginner':
      return 'A1-A2';
    case 'intermediate':
      return 'B1-B2';
    case 'advanced':
      return 'C1-C2';
  }
}
