// Find all word slots (consecutive white cells of length >= 2)
export type Slot = {
  row: number;
  col: number;
  direction: 'across' | 'down';
  length: number;
};

export function findSlots(template: number[][]): Slot[] {
  const size = template.length;
  const slots: Slot[] = [];

  // Find across slots (minimum 2 letters)
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

  // Find down slots (minimum 2 letters)
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

export function getTemplate(size: number): number[][] {
  const grid = Array.from({ length: size }, () => Array(size).fill(1));
  return grid;
}

export function getTemplates(size: number): number[][][] {
  return [getTemplate(size)];
}

// Validate that converting a cell to black won't create single-letter entries
export function canConvertToBlack(grid: number[][], r: number, c: number): boolean {
  const size = grid.length;

  // Check horizontal - would it leave a single letter to the left?
  if (c > 0 && grid[r][c - 1] === 1) {
    let leftCount = 0;
    for (let cc = c - 1; cc >= 0 && grid[r][cc] === 1; cc--) leftCount++;
    if (leftCount === 1) {
      // Check if that cell has a vertical word of length >= 2
      let vertCount = 0;
      for (let rr = 0; rr < size; rr++) if (grid[rr][c - 1] === 1) vertCount++;
      if (vertCount < 2) return false;
    }
  }

  // Check horizontal - would it leave a single letter to the right?
  if (c < size - 1 && grid[r][c + 1] === 1) {
    let rightCount = 0;
    for (let cc = c + 1; cc < size && grid[r][cc] === 1; cc++) rightCount++;
    if (rightCount === 1) {
      let vertCount = 0;
      for (let rr = 0; rr < size; rr++) if (grid[rr][c + 1] === 1) vertCount++;
      if (vertCount < 2) return false;
    }
  }

  // Check vertical - would it leave a single letter above?
  if (r > 0 && grid[r - 1][c] === 1) {
    let aboveCount = 0;
    for (let rr = r - 1; rr >= 0 && grid[rr][c] === 1; rr--) aboveCount++;
    if (aboveCount === 1) {
      let horizCount = 0;
      for (let cc = 0; cc < size; cc++) if (grid[r - 1][cc] === 1) horizCount++;
      if (horizCount < 2) return false;
    }
  }

  // Check vertical - would it leave a single letter below?
  if (r < size - 1 && grid[r + 1][c] === 1) {
    let belowCount = 0;
    for (let rr = r + 1; rr < size && grid[rr][c] === 1; rr++) belowCount++;
    if (belowCount === 1) {
      let horizCount = 0;
      for (let cc = 0; cc < size; cc++) if (grid[r + 1][cc] === 1) horizCount++;
      if (horizCount < 2) return false;
    }
  }

  return true;
}
