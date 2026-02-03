import { useMemo, useState, useRef, useCallback } from 'react';
import './App.css';
import type { Crossword, Entry } from './lib/crossword';
import { getEntryCells as getEntryCellsForEntry, getEntryCellAt } from './lib/crossword';
import { generateCrossword } from './lib/generateCrossword';
import { bandToCefr, type CefrBand } from './lib/cefr';

type Mode = 'en_to_ar' | 'ar_to_en';

type Fill = Record<string, string>; // key: r,c -> user char

function key(r: number, c: number) {
  return `${r},${c}`;
}

function getEntryCells(cw: Crossword, entryId: string) {
  const e = cw.entries.find((x) => x.id === entryId);
  if (!e) return [] as { r: number; c: number }[];
  return getEntryCellsForEntry(e, cw.answerDirection);
}

function normalizeChar(ch: string) {
  return ch.trim().slice(0, 1).toUpperCase();
}

// Detect and convert old-format repeated letter clues ("Double X", "Triple X") to "X ×N" format
function parseRepeatedLetter(clue: string): { letter: string; count: number } | null {
  const doubleMatch = clue.match(/^Double\s+([A-Z])$/i);
  if (doubleMatch) return { letter: doubleMatch[1].toUpperCase(), count: 2 };

  const tripleMatch = clue.match(/^Triple\s+([A-Z])$/i);
  if (tripleMatch) return { letter: tripleMatch[1].toUpperCase(), count: 3 };

  const tokenMatch = clue.match(/^([A-Z])\s*[×x]\s*(\d+)$/i);
  if (tokenMatch) return { letter: tokenMatch[1].toUpperCase(), count: Number(tokenMatch[2]) };

  const countFirst = clue.match(/^(\d+)\s*(?:x|×|times)?\s*([A-Z])$/i);
  if (countFirst) return { letter: countFirst[2].toUpperCase(), count: Number(countFirst[1]) };

  const repeatedMatch = clue.match(/^(\d+)\s*repeated\s*([A-Z])$/i);
  if (repeatedMatch) return { letter: repeatedMatch[2].toUpperCase(), count: Number(repeatedMatch[1]) };

  const repeatedAlt = clue.match(/^([A-Z])\s*repeated\s*(\d+)$/i);
  if (repeatedAlt) return { letter: repeatedAlt[1].toUpperCase(), count: Number(repeatedAlt[2]) };

  return null;
}

function formatRepeatedLetterClue(clue: string): string {
  const parsed = parseRepeatedLetter(clue);
  if (!parsed) return clue;
  return `${parsed.letter} ×${parsed.count}`;
}

// Check if a clue is a repeated letter clue (either by flag or by pattern)
function isRepeatedLetterClue(clue: string, isRepeatedLetterFlag?: boolean): boolean {
  if (isRepeatedLetterFlag) return true;
  if (parseRepeatedLetter(clue)) return true;
  if (/حرف مكرر/.test(clue)) return true;
  return false;
}

