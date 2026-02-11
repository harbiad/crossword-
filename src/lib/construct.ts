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
const SHORT_WORD_MAX_LEN = 3;

export type ConstructRejectReason =
  | 'timeout'
  | 'no_seed_candidate'
  | 'no_candidates_for_slot'
  | 'incomplete_fill'
  | 'disconnected_letters';

type ConstructOptions = {
  debug?: {
    enabled: boolean;
    log: (msg: string) => void;
  };
  timeBudgetMs?: number;
  maxCandidatesPerSlot?: number;
  maxShortReuse?: number;
  seedPlacements?: number;
  strategy?: 'slot_fill' | 'hybrid';
  onReject?: (reason: ConstructRejectReason) => void;
  allowSyntheticFillers?: boolean;
  preferSyntheticFillers?: boolean;
};

function getNow() {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now();
  }
  return Date.now();
}

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
    const existing = grid[r]?.[c];
    if (existing === undefined || existing === BLOCK) return false;
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

function placeWord(grid: GridChar[][], word: string, slot: Slot, answerDirection: 'rtl' | 'ltr'): Array<{ r: number; c: number }> {
  const changed: Array<{ r: number; c: number }> = [];
  for (let i = 0; i < word.length; i++) {
    const { r, c } = getCellAt(slot, i, answerDirection);
    if (grid[r][c] === null) {
      grid[r][c] = word[i];
      changed.push({ r, c });
    }
  }
  return changed;
}

function undoPlacement(grid: GridChar[][], changed: Array<{ r: number; c: number }>) {
  for (const cell of changed) grid[cell.r][cell.c] = null;
}

