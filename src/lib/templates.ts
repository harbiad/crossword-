// Predefined crossword templates
// 0 = black square, 1 = white square (for answers)
// Templates designed with ~80-85% white, ~15-20% black

// 7x7 template (45 white = 92%, 4 black = 8%)
export const TEMPLATE_7: number[][] = [
  [1, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 0, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1],
  [1, 0, 1, 1, 1, 0, 1],
  [1, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 0, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1],
];

// 9x9 template (68 white = 84%, 13 black = 16%)
export const TEMPLATE_9: number[][] = [
  [1, 1, 1, 1, 0, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 0, 1, 1, 0, 1, 1],
  [1, 1, 0, 1, 1, 1, 1, 1, 1],
  [0, 1, 1, 1, 1, 1, 1, 1, 0],
  [1, 1, 1, 1, 1, 1, 0, 1, 1],
  [1, 1, 0, 1, 1, 0, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 0, 1, 1, 1, 1],
];

// 11x11 template (100 white = 83%, 21 black = 17%)
export const TEMPLATE_11: number[][] = [
  [1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1],
  [1, 1, 0, 1, 1, 1, 1, 1, 1, 0, 1],
  [1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1],
  [0, 1, 1, 1, 0, 1, 0, 1, 1, 1, 0],
  [1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1],
  [1, 0, 1, 1, 1, 1, 1, 1, 0, 1, 1],
  [1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1],
];

// 13x13 template (141 white = 83%, 28 black = 17%)
export const TEMPLATE_13: number[][] = [
  [1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 1],
  [1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 0, 1, 1],
  [1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1],
  [0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0],
  [1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1],
  [1, 1, 0, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1],
  [1, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1],
];

// Rotate a template 90 degrees clockwise
function rotateTemplate(t: number[][]): number[][] {
  const n = t.length;
  const result: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      result[c][n - 1 - r] = t[r][c];
    }
  }
  return result;
}

// Flip template horizontally
function flipHorizontal(t: number[][]): number[][] {
  return t.map(row => [...row].reverse());
}

// Flip template vertically
function flipVertical(t: number[][]): number[][] {
  return [...t].reverse().map(row => [...row]);
}

// Apply random transformations to a template
function randomizeTemplate(t: number[][]): number[][] {
  let result = t.map(row => [...row]); // Deep copy

  // Random rotations (0, 90, 180, or 270 degrees)
  const rotations = Math.floor(Math.random() * 4);
  for (let i = 0; i < rotations; i++) {
    result = rotateTemplate(result);
  }

  // Random horizontal flip
  if (Math.random() > 0.5) {
    result = flipHorizontal(result);
  }

  // Random vertical flip
  if (Math.random() > 0.5) {
    result = flipVertical(result);
  }

  return result;
}

export function getTemplate(size: number): number[][] {
  let base: number[][];
  switch (size) {
    case 7: base = TEMPLATE_7; break;
    case 9: base = TEMPLATE_9; break;
    case 11: base = TEMPLATE_11; break;
    case 13: base = TEMPLATE_13; break;
    default: base = TEMPLATE_9;
  }
  return randomizeTemplate(base);
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

  // Find across slots (horizontal runs of 1s)
  for (let r = 0; r < size; r++) {
    let startCol = -1;
    for (let c = 0; c <= size; c++) {
      const isWhite = c < size && template[r][c] === 1;
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

  // Find down slots (vertical runs of 1s)
  for (let c = 0; c < size; c++) {
    let startRow = -1;
    for (let r = 0; r <= size; r++) {
      const isWhite = r < size && template[r][c] === 1;
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