export default function App() {
  const [size, setSize] = useState<number>(7);
  const [band, setBand] = useState<CefrBand>('beginner');
  const [mode, setMode] = useState<Mode>('en_to_ar');

  const [cw, setCw] = useState<Crossword | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [fill, setFill] = useState<Fill>({});
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [activeCell, setActiveCell] = useState<{ r: number; c: number } | null>(null);

  // Refs for input elements keyed by "r,c"
  const inputRefs = useRef<Map<string, HTMLInputElement>>(new Map());

  const selectedCells = useMemo(() => {
    if (!cw || !selectedEntryId) return [];
    return getEntryCells(cw, selectedEntryId);
  }, [cw, selectedEntryId]);

  const selectedEntry = useMemo(() => {
    if (!cw || !selectedEntryId) return null;
    return cw.entries.find((e) => e.id === selectedEntryId) || null;
  }, [cw, selectedEntryId]);

  // Focus a specific cell
  const focusCell = useCallback((r: number, c: number) => {
    const input = inputRefs.current.get(key(r, c));
    if (input) {
      input.focus();
      setActiveCell({ r, c });
    }
  }, []);

  // Get the next cell in the current entry direction
  const getNextCell = useCallback((
    currentR: number,
    currentC: number,
    entry: Entry | null,
    direction: 'forward' | 'backward'
  ): { r: number; c: number } | null => {
    if (!cw || !entry) return null;

    const isRtlAcross = cw.answerDirection === 'rtl' && entry.direction === 'across';
    const isDown = entry.direction === 'down';

    // For RTL across: forward = left (-1), backward = right (+1)
    // For LTR across: forward = right (+1), backward = left (-1)
    // For down: forward = down (+1), backward = up (-1)
    let dr = 0, dc = 0;
    if (isDown) {
      dr = direction === 'forward' ? 1 : -1;
    } else if (isRtlAcross) {
      dc = direction === 'forward' ? -1 : 1;
    } else {
      dc = direction === 'forward' ? 1 : -1;
    }

    const nextR = currentR + dr;
    const nextC = currentC + dc;

    // Check if next cell is within bounds and part of the entry
    if (nextR < 0 || nextR >= cw.size || nextC < 0 || nextC >= cw.size) return null;
    const nextCell = cw.grid[nextR]?.[nextC];
    if (!nextCell || nextCell.type === 'block') return null;

    return { r: nextR, c: nextC };
  }, [cw]);

  function onCellClick(r: number, c: number) {
    if (!cw) return;
    const cell = cw.grid[r][c];
    if (cell.type === 'block') return;
    const entries = Array.from(cell.entries);
    if (entries.length > 0) {
      if (selectedEntryId && cell.entries.has(selectedEntryId)) {
        setSelectedEntryId(selectedEntryId);
      } else {
        setSelectedEntryId(entries[0]);
      }
    }
    setActiveCell({ r, c });
  }

  function onCellChange(r: number, c: number, v: string) {
    const ch = normalizeChar(v);
    setFill((prev) => ({ ...prev, [key(r, c)]: ch }));

    // Auto-advance to next cell after typing
    if (ch && selectedEntry) {
      const nextCell = getNextCell(r, c, selectedEntry, 'forward');
      if (nextCell) {
        setTimeout(() => focusCell(nextCell.r, nextCell.c), 0);
      }
    }
  }

  // Handle keyboard navigation
  const onCellKeyDown = useCallback((
    e: React.KeyboardEvent<HTMLInputElement>,
    r: number,
    c: number
  ) => {
    if (!cw || !selectedEntry) return;

    const isRtlAcross = cw.answerDirection === 'rtl' && selectedEntry.direction === 'across';
    const isDown = selectedEntry.direction === 'down';

    if (e.key === 'Backspace') {
      // If cell is empty, move backward and delete that cell
      const currentValue = fill[key(r, c)] || '';
      if (!currentValue) {
        const prevCell = getNextCell(r, c, selectedEntry, 'backward');
        if (prevCell) {
          setFill((prev) => ({ ...prev, [key(prevCell.r, prevCell.c)]: '' }));
          focusCell(prevCell.r, prevCell.c);
          e.preventDefault();
        }
      }
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      if (isDown) {
        // In down mode, left arrow does nothing or could switch to across entry
      } else if (isRtlAcross) {
        // RTL across: left = forward
        const nextCell = getNextCell(r, c, selectedEntry, 'forward');
        if (nextCell) focusCell(nextCell.r, nextCell.c);
      } else {
        // LTR across: left = backward
        const prevCell = getNextCell(r, c, selectedEntry, 'backward');
        if (prevCell) focusCell(prevCell.r, prevCell.c);
      }
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      if (isDown) {
        // In down mode, right arrow does nothing
      } else if (isRtlAcross) {
        // RTL across: right = backward
        const prevCell = getNextCell(r, c, selectedEntry, 'backward');
        if (prevCell) focusCell(prevCell.r, prevCell.c);
      } else {
        // LTR across: right = forward
        const nextCell = getNextCell(r, c, selectedEntry, 'forward');
        if (nextCell) focusCell(nextCell.r, nextCell.c);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (isDown) {
        // Down mode: up = backward
        const prevCell = getNextCell(r, c, selectedEntry, 'backward');
        if (prevCell) focusCell(prevCell.r, prevCell.c);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (isDown) {
        // Down mode: down = forward
        const nextCell = getNextCell(r, c, selectedEntry, 'forward');
        if (nextCell) focusCell(nextCell.r, nextCell.c);
      }
    }
  }, [cw, selectedEntry, fill, getNextCell, focusCell]);

  function reset() {
    setFill({});
  }

  function revealSelected() {
    if (!cw || !selectedEntryId) return;
    const entry = cw.entries.find((e) => e.id === selectedEntryId);
    if (!entry) return;
    setFill((prev) => {
      const next = { ...prev };
      for (let i = 0; i < entry.answer.length; i++) {
        const { r, c } = getEntryCellAt(entry, i, cw.answerDirection);
        next[key(r, c)] = entry.answer[i];
      }
      return next;
    });
  }

  function revealAll() {
    if (!cw) return;
    setFill((prev) => {
      const next = { ...prev };
      for (const e of cw.entries) {
        for (let i = 0; i < e.answer.length; i++) {
          const { r, c } = getEntryCellAt(e, i, cw.answerDirection);
          next[key(r, c)] = e.answer[i];
        }
      }
      return next;
    });
  }

  function checkSelected() {
    if (!cw || !selectedEntry) return;
    let ok = true;
    for (let i = 0; i < selectedEntry.answer.length; i++) {
      const { r, c } = getEntryCellAt(selectedEntry, i, cw.answerDirection);
      const u = fill[key(r, c)] || '';
      if (u !== selectedEntry.answer[i]) {
        ok = false;
        break;
      }
    }
    alert(ok ? 'Correct!' : 'Not correct yet.');
  }

  async function newPuzzle() {
    setLoading(true);
    setError(null);
    setSelectedEntryId(null);

    try {
      const resp = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ size, mode, band }),
      });
      const raw = await resp.text();
      let data: any = null;
      try {
        data = raw ? JSON.parse(raw) : null;
      } catch {
        // If server returns HTML/text error, surface a helpful snippet.
        throw new Error(`Server returned non-JSON (${resp.status}). ${raw.slice(0, 120)}`);
      }
      if (!resp.ok) throw new Error(data?.error || `Failed to generate (${resp.status})`);

      const entries = Array.isArray(data?.entries) ? data.entries : [];
      if (entries.length < 6) throw new Error('Not enough entries generated. Try again.');

      // Determine answer direction based on mode
      const answerDirection = mode === 'en_to_ar' ? 'rtl' : 'ltr';
      let next: Crossword | null = null;
      let finalSize = size;
      const buildInvertedEntries = (list: typeof entries) => {
        if (mode !== 'en_to_ar') return list;
        const extra = list
          .filter((e: { answer?: unknown; clue?: unknown }) => typeof e.answer === 'string' && e.answer.length >= 2)
          .map((e: { answer: string; clue?: unknown }) => ({
            ...e,
            clue: `${String(e.clue ?? '')} (inverted)`,
            answer: [...String(e.answer)].reverse().join(''),
          }));
        return [...list, ...extra];
      };
      const entriesWithInverted = buildInvertedEntries(entries);
      for (let attempt = 0; attempt < 3; attempt++) {
        const candidate = generateCrossword(size, entriesWithInverted, answerDirection);
        if (candidate.entries.length) {
          next = candidate;
          break;
        }
      }
      if (!next) {
        const fallbackSizes = [9, 11, 13].filter((s) => s > size);
        for (const fallback of fallbackSizes) {
          for (let attempt = 0; attempt < 2; attempt++) {
            const candidate = generateCrossword(fallback, entriesWithInverted, answerDirection);
            if (candidate.entries.length) {
              next = candidate;
              finalSize = fallback;
              break;
            }
          }
          if (next) break;
        }
      }
      if (!next) throw new Error('Could not fit words into a crossword grid. Try again.');

      setCw(next);
      if (finalSize !== size) setSize(finalSize);
      setFill({});
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app">
      <header className="header">
        <h1>Crossword 29</h1>
        <p className="subtitle">English ↔ Arabic vocabulary practice</p>
      </header>

      <div className="controls">
        <label>
          Grid
          <select value={size} onChange={(e) => setSize(Number(e.target.value))}>
            {[7, 9, 11, 13].map((n) => (
              <option key={n} value={n}>
                {n}×{n}
              </option>
            ))}
          </select>
        </label>

        <label>
          Level
          <select value={band} onChange={(e) => setBand(e.target.value as CefrBand)}>
            <option value="beginner">Beginner (A1–A2)</option>
            <option value="intermediate">Intermediate (B1–B2)</option>
            <option value="advanced">Advanced (C1–C2)</option>
          </select>
        </label>

        <label>
          Mode
          <select value={mode} onChange={(e) => setMode(e.target.value as Mode)}>
            <option value="en_to_ar">English clue → Arabic answer</option>
            <option value="ar_to_en">Arabic clue → English answer</option>
          </select>
        </label>

        <button onClick={newPuzzle} disabled={loading}>
          {loading ? 'Generating…' : 'New puzzle'}
        </button>
      </div>

      {error && <div className="error">{error}</div>}

      {cw && (
        <div className="main">
          <div className="grid" style={{ gridTemplateColumns: `repeat(${cw.width}, 1fr)` }} dir={cw.answerDirection}>
            {cw.grid.flatMap((row, r) =>
              row.map((cell, c) => {
                const displayCol = cw.answerDirection === 'rtl' ? cw.width - c : c + 1;
                const cellStyle = { gridColumnStart: displayCol, gridRowStart: r + 1 };
                if (cell.type === 'block') {
                  return <div key={key(r, c)} className="cell block" style={cellStyle} />;
                }

                const isSelected = selectedCells.some((x) => x.r === r && x.c === c);

                const isActive = activeCell?.r === r && activeCell?.c === c;

                return (
                  <div key={key(r, c)} className={`cell ${isSelected ? 'selected' : ''} ${isActive ? 'active' : ''}`} style={cellStyle} onClick={() => onCellClick(r, c)}>
                    {cell.number ? <div className="cellNumber">{cell.number}</div> : null}
                    <input
                      ref={(el) => {
                        if (el) inputRefs.current.set(key(r, c), el);
                        else inputRefs.current.delete(key(r, c));
                      }}
                      className={mode === 'en_to_ar' ? 'rtlInput' : ''}
                      dir={mode === 'en_to_ar' ? 'rtl' : 'ltr'}
                      value={fill[key(r, c)] || ''}
                      onChange={(e) => onCellChange(r, c, e.target.value)}
                      onKeyDown={(e) => onCellKeyDown(e, r, c)}
                      maxLength={1}
                      inputMode="text"
                    />
                  </div>
                );
              }),
            )}
          </div>

          <div className="sidebar">
            <div className="clues">
              <h2>Clues</h2>
              {selectedEntry && (
                <div className="selected-clue">
                  <strong>
                    {selectedEntry.number} {selectedEntry.direction}
                  </strong>
                  : {selectedEntry.clue}
                </div>
              )}

              <div className="clueColumns">
                <div>
                  <h3>Across</h3>
                  <ul>
                    {cw.entries
                      .filter((e) => e.direction === 'across' && !isRepeatedLetterClue(e.clue, e.isRepeatedLetter))
                      .map((e) => (
                        <li key={e.id}>
                          <button className="clueBtn" onClick={() => setSelectedEntryId(e.id)}>
                            {e.number}. {e.clue}
                          </button>
                        </li>
                      ))}
                  </ul>
                </div>

                <div>
                  <h3>Down</h3>
                  <ul>
                    {cw.entries
                      .filter((e) => e.direction === 'down' && !isRepeatedLetterClue(e.clue, e.isRepeatedLetter))
                      .map((e) => (
                        <li key={e.id}>
                          <button className="clueBtn" onClick={() => setSelectedEntryId(e.id)}>
                            {e.number}. {e.clue}
                          </button>
                        </li>
                      ))}
                  </ul>
                </div>
              </div>

              {/* Repeated letter clues section */}
              {/* en_to_ar: clues are English, ar_to_en: clues are Arabic */}
              {cw.entries.some((e) => isRepeatedLetterClue(e.clue, e.isRepeatedLetter)) && (
                <div className="repeatedClues">
                  <h3>{mode === 'ar_to_en' ? 'حروف متكررة' : 'Repeated letters'}</h3>
                  <ul>
                    {cw.entries
                      .filter((e) => isRepeatedLetterClue(e.clue, e.isRepeatedLetter))
                      .map((e) => (
                        <li key={e.id}>
                          <button className="clueBtn" onClick={() => setSelectedEntryId(e.id)}>
                            {e.number}. {formatRepeatedLetterClue(e.clue)} ({e.direction})
                          </button>
                        </li>
                      ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="bottomButtons">
              <button onClick={checkSelected} disabled={!selectedEntry}>
                Check
              </button>
              <button onClick={revealSelected} disabled={!selectedEntry}>
                Reveal Word
              </button>
              <button onClick={revealAll}>Solve All</button>
              <button onClick={reset}>Clear</button>
            </div>

            <div className="meta">
              <div>CEFR: {bandToCefr(band)}</div>
              <div>Mode: {mode === 'en_to_ar' ? 'EN→AR' : 'AR→EN'}</div>
            </div>
          </div>
        </div>
      )}

      <p className="note">
        Generation may require a few attempts for optimal results.
      </p>
    </div>
  );
}