function isFullyConnected(grid: GridChar[][], size: number): boolean {
  const letterCells: Array<{ r: number; c: number }> = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const cell = grid[r][c];
      if (cell !== null && cell !== BLOCK) letterCells.push({ r, c });
    }
  }
  if (letterCells.length === 0) return true;

  const visited = new Set<string>();
  const queue: Array<{ r: number; c: number }> = [letterCells[0]];
  visited.add(`${letterCells[0].r},${letterCells[0].c}`);

  while (queue.length > 0) {
    const cur = queue.shift()!;
    const neighbors = [
      { r: cur.r - 1, c: cur.c },
      { r: cur.r + 1, c: cur.c },
      { r: cur.r, c: cur.c - 1 },
      { r: cur.r, c: cur.c + 1 },
    ];
    for (const n of neighbors) {
      if (n.r < 0 || n.c < 0 || n.r >= size || n.c >= size) continue;
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

export function validateBlockRuns(grid: GridChar[][], size: number): boolean {
  for (let r = 0; r < size; r++) {
    let consecutiveBlocks = 0;
    for (let c = 0; c < size; c++) {
      const cell = grid[r][c];
      if (cell === BLOCK || cell === null) {
        consecutiveBlocks++;
        if (consecutiveBlocks >= 4) return false;
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
        if (consecutiveBlocks >= 4) return false;
      } else {
        consecutiveBlocks = 0;
      }
    }
  }

  return true;
}

type Candidate = {
  word: WordClue;
  intersections: number;
};

function slotCenterScore(slot: Slot, size: number): number {
  const centerR = (size - 1) / 2;
  const centerC = (size - 1) / 2;
  const mid = (slot.length - 1) / 2;
  const r = slot.row + (slot.direction === 'down' ? mid : 0);
  const c = slot.col + (slot.direction === 'across' ? mid : 0);
  const dist = Math.abs(r - centerR) + Math.abs(c - centerC);
  return -dist;
}

function buildCandidates(
  slot: Slot,
  bucket: WordClue[],
  grid: GridChar[][],
  answerDirection: 'rtl' | 'ltr',
  usedLongWords: Set<string>,
  shortReuseCount: Map<string, number>,
  maxShortReuse: number,
  requireIntersection: boolean,
  maxCandidates: number,
  wordCommonness: Map<string, number>,
  allowSyntheticFillers: boolean,
  preferSyntheticFillers: boolean
): Candidate[] {
  const out: Candidate[] = [];
  for (const word of bucket) {
    const isSynthetic = Boolean(word.isRepeatedLetter && /^SYNTHETIC:/.test(word.clue));
    if (!isSynthetic && slot.length > SHORT_WORD_MAX_LEN && usedLongWords.has(word.answer)) continue;
    if (!isSynthetic && slot.length <= SHORT_WORD_MAX_LEN && (shortReuseCount.get(word.answer) ?? 0) >= maxShortReuse) continue;
    if (!wordFitsSlot(grid, word.answer, slot, answerDirection)) continue;

    const intersections = countIntersections(grid, word.answer, slot, answerDirection);
    if (requireIntersection && intersections === 0) continue;

    out.push({ word, intersections });
  }

  out.sort((a, b) => {
    if (b.intersections !== a.intersections) return b.intersections - a.intersections;
    const commonnessDiff = (wordCommonness.get(b.word.answer) ?? 0) - (wordCommonness.get(a.word.answer) ?? 0);
    if (commonnessDiff !== 0) return commonnessDiff;
    if (b.word.answer.length !== a.word.answer.length) return b.word.answer.length - a.word.answer.length;
    if (a.word.answer !== b.word.answer) return a.word.answer.localeCompare(b.word.answer);
    return a.word.clue.localeCompare(b.word.clue);
  });

  if (allowSyntheticFillers) {
    const pattern: Array<string | null> = [];
    for (let i = 0; i < slot.length; i++) {
      const { r, c } = getCellAt(slot, i, answerDirection);
      const ch = grid[r][c];
      pattern.push(ch && ch !== BLOCK ? ch : null);
    }

    const fixed = pattern.filter((ch): ch is string => Boolean(ch));
    const distinct = new Set(fixed);
    if (distinct.size <= 1 || fixed.length > 0) {
      const fillChar = fixed[0] ?? (answerDirection === 'rtl' ? 'ا' : 'E');
      const syntheticAnswer = pattern.map((ch) => ch ?? fillChar).join('');
      const synthetic: Candidate = {
        word: {
          answer: syntheticAnswer,
          clue: `SYNTHETIC:${fillChar} ×${slot.length}`,
          isRepeatedLetter: true,
        },
        intersections: fixed.length,
      };
      if (!out.length || preferSyntheticFillers) {
        out.unshift(synthetic);
      } else {
        out.push(synthetic);
      }
    }
  }

  return out.slice(0, maxCandidates);
}

function slotHasFilledCell(slot: Slot, grid: GridChar[][], answerDirection: 'rtl' | 'ltr'): boolean {
  for (let i = 0; i < slot.length; i++) {
    const { r, c } = getCellAt(slot, i, answerDirection);
    if (grid[r][c] !== null && grid[r][c] !== BLOCK) return true;
  }
  return false;
}

export function constructCrossword(
  size: number,
  wordClues: WordClue[],
  template: number[][],
  answerDirection: 'rtl' | 'ltr',
  options: ConstructOptions = {}
): Placement[] {
  const debug = options.debug;
  const dbg = debug?.enabled ? (msg: string) => debug.log(msg) : () => {};
  const reject = (reason: ConstructRejectReason) => {
    options.onReject?.(reason);
    dbg(`reject: ${reason}`);
  };

  const slots = findSlots(template)
    .slice()
    .sort((a, b) => {
      if (b.length !== a.length) return b.length - a.length;
      if (a.direction !== b.direction) return a.direction === 'across' ? -1 : 1;
      if (a.row !== b.row) return a.row - b.row;
      return a.col - b.col;
    });

  const grid: GridChar[][] = Array.from({ length: size }, () => Array(size).fill(null));
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (template[r][c] === 0) grid[r][c] = BLOCK;
    }
  }

  const wordsByLength = new Map<number, WordClue[]>();
  for (const wc of wordClues) {
    if (wc.answer.length < 2 || wc.answer.length > size) continue;
    const list = wordsByLength.get(wc.answer.length) ?? [];
    list.push(wc);
    wordsByLength.set(wc.answer.length, list);
  }
  for (const list of wordsByLength.values()) {
    list.sort((a, b) => {
      if (a.answer !== b.answer) return a.answer.localeCompare(b.answer);
      return a.clue.localeCompare(b.clue);
    });
  }

  const letterFreq = new Map<string, number>();
  for (const wc of wordClues) {
    for (const ch of wc.answer) {
      letterFreq.set(ch, (letterFreq.get(ch) ?? 0) + 1);
    }
  }
  const wordCommonness = new Map<string, number>();
  for (const wc of wordClues) {
    let score = 0;
    for (const ch of wc.answer) score += letterFreq.get(ch) ?? 0;
    wordCommonness.set(wc.answer, score);
  }

  const placements: Placement[] = [];
  const assigned = new Array<Placement | null>(slots.length).fill(null);
  const usedLongWords = new Set<string>();
  const shortReuseCount = new Map<string, number>();
  const deadline = getNow() + (options.timeBudgetMs ?? 1200);
  const maxCandidates = options.maxCandidatesPerSlot ?? (size <= 9 ? 100 : 70);
  const maxShortReuse = options.maxShortReuse ?? (size <= 9 ? 4 : 3);
  const strategy = options.strategy ?? (size <= 9 ? 'slot_fill' : 'hybrid');
  const seedPlacements = Math.max(1, options.seedPlacements ?? (strategy === 'hybrid' ? 2 : 1));
  const allowSyntheticFillers = Boolean(options.allowSyntheticFillers);
  const preferSyntheticFillers = Boolean(options.preferSyntheticFillers);

  const chooseNextSlot = (): number => {
    if (strategy === 'hybrid' && placements.length < seedPlacements) {
      let bestIdx = -1;
      let bestScore = -Infinity;
      for (let i = 0; i < slots.length; i++) {
        if (assigned[i]) continue;
        const slot = slots[i];
        const bucket = wordsByLength.get(slot.length) ?? [];
        if (!bucket.length) continue;
        const candidates = buildCandidates(
          slot,
          bucket,
          grid,
          answerDirection,
          usedLongWords,
          shortReuseCount,
          maxShortReuse,
          false,
          maxCandidates,
          wordCommonness,
          allowSyntheticFillers,
          preferSyntheticFillers
        );
        if (!candidates.length) continue;
        const score = slot.length * 100 + slotCenterScore(slot, size) - candidates.length;
        if (score > bestScore) {
          bestScore = score;
          bestIdx = i;
        }
      }
      return bestIdx === -1 ? -2 : bestIdx;
    }

    let bestIdx = -1;
    let bestCount = Infinity;
    let bestScore = Infinity;

    for (let i = 0; i < slots.length; i++) {
      if (assigned[i]) continue;
      const slot = slots[i];
      const bucket = wordsByLength.get(slot.length) ?? [];
      if (!bucket.length) return -2;

      const shouldRequireIntersection =
        placements.length >= seedPlacements && slotHasFilledCell(slot, grid, answerDirection);
      let candidates = buildCandidates(
        slot,
        bucket,
        grid,
        answerDirection,
        usedLongWords,
        shortReuseCount,
        maxShortReuse,
        shouldRequireIntersection,
        maxCandidates,
        wordCommonness,
        allowSyntheticFillers,
        preferSyntheticFillers
      );
      if (!candidates.length && shouldRequireIntersection) {
        candidates = buildCandidates(
          slot,
          bucket,
          grid,
          answerDirection,
          usedLongWords,
          shortReuseCount,
          maxShortReuse,
          false,
          maxCandidates,
          wordCommonness,
          allowSyntheticFillers,
          preferSyntheticFillers
        );
      }
      if (!candidates.length) return -2;

      const scarcityScore = candidates.length * 10 - slot.length;
      if (candidates.length < bestCount || (candidates.length === bestCount && scarcityScore < bestScore)) {
        bestIdx = i;
        bestCount = candidates.length;
        bestScore = scarcityScore;
      }
    }

    return bestIdx;
  };

  const placeAtSlot = (slotIndex: number, word: WordClue) => {
    const slot = slots[slotIndex];
    const changed = placeWord(grid, word.answer, slot, answerDirection);

    if (slot.length > SHORT_WORD_MAX_LEN) {
      usedLongWords.add(word.answer);
    } else {
      shortReuseCount.set(word.answer, (shortReuseCount.get(word.answer) ?? 0) + 1);
    }

    const start = getSlotStart(slot, answerDirection);
    const p: Placement = {
      answer: word.answer,
      clue: word.clue.replace(/^SYNTHETIC:/, ''),
      row: start.row,
      col: start.col,
      direction: slot.direction,
      isRepeatedLetter: word.isRepeatedLetter,
    };
    assigned[slotIndex] = p;
    placements.push(p);

    return changed;
  };

  const unplaceAtSlot = (slotIndex: number, word: WordClue, changed: Array<{ r: number; c: number }>) => {
    undoPlacement(grid, changed);

    if (slots[slotIndex].length > SHORT_WORD_MAX_LEN) {
      usedLongWords.delete(word.answer);
    } else {
      const next = (shortReuseCount.get(word.answer) ?? 1) - 1;
      if (next <= 0) shortReuseCount.delete(word.answer);
      else shortReuseCount.set(word.answer, next);
    }

    assigned[slotIndex] = null;
    placements.pop();
  };

  const backtrack = (): boolean => {
    if (getNow() > deadline) {
      reject('timeout');
      return false;
    }

    const nextSlotIdx = chooseNextSlot();
    if (nextSlotIdx === -1) return true;
    if (nextSlotIdx === -2) {
      if (strategy === 'hybrid' && placements.length < seedPlacements) {
        reject('no_seed_candidate');
      } else {
        reject('no_candidates_for_slot');
      }
      return false;
    }

    const slot = slots[nextSlotIdx];
    const bucket = wordsByLength.get(slot.length) ?? [];
    const shouldRequireIntersection =
      placements.length >= seedPlacements && slotHasFilledCell(slot, grid, answerDirection);
    let candidates = buildCandidates(
      slot,
      bucket,
      grid,
      answerDirection,
      usedLongWords,
      shortReuseCount,
      maxShortReuse,
      shouldRequireIntersection,
      maxCandidates,
      wordCommonness,
      allowSyntheticFillers,
      preferSyntheticFillers
    );
    if (!candidates.length && shouldRequireIntersection) {
      candidates = buildCandidates(
        slot,
        bucket,
        grid,
        answerDirection,
        usedLongWords,
        shortReuseCount,
        maxShortReuse,
        false,
        maxCandidates,
        wordCommonness,
        allowSyntheticFillers,
        preferSyntheticFillers
      );
    }

    if (!candidates.length) {
      reject('no_candidates_for_slot');
      return false;
    }

    for (const candidate of candidates) {
      const changed = placeAtSlot(nextSlotIdx, candidate.word);
      if (backtrack()) return true;
      unplaceAtSlot(nextSlotIdx, candidate.word, changed);
    }

    return false;
  };

  if (!backtrack()) return [];

  if (placements.length !== slots.length) {
    reject('incomplete_fill');
    return [];
  }

  if (!isFullyConnected(grid, size)) {
    reject('disconnected_letters');
    return [];
  }

  return assigned.filter((x): x is Placement => Boolean(x));
}
