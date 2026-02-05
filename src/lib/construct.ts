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
  minWords?: number;
  useBacktracking?: boolean;
  useWordCentric?: boolean;
};

export function constructCrossword(
  size: number,
  wordClues: WordClue[],
  template: number[][],
  answerDirection: 'rtl' | 'ltr',
  options: ConstructOptions = {},
  _targetWords = 12
): Placement[] {
  if (options.useWordCentric) {
    return constructCrosswordWordCentric(size, wordClues, template, answerDirection, options);
  }
  if (!options.useBacktracking) {
    return constructCrosswordGreedy(size, wordClues, template, answerDirection, options);
  }
  return constructCrosswordBacktracking(size, wordClues, template, answerDirection, options);
}

type WordPlacement = {
  word: WordClue;
  row: number;
  col: number;
  direction: Direction;
  intersections: number;
};

function constructCrosswordWordCentric(
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

  const grid: GridChar[][] = Array.from({ length: size }, () => Array(size).fill(null));
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (template[r][c] === 0) grid[r][c] = BLOCK;
    }
  }

  const seedPlacements = Math.max(1, options.seedPlacements ?? 1);
  const targetWords = options.targetWords ?? 0;
  const minWords = Math.max(1, options.minWords ?? 5);
  const deadline = getNow() + (options.timeBudgetMs ?? 120);

  const words = wordClues
    .filter((w) => w.answer.length >= 2 && w.answer.length <= size)
    .slice()
    .sort((a, b) => b.answer.length - a.answer.length);

  const usedWords = new Set<string>();
  const placements: Placement[] = [];
  let best: Placement[] = [];
  let bestScore = -1;

  const getStepLocal = (direction: Direction) => getStep(direction, answerDirection);

  const inBounds = (r: number, c: number) => r >= 0 && c >= 0 && r < size && c < size;

  const isBoundaryOk = (row: number, col: number, direction: Direction, len: number) => {
    if (direction === 'down') {
      const prevR = row - 1;
      const nextR = row + len;
      if (inBounds(prevR, col) && grid[prevR][col] !== BLOCK) return false;
      if (inBounds(nextR, col) && grid[nextR][col] !== BLOCK) return false;
      return true;
    }
    const dc = answerDirection === 'rtl' ? -1 : 1;
    const prevC = col - dc;
    const nextC = col + dc * len;
    if (inBounds(row, prevC) && grid[row][prevC] !== BLOCK) return false;
    if (inBounds(row, nextC) && grid[row][nextC] !== BLOCK) return false;
    return true;
  };

  const placeable = (word: string, row: number, col: number, direction: Direction): number | null => {
    if (!isBoundaryOk(row, col, direction, word.length)) return null;
    const { dr, dc } = getStepLocal(direction);
    let intersections = 0;
    for (let i = 0; i < word.length; i++) {
      const r = row + dr * i;
      const c = col + dc * i;
      if (!inBounds(r, c)) return null;
      const cell = grid[r][c];
      if (cell === BLOCK) return null;
      if (cell !== null && cell !== word[i]) return null;
      if (cell === word[i]) intersections++;
    }
    return intersections;
  };

  const applyPlacement = (placement: WordPlacement): Array<{ r: number; c: number }> => {
    const changed: Array<{ r: number; c: number }> = [];
    const { dr, dc } = getStepLocal(placement.direction);
    const word = placement.word.answer;
    for (let i = 0; i < word.length; i++) {
      const r = placement.row + dr * i;
      const c = placement.col + dc * i;
      if (grid[r][c] === null) {
        grid[r][c] = word[i];
        changed.push({ r, c });
      }
    }
    return changed;
  };

  const undoPlacement = (changed: Array<{ r: number; c: number }>) => {
    for (const cell of changed) {
      grid[cell.r][cell.c] = null;
    }
  };

  const buildLetterMap = () => {
    const map = new Map<string, Array<{ r: number; c: number }>>();
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const cell = grid[r][c];
        if (cell && cell !== BLOCK) {
          const list = map.get(cell) ?? [];
          list.push({ r, c });
          map.set(cell, list);
        }
      }
    }
    return map;
  };

  const scorePlacements = (list: Placement[]) => {
    const totalLetters = list.reduce((sum, p) => sum + p.answer.length, 0);
    const totalIntersections = countTotalIntersections(list, answerDirection);
    return totalLetters + list.length * 2 + totalIntersections * 3;
  };

  const recordBest = () => {
    if (placements.length < minWords) return;
    const score = scorePlacements(placements);
    if (score > bestScore) {
      bestScore = score;
      best = placements.slice();
    }
  };

  const generatePlacementsForWord = (word: WordClue): WordPlacement[] => {
    const placementsOut: WordPlacement[] = [];
    const letterMap = buildLetterMap();
    let matchedAny = false;

    for (let i = 0; i < word.answer.length; i++) {
      const ch = word.answer[i];
      const positions = letterMap.get(ch);
      if (!positions || positions.length === 0) continue;
      matchedAny = true;
      for (const pos of positions) {
        for (const direction of ['across', 'down'] as Direction[]) {
          const { dr, dc } = getStepLocal(direction);
          const row = pos.r - dr * i;
          const col = pos.c - dc * i;
          const intersections = placeable(word.answer, row, col, direction);
          if (intersections === null) continue;
          if (intersections === 0) continue;
          placementsOut.push({
            word,
            row,
            col,
            direction,
            intersections,
          });
        }
      }
    }

    if (!matchedAny && placements.length < seedPlacements) {
      // Allow seed placement in any valid slot if grid is empty or during initial seeding.
      for (const direction of ['across', 'down'] as Direction[]) {
        const { dr, dc } = getStepLocal(direction);
        for (let r = 0; r < size; r++) {
          for (let c = 0; c < size; c++) {
            const intersections = placeable(word.answer, r, c, direction);
            if (intersections === null) continue;
            if (intersections !== 0) continue;
            // ensure word stays within white cells only
            const endR = r + dr * (word.answer.length - 1);
            const endC = c + dc * (word.answer.length - 1);
            if (!inBounds(endR, endC)) continue;
            placementsOut.push({ word, row: r, col: c, direction, intersections: 0 });
          }
        }
      }
    }

    return placementsOut;
  };

  const pickSeedPlacement = (): WordPlacement | null => {
    for (const word of words) {
      if (usedWords.has(word.answer)) continue;
      let bestSeed: WordPlacement | null = null;
      let bestSeedScore = -Infinity;
      for (const direction of ['across', 'down'] as Direction[]) {
        const { dr, dc } = getStepLocal(direction);
        for (let r = 0; r < size; r++) {
          for (let c = 0; c < size; c++) {
            const intersections = placeable(word.answer, r, c, direction);
            if (intersections === null || intersections !== 0) continue;
            const endR = r + dr * (word.answer.length - 1);
            const endC = c + dc * (word.answer.length - 1);
            if (!inBounds(endR, endC)) continue;
            const centerBonus = slotCenterScore({ row: r, col: c, direction, length: word.answer.length }, size);
            const score = word.answer.length * 10 + centerBonus;
            if (score > bestSeedScore) {
              bestSeedScore = score;
              bestSeed = { word, row: r, col: c, direction, intersections: 0 };
            }
          }
        }
      }
      if (bestSeed) return bestSeed;
    }
    return null;
  };

  const backtrack = () => {
    if (getNow() > deadline) return;
    if (targetWords > 0 && placements.length >= targetWords) {
      recordBest();
      return;
    }

    const candidates: Array<{ word: WordClue; placements: WordPlacement[] }> = [];
    for (const word of words) {
      if (usedWords.has(word.answer)) continue;
      const placementsForWord = generatePlacementsForWord(word);
      if (placementsForWord.length > 0) {
        candidates.push({ word, placements: placementsForWord });
      }
    }

    if (candidates.length === 0) {
      recordBest();
      return;
    }

    candidates.sort((a, b) => a.placements.length - b.placements.length);
    const next = candidates[0];
    const sortedPlacements = next.placements
      .sort((a, b) => b.intersections - a.intersections)
      .slice(0, options.maxCandidatesPerSlot ?? 200);

    for (const placement of sortedPlacements) {
      if (getNow() > deadline) return;
      const word = placement.word;
      if (usedWords.has(word.answer)) continue;
      if (placeable(word.answer, placement.row, placement.col, placement.direction) === null) continue;

      const changed = applyPlacement(placement);
      usedWords.add(word.answer);
      placements.push({
        answer: word.answer,
        clue: word.clue,
        row: placement.row,
        col: placement.col,
        direction: placement.direction,
        isRepeatedLetter: word.isRepeatedLetter,
      });

      recordBest();
      backtrack();

      placements.pop();
      usedWords.delete(word.answer);
      undoPlacement(changed);
    }
  };

  const seed = pickSeedPlacement();
  if (!seed) {
    dbg('reject: no seed placement found');
    return [];
  }
  const seedChanged = applyPlacement(seed);
  usedWords.add(seed.word.answer);
  placements.push({
    answer: seed.word.answer,
    clue: seed.word.clue,
    row: seed.row,
    col: seed.col,
    direction: seed.direction,
    isRepeatedLetter: seed.word.isRepeatedLetter,
  });

  recordBest();
  backtrack();

  // cleanup seed for consistency if needed
  undoPlacement(seedChanged);

  if (!best.length) {
    dbg('reject: no valid placements found in word-centric search');
  }

  return best;
}

