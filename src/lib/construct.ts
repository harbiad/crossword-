import type { Direction } from './crossword';
import type { WordClue } from './generateCrossword';
import { findSlots, type Slot } from './templates';

export type Placement = {
  answer: string;
  clue: string;
  row: number;
  col: number;
  direction: Direction;
  isRepeatedLetter?: boolean;
};

type GridChar = string | null | '#';

const BLOCK: GridChar = '#';

function getSlotStart(slot: Slot, answerDirection: 'rtl' | 'ltr'): { row: number; col: number } {
  if (slot.direction === 'across' && answerDirection === 'rtl') {
    return { row: slot.row, col: slot.col + slot.length - 1 };
  }
  return { row: slot.row, col: slot.col };
}

function getStep(direction: Direction, answerDirection: 'rtl' | 'ltr'): { dr: number; dc: number } {
  if (direction === 'down') return { dr: 1, dc: 0 };
  return { dr: 0, dc: answerDirection === 'rtl' ? -1 : 1 };
}

function getCellAt(slot: Slot, i: number, answerDirection: 'rtl' | 'ltr') {
  const { row, col } = getSlotStart(slot, answerDirection);
  const { dr, dc } = getStep(slot.direction, answerDirection);
  return { r: row + dr * i, c: col + dc * i };
}

function wordFitsSlot(grid: GridChar[][], word: string, slot: Slot, answerDirection: 'rtl' | 'ltr'): boolean {
  if (word.length !== slot.length) return false;

  for (let i = 0; i < word.length; i++) {
    const { r, c } = getCellAt(slot, i, answerDirection);
    if (r < 0 || c < 0 || r >= grid.length || c >= grid[0].length) return false;

    const existing = grid[r][c];
    if (existing === BLOCK) return false;
    if (existing !== null && existing !== word[i]) return false;
  }

  return true;
}

function countIntersections(grid: GridChar[][], word: string, slot: Slot, answerDirection: 'rtl' | 'ltr'): number {
  let count = 0;
  for (let i = 0; i < word.length; i++) {
    const { r, c } = getCellAt(slot, i, answerDirection);
    if (grid[r]?.[c] === word[i]) count++;
  }
  return count;
}

function placeWord(grid: GridChar[][], word: string, slot: Slot, answerDirection: 'rtl' | 'ltr'): boolean {
  for (let i = 0; i < word.length; i++) {
    const { r, c } = getCellAt(slot, i, answerDirection);
    const existing = grid[r][c];
    if (existing !== null && existing !== BLOCK && existing !== word[i]) return false;
  }

  for (let i = 0; i < word.length; i++) {
    const { r, c } = getCellAt(slot, i, answerDirection);
    grid[r][c] = word[i];
  }

  return true;
}

function slotCenterScore(slot: Slot, size: number): number {
  const centerR = size / 2;
  const centerC = size / 2;
  const wordCenterR = slot.row + (slot.direction === 'down' ? slot.length / 2 : 0);
  const wordCenterC = slot.col + (slot.direction === 'across' ? slot.length / 2 : 0);
  const distToCenter = Math.hypot(wordCenterR - centerR, wordCenterC - centerC);
  const maxDist = Math.sqrt(2) * size;
  return ((maxDist - distToCenter) / maxDist) * 20;
}

function isFullyConnected(grid: GridChar[][], size: number): boolean {
  const letterCells: { r: number; c: number }[] = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const cell = grid[r][c];
      if (cell !== null && cell !== BLOCK) letterCells.push({ r, c });
    }
  }

  if (letterCells.length === 0) return true;

  const visited = new Set<string>();
  const queue: { r: number; c: number }[] = [letterCells[0]];
  visited.add(`${letterCells[0].r},${letterCells[0].c}`);

  while (queue.length > 0) {
    const { r, c } = queue.shift()!;
    const neighbors = [
      { r: r - 1, c },
      { r: r + 1, c },
      { r, c: c - 1 },
      { r, c: c + 1 },
    ];

    for (const n of neighbors) {
      if (n.r < 0 || n.r >= size || n.c < 0 || n.c >= size) continue;
      const key = `${n.r},${n.c}`;
      if (visited.has(key)) continue;
      const cell = grid[n.r][n.c];
      if (cell !== null && cell !== BLOCK) {
        visited.add(key);
        queue.push(n);
      }
    }
  }

  return visited.size === letterCells.length;
}

