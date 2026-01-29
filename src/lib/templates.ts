// Predefined crossword templates with ~15-20% black squares
// 1 = black square, 0 = white square (for answers)

// 7x7 template (~16% black)
export const TEMPLATE_7: number[][] = [
  [0, 0, 0, 1, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0],
  [1, 0, 0, 0, 0, 0, 1],
  [0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 1, 0, 0, 0],
];

// 9x9 template (~17% black)
export const TEMPLATE_9: number[][] = [
  [0, 0, 0, 0, 1, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 1, 0, 0],
  [0, 0, 0, 1, 0, 0, 0, 0, 0],
  [1, 0, 0, 0, 0, 0, 0, 0, 1],
  [0, 0, 0, 0, 0, 1, 0, 0, 0],
  [0, 0, 1, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 0, 0, 0, 0],
];

// 11x11 template (~18% black)
export const TEMPLATE_11: number[][] = [
  [0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
  [0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
  [0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0],
];

// 13x13 template (~17% black)
export const TEMPLATE_13: number[][] = [
  [0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0],
  [0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0],
  [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0],
];

export function getTemplate(size: number): number[][] {
  switch (size) {
    case 7: return TEMPLATE_7;
    case 9: return TEMPLATE_9;
    case 11: return TEMPLATE_11;
    case 13: return TEMPLATE_13;
    default: return TEMPLATE_9;
  }
}

// Find all word slots (consecutive white cells) in the template
export type Slot = {
  row: number;
  col: number;
  direction: 'across' | 'down';
  length: number;
};

export function findSlots(template: number[][]): Slot[] {
  const size = template.length;
  const slots: Slot[] = [];

  // Find across slots
  for (let r = 0; r < size; r++) {
    let startCol = -1;
    for (let c = 0; c <= size; c++) {
      const isWhite = c < size && template[r][c] === 0;
      if (isWhite && startCol === -1) {
        startCol = c;
      } else if (!isWhite && startCol !== -1) {
        const len = c - startCol;
        if (len >= 2) {
          slots.push({ row: r, col: startCol, direction: 'across', length: len });
        }
        startCol = -1;
      }
    }
  }

  // Find down slots
  for (let c = 0; c < size; c++) {
    let startRow = -1;
    for (let r = 0; r <= size; r++) {
      const isWhite = r < size && template[r][c] === 0;
      if (isWhite && startRow === -1) {
        startRow = r;
      } else if (!isWhite && startRow !== -1) {
        const len = r - startRow;
        if (len >= 2) {
          slots.push({ row: startRow, col: c, direction: 'down', length: len });
        }
        startRow = -1;
      }
    }
  }

  return slots;
}