function constructCrosswordGreedy(
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

  const placements: Placement[] = [];
  const usedWords = new Set<string>();
  const usedSlots = new Set<string>();

  const wordsByLength = new Map<number, WordClue[]>();
  for (const wc of wordClues) {
    const len = wc.answer.length;
    if (!wordsByLength.has(len)) wordsByLength.set(len, []);
    wordsByLength.get(len)!.push(wc);
  }

  const slotOrder = slots
    .slice()
    .sort((a, b) => {
      const lenDiff = b.length - a.length;
      if (lenDiff !== 0) return lenDiff;
      const centerDiff = slotCenterScore(b, size) - slotCenterScore(a, size);
      if (centerDiff !== 0) return centerDiff;
      return Math.random() - 0.5;
    });

  const tryPlaceSlot = (slot: Slot, requireIntersection: boolean): boolean => {
    const slotKey = `${slot.row},${slot.col},${slot.direction}`;
    if (usedSlots.has(slotKey)) return false;

    const bucket = wordsByLength.get(slot.length) ?? [];
    if (!bucket.length) {
      dbg(`slot length ${slot.length}: no candidates`);
      return false;
    }

    let bestWord: WordClue | null = null;
    let bestScore = -1;

    const startIdx = Math.floor(Math.random() * bucket.length);
    for (let i = 0; i < bucket.length; i++) {
      const wc = bucket[(startIdx + i) % bucket.length];
      if (usedWords.has(wc.answer)) continue;
      if (!wordFitsSlot(grid, wc.answer, slot, answerDirection)) continue;

      const intersections = countIntersections(grid, wc.answer, slot, answerDirection);
      if (requireIntersection && intersections === 0) continue;

      const centerBonus = slotCenterScore(slot, size);
      const score = intersections * 100 + centerBonus + Math.random();
      if (score > bestScore) {
        bestScore = score;
        bestWord = wc;
      }
    }

    if (!bestWord) {
      dbg(
        `slot ${slot.row},${slot.col},${slot.direction},len=${slot.length}: no fit (requireIntersection=${requireIntersection})`
      );
      return false;
    }
    const placed = placeWord(grid, bestWord.answer, slot, answerDirection);
    if (!placed) return false;

    usedWords.add(bestWord.answer);
    usedSlots.add(slotKey);
    const start = getSlotStart(slot, answerDirection);
    placements.push({
      answer: bestWord.answer,
      clue: bestWord.clue,
      row: start.row,
      col: start.col,
      direction: slot.direction,
      isRepeatedLetter: bestWord.isRepeatedLetter,
    });
    return true;
  };

  const seedPlacements = Math.max(1, options.seedPlacements ?? 1);
  let placedAny = false;
  for (const slot of slotOrder) {
    if (!placedAny) {
      placedAny = tryPlaceSlot(slot, false) || placedAny;
      continue;
    }
    const requireIntersection = placements.length >= seedPlacements;
    tryPlaceSlot(slot, requireIntersection);
  }

  const validPlacements: Placement[] = [];
  for (const p of placements) {
    let isValid = true;
    const dr = p.direction === 'down' ? 1 : 0;
    const dc = p.direction === 'across' ? (answerDirection === 'rtl' ? -1 : 1) : 0;
    for (let i = 0; i < p.answer.length; i++) {
      const r = p.row + dr * i;
      const c = p.col + dc * i;
      if (grid[r]?.[c] !== p.answer[i]) {
        isValid = false;
        break;
      }
    }
    if (isValid) validPlacements.push(p);
  }

  if (!isFullyConnected(grid, size)) {
    dbg('reject: not fully connected');
    return [];
  }

  return validPlacements;
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
  const minWords = Math.max(1, options.minWords ?? Math.min(6, targetWords || 6));
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

  const validatePlacements = (_placements: Placement[]): boolean => {
    if (!isFullyConnected(grid, size)) return false;
    return true;
  };

  const maybeRecordBest = (placements: Placement[]) => {
    if (placements.length < minWords) return;
    if (!validatePlacements(placements)) return;
    const score = scorePlacements(placements);
    if (score > bestScore) {
      bestScore = score;
      best = placements.slice();
    }
  };

  const backtrack = (remaining: Slot[], placements: Placement[]): void => {
    if (getNow() > deadline) return;

    if (remaining.length === 0 || (targetWords > 0 && placements.length >= targetWords)) {
      maybeRecordBest(placements);
      return;
    }

    let bestIdx = -1;
    let bestCandidates: WordClue[] = [];
    let bestCount = Infinity;

    if (placements.length === 0) {
      let bestSlotScore = -Infinity;
      for (let i = 0; i < remaining.length; i++) {
        const slot = remaining[i];
        const candidates = getCandidates(slot);
        const filtered = candidates.filter((wc) => !usedWords.has(wc.answer));
        if (filtered.length === 0) continue;
        const score = slot.length * 10 + slotCenterScore(slot, size);
        if (score > bestSlotScore) {
          bestSlotScore = score;
          bestIdx = i;
          bestCandidates = filtered;
          bestCount = filtered.length;
        }
      }
    } else {
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

      maybeRecordBest(placements);

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