function calculateIntersectionPercentage(placements: Placement[], answerDirection: 'rtl' | 'ltr'): number {
  if (placements.length <= 1) return 100;

  let entriesWithIntersection = 0;
  const nonFirstCount = placements.length - 1;

  for (let i = 1; i < placements.length; i++) {
    const p = placements[i];
    const pCells = new Set<string>();
    const dr = p.direction === 'down' ? 1 : 0;
    const dc = p.direction === 'across' ? (answerDirection === 'rtl' ? -1 : 1) : 0;

    for (let j = 0; j < p.answer.length; j++) {
      const r = p.row + dr * j;
      const c = p.col + dc * j;
      pCells.add(`${r},${c}`);
    }

    let hasIntersection = false;
    for (let k = 0; k < i; k++) {
      const prev = placements[k];
      const prevDr = prev.direction === 'down' ? 1 : 0;
      const prevDc = prev.direction === 'across' ? (answerDirection === 'rtl' ? -1 : 1) : 0;
      for (let j = 0; j < prev.answer.length; j++) {
        const r = prev.row + prevDr * j;
        const c = prev.col + prevDc * j;
        if (pCells.has(`${r},${c}`)) {
          hasIntersection = true;
          break;
        }
      }
      if (hasIntersection) break;
    }

    if (hasIntersection) entriesWithIntersection++;
  }

  return nonFirstCount > 0 ? (entriesWithIntersection / nonFirstCount) * 100 : 100;
}

function countTotalIntersections(placements: Placement[], answerDirection: 'rtl' | 'ltr'): number {
  const cellCounts = new Map<string, number>();
  for (const p of placements) {
    const dr = p.direction === 'down' ? 1 : 0;
    const dc = p.direction === 'across' ? (answerDirection === 'rtl' ? -1 : 1) : 0;
    for (let i = 0; i < p.answer.length; i++) {
      const r = p.row + dr * i;
      const c = p.col + dc * i;
      const key = `${r},${c}`;
      cellCounts.set(key, (cellCounts.get(key) ?? 0) + 1);
    }
  }
  let total = 0;
  for (const count of cellCounts.values()) {
    if (count > 1) total++;
  }
  return total;
}

export function validateBlockRuns(grid: GridChar[][], size: number): boolean {
  for (let r = 0; r < size; r++) {
    let consecutiveBlocks = 0;
    for (let c = 0; c < size; c++) {
      const cell = grid[r][c];
      if (cell === BLOCK || cell === null) {
        consecutiveBlocks++;
        if (consecutiveBlocks >= 3) return false;
      } else {
        consecutiveBlocks = 0;
      }
    }
  }

  for (let c = 0; c < size; c++) {
    let consecutiveBlocks = 0;
    for (let r = 0; r < size; r++) {
      const cell = grid[r][c];
      if (cell === BLOCK || cell === null) {
        consecutiveBlocks++;
        if (consecutiveBlocks >= 3) return false;
      } else {
        consecutiveBlocks = 0;
      }
    }
  }

  return true;
}

type ConstructOptions = {
  minIntersectionPct?: number;
  minTotalIntersections?: number;
  seedPlacements?: number;
  debug?: {
    enabled: boolean;
    log: (msg: string) => void;
  };
  timeBudgetMs?: number;
  maxCandidatesPerSlot?: number;
  targetWords?: number;
};

export function constructCrossword(
  size: number,
  wordClues: WordClue[],
  template: number[][],
  answerDirection: 'rtl' | 'ltr',
  options: ConstructOptions = {},
  _targetWords = 12
): Placement[] {
  return constructCrosswordBacktracking(size, wordClues, template, answerDirection, options);
}

type WordBucket = {
  words: WordClue[];
  byPos: Map<number, Map<string, number[]>>;
};

function buildBuckets(wordClues: WordClue[]): Map<number, WordBucket> {
  const buckets = new Map<number, WordBucket>();
  for (const wc of wordClues) {
    const len = wc.answer.length;
    let bucket = buckets.get(len);
    if (!bucket) {
      bucket = { words: [], byPos: new Map() };
      buckets.set(len, bucket);
    }
    const idx = bucket.words.length;
    bucket.words.push(wc);
    for (let i = 0; i < len; i++) {
      const ch = wc.answer[i];
      let posMap = bucket.byPos.get(i);
      if (!posMap) {
        posMap = new Map();
        bucket.byPos.set(i, posMap);
      }
      const list = posMap.get(ch) ?? [];
      list.push(idx);
      posMap.set(ch, list);
    }
  }
  return buckets;
}

function getNow() {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now();
  }
  return Date.now();
}

