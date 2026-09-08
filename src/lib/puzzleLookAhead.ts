import type { Crossword } from './crossword';
import type { WordClue } from './generateCrossword';
import type { CefrBand } from './cefr';
import type { Mode } from './i18n';

export type PuzzleSettings = { size: number; band: CefrBand; mode: Mode };
export type CachedPuzzle = { puzzle: Crossword; pool: WordClue[] };
type Build = (settings: PuzzleSettings, pool: WordClue[], signal: AbortSignal) => Promise<Crossword>;
const settingsKey = ({ size, band, mode }: PuzzleSettings) => JSON.stringify([size, band, mode]);

// A collision-free signature of the solution, independent of clue wording,
// entry ordering, IDs, and filled-in player values. The recent set is bounded.
export function puzzleSignature(puzzle: Crossword): string {
  return JSON.stringify([puzzle.width, puzzle.height, puzzle.answerDirection,
    puzzle.grid.map(row => row.map(cell => cell.type === 'block' ? null : cell.char))]);
}

export class PuzzleLookAhead {
  private key: string | null = null;
  private cached: CachedPuzzle | null = null;
  private source: { settings: PuzzleSettings; pool: WordClue[] } | null = null;
  private recent = new Set<string>();
  private timer: ReturnType<typeof setTimeout> | null = null;
  private job: AbortController | null = null;
  private visible = true;
  private mayBuild = false;
  private active = false;
  private build: Build;
  private delayMs: number;

  constructor(build: Build, delayMs = 1000) {
    this.build = build;
    this.delayMs = delayMs;
  }

  settingsChanged(settings: PuzzleSettings) {
    const key = settingsKey(settings);
    if (key === this.key) return;
    this.clear();
    this.key = key;
  }

  hasSeen(puzzle: Crossword): boolean { return this.recent.has(puzzleSignature(puzzle)); }

  remember(puzzle: Crossword) {
    const signature = puzzleSignature(puzzle);
    this.recent.delete(signature);
    this.recent.add(signature);
    if (this.recent.size > 8) this.recent.delete(this.recent.keys().next().value!);
  }

  // Called first for active requests, including misses: background work never
  // delays a user action, and visibility changes cannot restart it meanwhile.
  take(settings: PuzzleSettings): CachedPuzzle | null {
    this.settingsChanged(settings);
    this.active = true;
    this.cancelBackground();
    this.source = null;
    this.mayBuild = false;
    const cached = this.cached;
    this.cached = null;
    return cached && !this.hasSeen(cached.puzzle) ? cached : null;
  }

  finishActive() { this.active = false; }

  // React calls this after committing a displayed puzzle. Reuse its actual
  // candidate pool; pre-generation performs no additional API fetch.
  afterDisplay(settings: PuzzleSettings, pool: WordClue[]) {
    if (this.active || settingsKey(settings) !== this.key) return;
    this.cancelBackground();
    this.cached = null;
    this.source = { settings: { ...settings }, pool };
    this.mayBuild = true;
    this.schedule();
  }

  setVisible(visible: boolean) {
    this.visible = visible;
    if (!visible) this.cancelBackground();
    else this.schedule();
  }

  clear() {
    this.cancelBackground();
    this.key = null;
    this.cached = null;
    this.source = null;
    this.mayBuild = false;
  }

  private cancelBackground() {
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = null;
    this.job?.abort();
    this.job = null;
  }

  private schedule() {
    if (this.active || !this.visible || !this.mayBuild || !this.source || this.cached || this.job || this.timer !== null) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      if (!this.visible || !this.mayBuild || !this.source) return;
      const { settings, pool } = this.source;
      const key = this.key;
      const job = new AbortController();
      this.job = job;
      // Exactly one speculative attempt per displayed puzzle. A duplicate,
      // failure or hidden-tab cancellation does not cause a regeneration loop.
      this.mayBuild = false;
      void Promise.resolve().then(() => this.build(settings, pool, job.signal)).then(puzzle => {
        if (job.signal.aborted || this.job !== job || this.key !== key) return;
        if (puzzle.entries.length && !this.hasSeen(puzzle)) this.cached = { puzzle, pool };
      }).catch(() => {
        // Speculation is optional; errors must not affect the displayed puzzle.
      }).finally(() => {
        if (this.job === job) this.job = null;
      });
    }, this.delayMs);
  }
}
