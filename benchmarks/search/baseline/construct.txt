import { constructArc } from './arcConsistency';
import { getEntryCellAt, type Direction } from './crossword';
import type { WordClue } from './generateCrossword';
import { type Slot } from './templates';
import { indexCandidates, lookupCandidates, type PreparedCandidates, type CandidateWindow } from './preparedCandidates';
import { prepareTemplate, type PreparedTemplate } from './preparedTemplate';

type OrientedWord = WordClue & { isInverted: boolean };

function* orientations(word: WordClue): Generator<OrientedWord> {
  yield { ...word, isInverted: false };
  yield { ...word, isInverted: true };
}

export type Placement = {
  isInverted: boolean;
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

function getCellAt(slot: Slot, i: number, answerDirection: 'rtl' | 'ltr', isInverted = false) {
  return getEntryCellAt({ ...getSlotStart(slot, answerDirection), direction: slot.direction,
    answer: { length: slot.length }, isInverted }, i, answerDirection);
}

function wordFitsSlot(grid: GridChar[][], word: string, slot: Slot, answerDirection: 'rtl' | 'ltr', isInverted: boolean): boolean {
  if (word.length !== slot.length) return false;

  for (let i = 0; i < word.length; i++) {
    const { r, c } = getCellAt(slot, i, answerDirection, isInverted);
    if (r < 0 || c < 0 || r >= grid.length || c >= grid[0].length) return false;

    const existing = grid[r][c];
    if (existing === BLOCK) return false;
    if (existing !== null && existing !== word[i]) return false;
  }

  return true;
}

function countIntersections(grid: GridChar[][], word: string, slot: Slot, answerDirection: 'rtl' | 'ltr', isInverted: boolean): number {
  let count = 0;
  for (let i = 0; i < word.length; i++) {
    const { r, c } = getCellAt(slot, i, answerDirection, isInverted);
    if (grid[r]?.[c] === word[i]) count++;
  }
  return count;
}

function placeWord(grid: GridChar[][], word: string, slot: Slot, answerDirection: 'rtl' | 'ltr', isInverted: boolean): boolean {
  if (!wordFitsSlot(grid, word, slot, answerDirection, isInverted)) return false;

  for (let i = 0; i < word.length; i++) {
    const { r, c } = getCellAt(slot, i, answerDirection, isInverted);
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
    for (let i = 0; i < p.answer.length; i++) {
      const { r, c } = getEntryCellAt(p, i, answerDirection);
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
  preparedCandidates?: PreparedCandidates;
  preparedTemplate?: PreparedTemplate;
  candidateWindows?: ReadonlyMap<number, CandidateWindow>;
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
  useFillAllSlots?: boolean;
};

export function constructCrossword(
  size: number,
  wordClues: WordClue[],
  template: number[][],
  answerDirection: 'rtl' | 'ltr',
  options: ConstructOptions = {}
): Placement[] {
  if (options.useFillAllSlots) {
    // Diagnosed dense English grids and 13x13 Arabic benefit from propagation
    // beyond one-hop forward checking. Keep the existing attempt budgets.
    if ((answerDirection === 'ltr' && size >= 9) || (answerDirection === 'rtl' && size >= 13)) {
      return constructArc(size, wordClues, template, answerDirection, options);
    }
    return constructCrosswordFillAllSlots(size, wordClues, template, answerDirection, options);
  }
  if (options.useWordCentric) {
    return constructCrosswordWordCentric(size, wordClues, template, answerDirection, options);
  }
  if (!options.useBacktracking) {
    return constructCrosswordGreedy(size, wordClues, template, answerDirection, options);
  }
  return constructCrosswordBacktracking(size, wordClues, template, answerDirection, options);
}

function constructCrosswordFillAllSlots(
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

  const geometry = options.preparedTemplate ?? prepareTemplate(template, answerDirection);
  const slots = geometry.slots;
  const grid: GridChar[][] = Array.from({ length: size }, () => Array(size).fill(null));

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (template[r][c] === 0) grid[r][c] = BLOCK;
    }
  }

  const prepared = options.preparedCandidates ?? indexCandidates(wordClues);
  const usedWords = new Set<string>();
  const placements: Placement[] = [];
  const deadline = getNow() + (options.timeBudgetMs ?? 400);

  const candidatesForSlot = (slot: Slot) => {
    const pattern = geometry.cells.get(slot)!.map(({ r, c }) => grid[r][c]);
    return lookupCandidates(prepared, pattern, usedWords, options.candidateWindows?.get(slot.length));
  };
  const hasCandidateForSlot = (slot: Slot): boolean => !candidatesForSlot(slot).next().done;
  const getCandidatesForSlot = (slot: Slot, limit: number): OrientedWord[] => {
    const candidates: OrientedWord[] = [];
    for (const word of candidatesForSlot(slot)) {
      candidates.push(word);
      if (candidates.length >= limit) break;
    }
    return candidates;
  };

  const applyWord = (slot: Slot, word: OrientedWord): Array<{ r: number; c: number }> => {
    const changed: Array<{ r: number; c: number }> = [];
    for (let i = 0; i < slot.length; i++) {
      const { r, c } = geometry.cells.get(slot)![word.isInverted ? slot.length - 1 - i : i];
      if (grid[r][c] === null) {
        grid[r][c] = word.answer[i];
        changed.push({ r, c });
      }
    }
    return changed;
  };

  const undoWord = (changed: Array<{ r: number; c: number }>) => {
    for (const cell of changed) {
      grid[cell.r][cell.c] = null;
    }
  };

  const backtrack = (remaining: Slot[]): boolean => {
    if (getNow() > deadline) return false;
    if (remaining.length === 0) return true;

    let bestIdx = -1;
    let bestCandidates: OrientedWord[] = [];
    let bestCount = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const slot = remaining[i];
      const candidates = getCandidatesForSlot(slot, bestCount);
      if (candidates.length === 0) return false;
      if (candidates.length < bestCount) {
        bestCount = candidates.length;
        bestIdx = i;
        bestCandidates = candidates;
        if (bestCount === 1) break;
      }
    }

    if (bestIdx === -1) return false;
    const slot = remaining[bestIdx];
    const remainingSet = new Set(remaining);

    for (const wc of bestCandidates) {
      if (getNow() > deadline) return false;
      if (usedWords.has(wc.answer)) continue;

      if (!wordFitsSlot(grid, wc.answer, slot, answerDirection, wc.isInverted)) continue;
      const changed = applyWord(slot, wc);
      usedWords.add(wc.answer);

      // Forward checking: verify all intersecting remaining slots still have candidates.
      let feasible = true;
      for (const neighbor of geometry.neighbors.get(slot)!) {
        if (!remainingSet.has(neighbor) || neighbor === slot) continue;
        if (!hasCandidateForSlot(neighbor)) { feasible = false; break; }
      }

      if (feasible) {
        const start = getSlotStart(slot, answerDirection);
        placements.push({
          answer: wc.answer,
          clue: wc.clue,
          row: start.row,
          col: start.col,
          direction: slot.direction,
          isRepeatedLetter: wc.isRepeatedLetter,
          isInverted: wc.isInverted,
        });

        const next = remaining.slice();
        next.splice(bestIdx, 1);
        if (backtrack(next)) return true;

        placements.pop();
      }

      usedWords.delete(wc.answer);
      undoWord(changed);
    }

    return false;
  };

  const ok = backtrack(slots);
  if (!ok) {
    dbg('reject: no valid placements found in fill-all-slots solver');
    return [];
  }

  return placements;
}

