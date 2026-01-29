import { useMemo, useState } from 'react';
import './App.css';
import type { Crossword } from './lib/crossword';
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
  const cells: { r: number; c: number }[] = [];
  for (let i = 0; i < e.answer.length; i++) {
    const r = e.row + (e.direction === 'down' ? i : 0);
    const c = e.col + (e.direction === 'across' ? i : 0);
    cells.push({ r, c });
  }
  return cells;
}

function normalizeChar(ch: string) {
  return ch.trim().slice(0, 1).toUpperCase();
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

  const selectedCells = useMemo(() => {
    if (!cw || !selectedEntryId) return [];
    return getEntryCells(cw, selectedEntryId);
  }, [cw, selectedEntryId]);

  const selectedEntry = useMemo(() => {
    if (!cw || !selectedEntryId) return null;
    return cw.entries.find((e) => e.id === selectedEntryId) || null;
  }, [cw, selectedEntryId]);

  function onCellClick(r: number, c: number) {
    if (!cw) return;
    const cell = cw.grid[r][c];
    if (cell.isBlock) return;
    if (cell.entryId) setSelectedEntryId(cell.entryId);
  }

  function onCellChange(r: number, c: number, v: string) {
    const ch = normalizeChar(v);
    setFill((prev) => ({ ...prev, [key(r, c)]: ch }));
  }

  function reset() {
    setFill({});
  }

  function revealSelected() {
    if (!cw || !selectedEntryId) return;
    const cells = getEntryCells(cw, selectedEntryId);
    const entry = cw.entries.find((e) => e.id === selectedEntryId);
    if (!entry) return;
    setFill((prev) => {
      const next = { ...prev };
      for (let i = 0; i < cells.length; i++) {
        const { r, c } = cells[i];
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
        const cells = getEntryCells(cw, e.id);
        for (let i = 0; i < cells.length; i++) {
          const { r, c } = cells[i];
          next[key(r, c)] = e.answer[i];
        }
      }
      return next;
    });
  }

  function checkSelected() {
    if (!cw || !selectedEntry) return;
    const cells = getEntryCells(cw, selectedEntry.id);
    let ok = true;
    for (let i = 0; i < cells.length; i++) {
      const { r, c } = cells[i];
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
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || 'Failed to generate');

      const entries = Array.isArray(data?.entries) ? data.entries : [];
      if (entries.length < 6) throw new Error('Not enough entries generated. Try again.');

      const next = generateCrossword(size, entries);
      if (!next.entries.length) throw new Error('Could not fit words into a crossword grid. Try again.');

      setCw(next);
      setFill({});
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app">
      <h1>Crossword (EN ↔ AR)</h1>

      <div className="controls">
        <label>
          Grid
          <select value={size} onChange={(e) => setSize(Number(e.target.value))}>
            {[5, 7, 9, 11, 13].map((n) => (
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
          <div className="grid" style={{ gridTemplateColumns: `repeat(${cw.size}, 1fr)` }}>
            {cw.grid.flatMap((row, r) =>
              row.map((cell, c) => {
                if (cell.isBlock) {
                  return <div key={key(r, c)} className="cell block" />;
                }

                const isSelected = selectedCells.some((x) => x.r === r && x.c === c);

                return (
                  <div key={key(r, c)} className={`cell ${isSelected ? 'selected' : ''}`} onClick={() => onCellClick(r, c)}>
                    {cell.number ? <div className="cellNumber">{cell.number}</div> : null}
                    <input
                      value={fill[key(r, c)] || ''}
                      onChange={(e) => onCellChange(r, c, e.target.value)}
                      maxLength={1}
                      inputMode="text"
                    />
                  </div>
                );
              }),
            )}
          </div>

          <div className="sidebar">
            <div className="buttons">
              <button onClick={checkSelected} disabled={!selectedEntry}>
                Check answer (selected)
              </button>
              <button onClick={revealSelected} disabled={!selectedEntry}>
                Answer selected word
              </button>
              <button onClick={revealAll}>Answer (solve grid)</button>
              <button onClick={reset}>Reset</button>
            </div>

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
              <h3>Across</h3>
              <ul>
                {cw.entries
                  .filter((e) => e.direction === 'across')
                  .map((e) => (
                    <li key={e.id}>
                      <button className="clueBtn" onClick={() => setSelectedEntryId(e.id)}>
                        {e.number}. {e.clue}
                      </button>
                    </li>
                  ))}
              </ul>
              <h3>Down</h3>
              <ul>
                {cw.entries
                  .filter((e) => e.direction === 'down')
                  .map((e) => (
                    <li key={e.id}>
                      <button className="clueBtn" onClick={() => setSelectedEntryId(e.id)}>
                        {e.number}. {e.clue}
                      </button>
                    </li>
                  ))}
              </ul>

              <div className="meta">
                <div>CEFR: {bandToCefr(band)}</div>
                <div>Mode: {mode === 'en_to_ar' ? 'EN→AR' : 'AR→EN'}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      <p className="note">
        Tip: generating a good crossword may take a couple tries depending on the word list and grid size.
      </p>
    </div>
  );
}
