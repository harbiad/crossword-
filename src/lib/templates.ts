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

function isWhiteConnected(grid: number[][]): boolean {
  const size = grid.length;
  let start: { r: number; c: number } | null = null;
  let whiteCount = 0;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c] === 1) {
        whiteCount++;
        if (!start) start = { r, c };
      }
    }
  }
  if (!start || whiteCount === 0) return false;

  const queue = [start];
  const visited = new Set<string>([`${start.r},${start.c}`]);
  while (queue.length) {
    const cur = queue.shift()!;
    const neighbors = [
      { r: cur.r - 1, c: cur.c },
      { r: cur.r + 1, c: cur.c },
      { r: cur.r, c: cur.c - 1 },
      { r: cur.r, c: cur.c + 1 },
    ];
    for (const n of neighbors) {
      if (n.r < 0 || n.c < 0 || n.r >= size || n.c >= size) continue;
      if (grid[n.r][n.c] !== 1) continue;
      const key = `${n.r},${n.c}`;
      if (visited.has(key)) continue;
      visited.add(key);
      queue.push(n);
    }
  }
  return visited.size === whiteCount;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function validateBlockRunsLocal(grid: number[][], minRunLength = 2): boolean {
  const size = grid.length;

  // Check across runs
  for (let r = 0; r < size; r++) {
    let run = 0;
    for (let c = 0; c <= size; c++) {
      const isWhite = c < size && grid[r][c] === 1;
      if (isWhite) run++;
      if (!isWhite || c === size) {
        if (run > 0 && run < minRunLength) return false;
        run = 0;
      }
    }
  }

  // Check down runs
  for (let c = 0; c < size; c++) {
    let run = 0;
    for (let r = 0; r <= size; r++) {
      const isWhite = r < size && grid[r][c] === 1;
      if (isWhite) run++;
      if (!isWhite || r === size) {
        if (run > 0 && run < minRunLength) return false;
        run = 0;
      }
    }
  }

  return true;
}

function validateBlockRunsBlocks(grid: number[][]): boolean {
  const size = grid.length;

  for (let r = 0; r < size; r++) {
    let run = 0;
    for (let c = 0; c <= size; c++) {
      const isBlock = c < size && grid[r][c] === 0;
      if (isBlock) run++;
      if (!isBlock || c === size) {
        if (run >= 3) return false;
        run = 0;
      }
    }
  }

  for (let c = 0; c < size; c++) {
    let run = 0;
    for (let r = 0; r <= size; r++) {
      const isBlock = r < size && grid[r][c] === 0;
      if (isBlock) run++;
      if (!isBlock || r === size) {
        if (run >= 3) return false;
        run = 0;
      }
    }
  }

  return true;
}

function targetBlockRatio(size: number) {
  if (size <= 7) return 0.18;
  if (size <= 9) return 0.2;
  if (size <= 11) return 0.22;
  return 0.24;
}

function canConvertPairToBlack(grid: number[][], r: number, c: number, minRunLength = 2): boolean {
  const size = grid.length;
  const r2 = size - 1 - r;
  const c2 = size - 1 - c;
  if (grid[r][c] === 0 && grid[r2][c2] === 0) return false;

  const prev1 = grid[r][c];
  const prev2 = grid[r2][c2];
  grid[r][c] = 0;
  grid[r2][c2] = 0;

  const ok = validateBlockRunsLocal(grid, minRunLength) && validateBlockRunsBlocks(grid) && isWhiteConnected(grid);

  if (!ok) {
    grid[r][c] = prev1;
    grid[r2][c2] = prev2;
  }

  return ok;
}

export function getNYTTemplate(size: number, minRunLength = 2): number[][] {
  const grid = Array.from({ length: size }, () => Array(size).fill(1));
  const targetBlocks = Math.floor(size * size * targetBlockRatio(size));
  const maxBlocks = Math.floor(size * size * 0.3);
  let blocks = 0;

  const attempts = size * size * 10;
  for (let i = 0; i < attempts && blocks < maxBlocks; i++) {
    const r = Math.floor(Math.random() * size);
    const c = Math.floor(Math.random() * size);
    const r2 = size - 1 - r;
    const c2 = size - 1 - c;
    const add = (r === r2 && c === c2) ? 1 : 2;
    if (blocks + add > maxBlocks) continue;
    if (!canConvertPairToBlack(grid, r, c, minRunLength)) continue;
    blocks += add;
  }

  const minBlocks = clamp(Math.floor(size * size * 0.08), 2, targetBlocks);
  if (blocks < minBlocks) {
    for (let i = 0; i < attempts && blocks < minBlocks; i++) {
      const r = Math.floor(Math.random() * size);
      const c = Math.floor(Math.random() * size);
      const r2 = size - 1 - r;
      const c2 = size - 1 - c;
      const add = (r === r2 && c === c2) ? 1 : 2;
      if (blocks + add > maxBlocks) continue;
      if (!canConvertPairToBlack(grid, r, c, minRunLength)) continue;
      blocks += add;
    }
  }

  return grid;
}

export function getTemplate(size: number, minRunLength = 2): number[][] {
  const grid = Array.from({ length: size }, () => Array(size).fill(1));
  const targetBlocks = Math.floor(size * size * targetBlockRatio(size));
  const maxBlocks = Math.floor(size * size * 0.3);
  let blocks = 0;

  const attempts = size * size * 6;
  for (let i = 0; i < attempts && blocks < maxBlocks; i++) {
    const r = Math.floor(Math.random() * size);
    const c = Math.floor(Math.random() * size);
    if (grid[r][c] === 0) continue;
    if (!canConvertToBlack(grid, r, c)) continue;
    grid[r][c] = 0;
    if (!validateBlockRunsLocal(grid, minRunLength) || !validateBlockRunsBlocks(grid) || !isWhiteConnected(grid)) {
      grid[r][c] = 1;
      continue;
    }
    blocks++;
  }

  const minBlocks = clamp(Math.floor(size * size * 0.08), 2, targetBlocks);
  if (blocks < minBlocks) {
    // Try a few more passes to reach a minimal block count.
    for (let i = 0; i < attempts && blocks < minBlocks; i++) {
      const r = Math.floor(Math.random() * size);
      const c = Math.floor(Math.random() * size);
      if (grid[r][c] === 0) continue;
      if (!canConvertToBlack(grid, r, c)) continue;
      grid[r][c] = 0;
      if (!validateBlockRunsLocal(grid, minRunLength) || !validateBlockRunsBlocks(grid) || !isWhiteConnected(grid)) {
        grid[r][c] = 1;
        continue;
      }
      blocks++;
    }
  }

  return grid;
}

export function getTemplates(size: number, minRunLength = 2, count = 6): number[][][] {
  const templates: number[][][] = [];
  for (let i = 0; i < count; i++) {
    if (Math.random() < 0.5) {
      templates.push(getNYTTemplate(size, minRunLength));
    } else {
      templates.push(getTemplate(size, minRunLength));
    }
  }
  return templates;
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