type WordPlacement = {
  word: OrientedWord;
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

  const prepared = options.preparedCandidates ?? indexCandidates(wordClues);
  const words = [...prepared.byLength.keys()].filter(length => length >= 2 && length <= size)
    .sort((a, b) => b - a).flatMap(length => prepared.byLength.get(length)!.words);

  const usedWords = new Set<string>();
  const placements: Placement[] = [];
  let best: Placement[] = [];
  let bestScore = -1;



  const inBounds = (r: number, c: number) => r >= 0 && c >= 0 && r < size && c < size;

  const isBoundaryOk = (row: number, col: number, direction: Direction, len: number) => {
    if (direction === 'down') {
      const prevR = row - 1;
      const nextR = row + len;
      if (inBounds(prevR, col) && grid[prevR][col] !== BLOCK && grid[prevR][col] !== null) return false;
      if (inBounds(nextR, col) && grid[nextR][col] !== BLOCK && grid[nextR][col] !== null) return false;
      return true;
    }
    const dc = answerDirection === 'rtl' ? -1 : 1;
    const prevC = col - dc;
    const nextC = col + dc * len;
    if (inBounds(row, prevC) && grid[row][prevC] !== BLOCK && grid[row][prevC] !== null) return false;
    if (inBounds(row, nextC) && grid[row][nextC] !== BLOCK && grid[row][nextC] !== null) return false;
    return true;
  };

  const placeable = (word: string, row: number, col: number, direction: Direction, isInverted: boolean): number | null => {
    if (!isBoundaryOk(row, col, direction, word.length)) return null;
    let intersections = 0;
    for (let i = 0; i < word.length; i++) {
      const { r, c } = getEntryCellAt({ row, col, direction, answer: word, isInverted }, i, answerDirection);
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
    const word = placement.word.answer;
    for (let i = 0; i < word.length; i++) {
      const { r, c } = getEntryCellAt({ ...placement, answer: word, isInverted: placement.word.isInverted }, i, answerDirection);
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

  const generatePlacementsForWord = (canonicalWord: WordClue): WordPlacement[] => {
    const placementsOut: WordPlacement[] = [];
    const letterMap = buildLetterMap();
    let matchedAny = false;

    for (const word of orientations(canonicalWord)) {
      for (let i = 0; i < word.answer.length; i++) {
        const ch = word.answer[i];
        const positions = letterMap.get(ch);
        if (!positions || positions.length === 0) continue;
        matchedAny = true;
        for (const pos of positions) {
          for (const direction of ['across', 'down'] as Direction[]) {
            const offset = getEntryCellAt({ row: 0, col: 0, direction, answer: word.answer, isInverted: word.isInverted }, i, answerDirection);
            const row = pos.r - offset.r;
            const col = pos.c - offset.c;
            const intersections = placeable(word.answer, row, col, direction, word.isInverted);
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
          for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {
              const intersections = placeable(word.answer, r, c, direction, word.isInverted);
              if (intersections === null) continue;
              if (intersections !== 0) continue;
              // ensure word stays within white cells only
              const { r: endR, c: endC } = getEntryCellAt({ row: r, col: c, direction, answer: word.answer, isInverted: false }, word.answer.length - 1, answerDirection);
              if (!inBounds(endR, endC)) continue;
              placementsOut.push({ word, row: r, col: c, direction, intersections: 0 });
            }
          }
        }
      }

    }
    return placementsOut;
  };

  const pickSeedPlacement = (): WordPlacement | null => {
    for (const canonicalWord of words) for (const word of orientations(canonicalWord)) {
      if (usedWords.has(word.answer)) continue;
      let bestSeed: WordPlacement | null = null;
      let bestSeedScore = -Infinity;
      for (const direction of ['across', 'down'] as Direction[]) {
        for (let r = 0; r < size; r++) {
          for (let c = 0; c < size; c++) {
            const intersections = placeable(word.answer, r, c, direction, word.isInverted);
            if (intersections === null || intersections !== 0) continue;
            const { r: endR, c: endC } = getEntryCellAt({ row: r, col: c, direction, answer: word.answer, isInverted: false }, word.answer.length - 1, answerDirection);
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

    let next: { word: WordClue; placements: WordPlacement[] } | null = null;
    for (const word of words) {
      if (usedWords.has(word.answer)) continue;
      const placementsForWord = generatePlacementsForWord(word);
      if (placementsForWord.length && (!next || placementsForWord.length < next.placements.length)) {
        next = { word, placements: placementsForWord };
      }
    }

    if (!next) {
      recordBest();
      return;
    }
    // Intersection scores are bounded integers. Bucket them instead of sorting
    // every placement when only a limited best subset will be explored.
    const byIntersections = Array.from({ length: next.word.answer.length + 1 }, () => [] as WordPlacement[]);
    for (const placement of next.placements) byIntersections[placement.intersections].push(placement);
    const sortedPlacements: WordPlacement[] = [];
    const limit = options.maxCandidatesPerSlot ?? 200;
    for (let score = byIntersections.length - 1; score >= 0 && sortedPlacements.length < limit; score--) {
      for (const placement of byIntersections[score]) {
        if (sortedPlacements.length >= limit) break;
        sortedPlacements.push(placement);
      }
    }

    for (const placement of sortedPlacements) {
      if (getNow() > deadline) return;
      const word = placement.word;
      if (usedWords.has(word.answer)) continue;
      if (placeable(word.answer, placement.row, placement.col, placement.direction, word.isInverted) === null) continue;

      const changed = applyPlacement(placement);
      usedWords.add(word.answer);
      placements.push({
        answer: word.answer,
        clue: word.clue,
        row: placement.row,
        col: placement.col,
        direction: placement.direction,
        isRepeatedLetter: word.isRepeatedLetter,
        isInverted: word.isInverted,
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
  dbg(`seed: word=${seed.word.answer} len=${seed.word.answer.length} row=${seed.row} col=${seed.col} dir=${seed.direction}`);
  const seedChanged = applyPlacement(seed);
  usedWords.add(seed.word.answer);
  placements.push({
    answer: seed.word.answer,
    clue: seed.word.clue,
    row: seed.row,
    col: seed.col,
    direction: seed.direction,
    isRepeatedLetter: seed.word.isRepeatedLetter,
    isInverted: seed.word.isInverted,
  });

  recordBest();
  backtrack();

  // cleanup seed for consistency if needed
  undoPlacement(seedChanged);

  dbg(`best placements=${best.length}`);
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

  const geometry = options.preparedTemplate ?? prepareTemplate(template, answerDirection);
  const slots = geometry.slots;
  const grid: GridChar[][] = Array.from({ length: size }, () => Array(size).fill(null));

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (template[r][c] === 0) grid[r][c] = BLOCK;
    }
  }

  const placements: Placement[] = [];
  const usedWords = new Set<string>();
  const usedSlots = new Set<string>();

  const prepared = options.preparedCandidates ?? indexCandidates(wordClues);

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

    const bucket = prepared.byLength.get(slot.length)?.words ?? [];
    if (!bucket.length) {
      dbg(`slot length ${slot.length}: no candidates`);
      return false;
    }

    let bestWord: OrientedWord | null = null;
    let bestScore = -1;

    const startIdx = Math.floor(Math.random() * bucket.length);
    const pattern = geometry.cells.get(slot)!.map(({ r, c }) => grid[r][c]);
    for (const wc of lookupCandidates(prepared, pattern, usedWords, { offset: startIdx, count: bucket.length })) {
      if (usedWords.has(wc.answer)) continue;
      if (!wordFitsSlot(grid, wc.answer, slot, answerDirection, wc.isInverted)) continue;

      const intersections = countIntersections(grid, wc.answer, slot, answerDirection, wc.isInverted);
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
    const placed = placeWord(grid, bestWord.answer, slot, answerDirection, bestWord.isInverted);
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
      isInverted: bestWord.isInverted,
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
    for (let i = 0; i < p.answer.length; i++) {
      const { r, c } = getEntryCellAt(p, i, answerDirection);
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

  const geometry = options.preparedTemplate ?? prepareTemplate(template, answerDirection);
  const slots = geometry.slots;
  const grid: GridChar[][] = Array.from({ length: size }, () => Array(size).fill(null));

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (template[r][c] === 0) grid[r][c] = BLOCK;
    }
  }

  const prepared = options.preparedCandidates ?? indexCandidates(wordClues);
  const usedWords = new Set<string>();
  const seedPlacements = Math.max(1, options.seedPlacements ?? 1);
  const maxCandidatesPerSlot = options.maxCandidatesPerSlot ?? 120;
  const targetWords = options.targetWords ?? 0;
  const minWords = Math.max(1, options.minWords ?? Math.min(6, targetWords || 6));
  const deadline = getNow() + (options.timeBudgetMs ?? 70);

  let best: Placement[] = [];
  let bestScore = -1;

  const getCandidates = (slot: Slot) => [...lookupCandidates(prepared,
    geometry.cells.get(slot)!.map(({ r, c }) => grid[r][c]), usedWords, options.candidateWindows?.get(slot.length))];

  const scorePlacements = (placements: Placement[]): number => {
    const totalLetters = placements.reduce((sum, p) => sum + p.answer.length, 0);
    const totalIntersections = countTotalIntersections(placements, answerDirection);
    return totalLetters + placements.length * 2 + totalIntersections * 3;
  };

  const validatePlacements = (): boolean => {
    if (!isFullyConnected(grid, size)) return false;
    return true;
  };

  const maybeRecordBest = (placements: Placement[]) => {
    if (placements.length < minWords) return;
    if (!validatePlacements()) return;
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
    let bestCandidates: OrientedWord[] = [];
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

    // All matching words cover the same fixed cells, so their scores tie.
    const intersections = countIntersections(grid, bestCandidates[0].answer, slot, answerDirection, bestCandidates[0].isInverted);
    const scored = requireIntersection && intersections === 0 ? [] : bestCandidates.slice(0, maxCandidatesPerSlot);

    for (const wc of scored) {
      if (getNow() > deadline) return;
      if (!wordFitsSlot(grid, wc.answer, slot, answerDirection, wc.isInverted)) continue;

      const changed: Array<{ r: number; c: number }> = [];
      for (let i = 0; i < wc.answer.length; i++) {
        const { r, c } = getCellAt(slot, i, answerDirection);
        if (grid[r][c] === null) changed.push({ r, c });
      }
      if (!placeWord(grid, wc.answer, slot, answerDirection, wc.isInverted)) continue;

      usedWords.add(wc.answer);
      const start = getSlotStart(slot, answerDirection);
      placements.push({
        answer: wc.answer,
        clue: wc.clue,
        row: start.row,
        col: start.col,
        direction: slot.direction,
        isRepeatedLetter: wc.isRepeatedLetter,
        isInverted: wc.isInverted,
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