function constructCrosswordBacktracking(
  size: number,
  wordClues: WordClue[],
  template: number[][],
  answerDirection: 'rtl' | 'ltr',
  options: ConstructOptions = {}
): Placement[] {
  const debug = options.debug;
  const dbg = debug?.enabled
    ? (msg: string) => {
        debug.log(msg);
      }
    : () => {};

  const slots = findSlots(template);
  const grid: GridChar[][] = Array.from({ length: size }, () => Array(size).fill(null));

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (template[r][c] === 0) grid[r][c] = BLOCK;
    }
  }

  const buckets = buildBuckets(wordClues);
  const usedWords = new Set<string>();
  const seedPlacements = Math.max(1, options.seedPlacements ?? 1);
  const maxCandidatesPerSlot = options.maxCandidatesPerSlot ?? 120;
  const targetWords = options.targetWords ?? 0;
  const deadline = getNow() + (options.timeBudgetMs ?? 70);

  let best: Placement[] = [];
  let bestScore = -1;

  const getCandidates = (slot: Slot): WordClue[] => {
    const bucket = buckets.get(slot.length);
    if (!bucket) return [];
    const fixed: Array<{ i: number; ch: string }> = [];
    for (let i = 0; i < slot.length; i++) {
      const { r, c } = getCellAt(slot, i, answerDirection);
      const cell = grid[r][c];
      if (cell && cell !== BLOCK) fixed.push({ i, ch: cell });
    }

    if (fixed.length === 0) {
      return bucket.words;
    }

    let baseList: number[] | null = null;
    for (const f of fixed) {
      const list = bucket.byPos.get(f.i)?.get(f.ch) ?? [];
      if (!baseList || list.length < baseList.length) baseList = list;
    }
    if (!baseList || baseList.length === 0) return [];

    const baseSet = new Set<number>(baseList);
    for (const f of fixed) {
      const list = bucket.byPos.get(f.i)?.get(f.ch) ?? [];
      const nextSet = new Set<number>();
      for (const idx of list) {
        if (baseSet.has(idx)) nextSet.add(idx);
      }
      if (nextSet.size === 0) return [];
      baseSet.clear();
      for (const idx of nextSet) baseSet.add(idx);
    }

    const out: WordClue[] = [];
    for (const idx of baseSet) out.push(bucket.words[idx]);
    return out;
  };

  const scorePlacements = (placements: Placement[]): number => {
    const totalLetters = placements.reduce((sum, p) => sum + p.answer.length, 0);
    const totalIntersections = countTotalIntersections(placements, answerDirection);
    return totalLetters + placements.length * 2 + totalIntersections * 3;
  };

  const validatePlacements = (placements: Placement[]): boolean => {
    if (!isFullyConnected(grid, size)) return false;
    const intersectionPct = calculateIntersectionPercentage(placements, answerDirection);
    const defaultPct = size <= 7 ? 70 : size <= 9 ? 75 : 80;
    const minIntersectionPct = options.minIntersectionPct ?? defaultPct;
    if (intersectionPct < minIntersectionPct) return false;
    const totalIntersections = countTotalIntersections(placements, answerDirection);
    const defaultRatio = size <= 7 ? 0.35 : size <= 9 ? 0.3 : 0.25;
    const defaultMinIntersections = Math.max(2, Math.floor(placements.length * defaultRatio));
    const minIntersections = options.minTotalIntersections ?? defaultMinIntersections;
    if (totalIntersections < minIntersections) return false;
    return true;
  };

  const backtrack = (remaining: Slot[], placements: Placement[]): void => {
    if (getNow() > deadline) return;

    if (remaining.length === 0 || (targetWords > 0 && placements.length >= targetWords)) {
      if (placements.length && validatePlacements(placements)) {
        const score = scorePlacements(placements);
        if (score > bestScore) {
          bestScore = score;
          best = placements.slice();
        }
      }
      return;
    }

    let bestIdx = -1;
    let bestCandidates: WordClue[] = [];
    let bestCount = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const slot = remaining[i];
      const candidates = getCandidates(slot);
      const filtered = candidates.filter((wc) => !usedWords.has(wc.answer));
      if (filtered.length === 0) {
        if (bestIdx === -1) bestIdx = i;
        bestCandidates = [];
        bestCount = 0;
        break;
      }
      if (filtered.length < bestCount) {
        bestCount = filtered.length;
        bestIdx = i;
        bestCandidates = filtered;
        if (bestCount === 1) break;
      }
    }

    if (bestIdx === -1) return;
    if (bestCandidates.length === 0) return;

    const slot = remaining[bestIdx];
    const requireIntersection = placements.length >= seedPlacements;

    const scored = bestCandidates
      .map((wc) => {
        const intersections = countIntersections(grid, wc.answer, slot, answerDirection);
        const centerBonus = slotCenterScore(slot, size);
        return { wc, score: intersections * 100 + centerBonus };
      })
      .filter((c) => !requireIntersection || c.score >= 100)
      .sort((a, b) => b.score - a.score)
      .slice(0, maxCandidatesPerSlot);

    for (const item of scored) {
      if (getNow() > deadline) return;
      const wc = item.wc;
      if (!wordFitsSlot(grid, wc.answer, slot, answerDirection)) continue;

      const changed: Array<{ r: number; c: number }> = [];
      for (let i = 0; i < wc.answer.length; i++) {
        const { r, c } = getCellAt(slot, i, answerDirection);
        if (grid[r][c] === null) changed.push({ r, c });
      }
      if (!placeWord(grid, wc.answer, slot, answerDirection)) continue;

      usedWords.add(wc.answer);
      const start = getSlotStart(slot, answerDirection);
      placements.push({
        answer: wc.answer,
        clue: wc.clue,
        row: start.row,
        col: start.col,
        direction: slot.direction,
        isRepeatedLetter: wc.isRepeatedLetter,
      });

      const nextRemaining = remaining.slice();
      nextRemaining.splice(bestIdx, 1);
      backtrack(nextRemaining, placements);

      placements.pop();
      usedWords.delete(wc.answer);
      for (const cell of changed) {
        grid[cell.r][cell.c] = null;
      }
    }
  };

  backtrack(slots, []);

  if (!best.length) {
    dbg('reject: no valid placements found in backtracking');
  }

  return best;
}
