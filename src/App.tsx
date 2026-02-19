import { useMemo, useState, useRef, useCallback, useEffect } from 'react';
import './App.css';
import type { Crossword, Entry } from './lib/crossword';
import { getEntryCells as getEntryCellsForEntry, getEntryCellAt } from './lib/crossword';
import { generateCrossword } from './lib/generateCrossword';
import { bandToCefr, type CefrBand } from './lib/cefr';
import { getTranslations, type Mode, getModeLabel, getModeDisplay } from './lib/i18n';

type Fill = Record<string, string>;

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

// Bilingual keyboard layout
const KEYBOARD_EN = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['Z', 'X', 'C', 'V', 'B', 'N', 'M'],
];

const KEYBOARD_AR = [
  ['ض', 'ص', 'ث', 'ق', 'ف', 'غ', 'ع', 'ه', 'خ', 'ح', 'ج', 'د'],
  ['ش', 'س', 'ي', 'ب', 'ل', 'ا', 'ت', 'ن', 'م', 'ك', 'ط'],
  ['ئ', 'ء', 'ؤ', 'ر', 'ى', 'ة', 'و', 'ز', 'ظ', 'ذ'],
];

export default function App() {
  const [size, setSize] = useState<number>(7);
  const [band, setBand] = useState<CefrBand>('beginner');
  const [mode, setMode] = useState<Mode>('en_to_ar');

  // Active mode tracks the mode of the current puzzle (for UI language)
  // Only updates when user generates a new puzzle
  const [activeMode, setActiveMode] = useState<Mode>('en_to_ar');

  const [cw, setCw] = useState<Crossword | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [fill, setFill] = useState<Fill>({});
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [activeCell, setActiveCell] = useState<{ r: number; c: number } | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [lastTappedCell, setLastTappedCell] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Get translations based on active mode (current puzzle mode)
  const t = useMemo(() => getTranslations(activeMode), [activeMode]);

  // Check if we're in RTL mode (Arabic source)
  const isRtl = activeMode === 'ar_to_en' || activeMode === 'ar_to_fr';

  const inputRefs = useRef<Map<string, HTMLInputElement>>(new Map());

  // Detect mobile for keyboard handling
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 600);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const selectedCells = useMemo(() => {
    if (!cw || !selectedEntryId) return [];
    return getEntryCells(cw, selectedEntryId);
  }, [cw, selectedEntryId]);

  const selectedEntry = useMemo(() => {
    if (!cw || !selectedEntryId) return null;
    return cw.entries.find((e) => e.id === selectedEntryId) || null;
  }, [cw, selectedEntryId]);

  // Sorted entries for navigation
  const sortedEntries = useMemo(() => {
    if (!cw) return [];
    return [...cw.entries].sort((a, b) => {
      if (a.number !== b.number) return a.number - b.number;
      return a.direction === 'across' ? -1 : 1;
    });
  }, [cw]);

  const focusCell = useCallback((r: number, c: number) => {
    const input = inputRefs.current.get(key(r, c));
    if (input) {
      input.focus();
      setActiveCell({ r, c });
    }
  }, []);

  const getNextCell = useCallback((
    currentR: number,
    currentC: number,
    entry: Entry | null,
    direction: 'forward' | 'backward'
  ): { r: number; c: number } | null => {
    if (!cw || !entry) return null;

    const isInverted = entry.clue.includes('(inverted)');
    const isRtlAcross = cw.answerDirection === 'rtl' && entry.direction === 'across';
    const isDown = entry.direction === 'down';

    // For inverted entries, reverse the movement direction
    const effectiveDirection = isInverted
      ? (direction === 'forward' ? 'backward' : 'forward')
      : direction;

    let dr = 0, dc = 0;
    if (isDown) {
      dr = effectiveDirection === 'forward' ? 1 : -1;
    } else if (isRtlAcross) {
      dc = effectiveDirection === 'forward' ? -1 : 1;
    } else {
      dc = effectiveDirection === 'forward' ? 1 : -1;
    }

    const nextR = currentR + dr;
    const nextC = currentC + dc;

    if (nextR < 0 || nextR >= cw.size || nextC < 0 || nextC >= cw.size) return null;
    const nextCell = cw.grid[nextR]?.[nextC];
    if (!nextCell || nextCell.type === 'block') return null;

    return { r: nextR, c: nextC };
  }, [cw]);

  // Handle cell click - toggle between across/down on repeated tap
  function onCellClick(r: number, c: number) {
    if (!cw) return;
    const cell = cw.grid[r][c];
    if (cell.type === 'block') return;

    const cellKey = key(r, c);
    const entryIds = Array.from(cell.entries);
    const acrossEntry = cw.entries.find(e => entryIds.includes(e.id) && e.direction === 'across');
    const downEntry = cw.entries.find(e => entryIds.includes(e.id) && e.direction === 'down');

    // Toggle logic: if same cell tapped again, switch direction
    if (lastTappedCell === cellKey && selectedEntry) {
      if (selectedEntry.direction === 'across' && downEntry) {
        setSelectedEntryId(downEntry.id);
      } else if (selectedEntry.direction === 'down' && acrossEntry) {
        setSelectedEntryId(acrossEntry.id);
      }
    } else {
      // New cell - prefer across, or down if no across
      if (acrossEntry) {
        setSelectedEntryId(acrossEntry.id);
      } else if (downEntry) {
        setSelectedEntryId(downEntry.id);
      }
    }

    setLastTappedCell(cellKey);
    setActiveCell({ r, c });
  }

  function onCellChange(r: number, c: number, v: string) {
    const ch = normalizeChar(v);
    setFill((prev) => ({ ...prev, [key(r, c)]: ch }));

    if (ch && selectedEntry) {
      const nextCell = getNextCell(r, c, selectedEntry, 'forward');
      if (nextCell) {
        setTimeout(() => focusCell(nextCell.r, nextCell.c), 0);
      }
    }
  }

  const onCellKeyDown = useCallback((
    e: React.KeyboardEvent<HTMLInputElement>,
    r: number,
    c: number
  ) => {
    if (!cw || !selectedEntry) return;

    const isRtlAcross = cw.answerDirection === 'rtl' && selectedEntry.direction === 'across';
    const isDown = selectedEntry.direction === 'down';

    if (e.key === 'Backspace') {
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
      if (!isDown) {
        const dir = isRtlAcross ? 'forward' : 'backward';
        const cell = getNextCell(r, c, selectedEntry, dir);
        if (cell) focusCell(cell.r, cell.c);
      }
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      if (!isDown) {
        const dir = isRtlAcross ? 'backward' : 'forward';
        const cell = getNextCell(r, c, selectedEntry, dir);
        if (cell) focusCell(cell.r, cell.c);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (isDown) {
        const cell = getNextCell(r, c, selectedEntry, 'backward');
        if (cell) focusCell(cell.r, cell.c);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (isDown) {
        const cell = getNextCell(r, c, selectedEntry, 'forward');
        if (cell) focusCell(cell.r, cell.c);
      }
    }
  }, [cw, selectedEntry, fill, getNextCell, focusCell]);

  // Custom keyboard input
  function onKeyboardPress(char: string) {
    if (!activeCell || !cw) return;
    const { r, c } = activeCell;
    const cell = cw.grid[r]?.[c];
    if (!cell || cell.type === 'block') return;

    const ch = normalizeChar(char);
    setFill((prev) => ({ ...prev, [key(r, c)]: ch }));

    if (selectedEntry) {
      const nextCell = getNextCell(r, c, selectedEntry, 'forward');
      if (nextCell) {
        setActiveCell(nextCell);
      }
    }
  }

  function onKeyboardBackspace() {
    if (!activeCell || !cw) return;
    const { r, c } = activeCell;
    const currentValue = fill[key(r, c)] || '';

    if (currentValue) {
      setFill((prev) => ({ ...prev, [key(r, c)]: '' }));
    } else if (selectedEntry) {
      const prevCell = getNextCell(r, c, selectedEntry, 'backward');
      if (prevCell) {
        setFill((prev) => ({ ...prev, [key(prevCell.r, prevCell.c)]: '' }));
        setActiveCell(prevCell);
      }
    }
  }

  // Navigate to prev/next clue
  function goToPrevClue() {
    if (!selectedEntry || !sortedEntries.length) return;
    const idx = sortedEntries.findIndex(e => e.id === selectedEntry.id);
    const prevIdx = idx > 0 ? idx - 1 : sortedEntries.length - 1;
    const prev = sortedEntries[prevIdx];
    setSelectedEntryId(prev.id);
    setActiveCell({ r: prev.row, c: prev.col });
  }

  function goToNextClue() {
    if (!selectedEntry || !sortedEntries.length) return;
    const idx = sortedEntries.findIndex(e => e.id === selectedEntry.id);
    const nextIdx = idx < sortedEntries.length - 1 ? idx + 1 : 0;
    const next = sortedEntries[nextIdx];
    setSelectedEntryId(next.id);
    setActiveCell({ r: next.row, c: next.col });
  }

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
    alert(ok ? t.correct : t.notCorrect);
  }

  async function newPuzzle() {
    setLoading(true);
    setError(null);
    setSelectedEntryId(null);
    setShowSettings(false);

    const bandFallbackOrder: CefrBand[] =
      band === 'beginner' ? ['beginner', 'intermediate', 'advanced'] :
      band === 'intermediate' ? ['intermediate', 'advanced'] :
      ['advanced'];

    try {
      const answerDirection = mode === 'en_to_ar' ? 'rtl' : 'ltr';
      const maxRounds = size <= 7 ? 2 : size <= 9 ? 3 : 4;
      const attemptsPerRound = size <= 7 ? 3 : size <= 9 ? 4 : 5;
      let next: Crossword | null = null;

      for (const tryBand of bandFallbackOrder) {
        for (let round = 0; round < maxRounds; round++) {
          const resp = await fetch('/api/generate', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ size, mode, band: tryBand }),
          });
          const raw = await resp.text();
          let data: any = null;
          try {
            data = raw ? JSON.parse(raw) : null;
          } catch {
            throw new Error(`Server returned non-JSON (${resp.status}).`);
          }
          if (!resp.ok) throw new Error(data?.error || `Failed (${resp.status})`);

          const entries = Array.isArray(data?.entries) ? data.entries : [];
          if (entries.length < 6) continue;

          const buildInvertedEntries = (list: typeof entries) => {
            if (mode !== 'en_to_ar') return list;
            const extra = list
              .filter((e: { answer?: unknown }) => typeof e.answer === 'string' && e.answer.length >= 2)
              .map((e: { answer: string; clue?: unknown }) => ({
                ...e,
                clue: `${String(e.clue ?? '')} (inverted)`,
                answer: [...String(e.answer)].reverse().join(''),
              }));
            return [...list, ...extra];
          };

          const entriesWithInverted = buildInvertedEntries(entries);
          for (let attempt = 0; attempt < attemptsPerRound; attempt++) {
            const candidate = generateCrossword(size, entriesWithInverted, answerDirection);
            if (candidate.entries.length) {
              next = candidate;
              break;
            }
          }
          if (next) break;
        }
        if (next) break;
      }

      if (!next) throw new Error('Could not generate puzzle. Try again.');

      setCw(next);
      setFill({});
      setActiveMode(mode); // Update active mode to current puzzle mode
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  const getCellSize = (_gridSize: number) => 36;

  const keyboardRows = mode === 'en_to_ar' ? KEYBOARD_AR : KEYBOARD_EN;

  return (
    <div className="app">
      {/* Mobile Header */}
      <header className="mobileHeader">
        <h1>{t.crossword}</h1>
        <button className="settingsBtn" onClick={() => setShowSettings(!showSettings)}>
          <span>⋮</span>
        </button>
      </header>

      {/* Settings Panel */}
      {showSettings && (
        <div className="settingsPanel">
          <label>
            <span>{t.grid}</span>
            <select value={size} onChange={(e) => setSize(Number(e.target.value))}>
              {[7, 9, 11, 13].map((n) => (
                <option key={n} value={n}>{n}×{n}</option>
              ))}
            </select>
          </label>
          <label>
            <span>{t.level}</span>
            <select value={band} onChange={(e) => setBand(e.target.value as CefrBand)}>
              <option value="beginner">{t.beginner}</option>
              <option value="intermediate">{t.intermediate}</option>
              <option value="advanced">{t.advanced}</option>
            </select>
          </label>
          <label>
            <span>{t.mode}</span>
            <select value={mode} onChange={(e) => setMode(e.target.value as Mode)}>
              <option value="en_to_ar">{getModeLabel('en_to_ar')}</option>
              <option value="ar_to_en">{getModeLabel('ar_to_en')}</option>
            </select>
          </label>
          <button className="newPuzzleBtn" onClick={newPuzzle} disabled={loading}>
            {loading ? t.loading : t.newPuzzle}
          </button>
        </div>
      )}

      {/* Desktop Controls */}
      <div className="desktopControls">
        <label>
          {t.grid}
          <select value={size} onChange={(e) => setSize(Number(e.target.value))}>
            {[7, 9, 11, 13].map((n) => (
              <option key={n} value={n}>{n}×{n}</option>
            ))}
          </select>
        </label>
        <label>
          {t.level}
          <select value={band} onChange={(e) => setBand(e.target.value as CefrBand)}>
            <option value="beginner">{t.beginner}</option>
            <option value="intermediate">{t.intermediate}</option>
            <option value="advanced">{t.advanced}</option>
          </select>
        </label>
        <label>
          {t.mode}
          <select value={mode} onChange={(e) => setMode(e.target.value as Mode)}>
            <option value="en_to_ar">{getModeLabel('en_to_ar')}</option>
            <option value="ar_to_en">{getModeLabel('ar_to_en')}</option>
          </select>
        </label>
        <button onClick={newPuzzle} disabled={loading}>
          {loading ? t.loading : t.newPuzzle}
        </button>
      </div>

      {error && <div className="error">{error}</div>}

      {cw && (
        <div className="main">
          <div className="gameArea">
            <div className="gridContainer">
              <div
                className="grid"
                style={{
                  gridTemplateColumns: `repeat(${cw.width}, var(--cell-size))`,
                  gridTemplateRows: `repeat(${cw.height}, var(--cell-size))`,
                  ['--cell-size' as string]: `${getCellSize(cw.width)}px`,
                  ['--grid-size' as string]: cw.width,
                }}
                dir={cw.answerDirection}
              >
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
                      <div
                        key={key(r, c)}
                        className={`cell ${isSelected ? 'selected' : ''} ${isActive ? 'active' : ''}`}
                        style={cellStyle}
                        onClick={() => onCellClick(r, c)}
                      >
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
                          inputMode={isMobile ? 'none' : undefined}
                          readOnly={isMobile}
                        />
                      </div>
                    );
                  }),
                )}
              </div>
            </div>

            {/* Desktop Clues Panel */}
            <div className="cluesPanel">
              <div className="cluesHeader">
                <h2>{t.clues}</h2>
              </div>
              {selectedEntry && (
                <div className="selectedClue">
                  {isRtl ? (
                    <span className="clueText" dir="rtl"><strong>{selectedEntry.number}.</strong> {selectedEntry.clue}</span>
                  ) : (
                    <>
                      <strong>{selectedEntry.number}. </strong>
                      <span>{selectedEntry.clue}</span>
                    </>
                  )}
                </div>
              )}
              <div className="cluesContent">
                <div className="clueColumns">
                  <div className="clueSection">
                    <h3>{t.across}</h3>
                    <ul className="clueList" dir={isRtl ? 'rtl' : 'ltr'}>
                      {cw.entries
                        .filter((e) => e.direction === 'across')
                        .map((e) => (
                          <li key={e.id}>
                            <button className="clueBtn" onClick={() => { setSelectedEntryId(e.id); setActiveCell({ r: e.row, c: e.col }); }}>
                              {isRtl ? <span className="clueText" dir="rtl">{e.number}. {e.clue}</span> : `${e.number}. ${e.clue}`}
                            </button>
                          </li>
                        ))}
                    </ul>
                  </div>
                  <div className="clueSection">
                    <h3>{t.down}</h3>
                    <ul className="clueList" dir={isRtl ? 'rtl' : 'ltr'}>
                      {cw.entries
                        .filter((e) => e.direction === 'down')
                        .map((e) => (
                          <li key={e.id}>
                            <button className="clueBtn" onClick={() => { setSelectedEntryId(e.id); setActiveCell({ r: e.row, c: e.col }); }}>
                              {isRtl ? <span className="clueText" dir="rtl">{e.number}. {e.clue}</span> : `${e.number}. ${e.clue}`}
                            </button>
                          </li>
                        ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Desktop Action Buttons */}
          <div className="actionButtons desktopOnly">
            <button onClick={checkSelected} disabled={!selectedEntry}>{t.check}</button>
            <button onClick={revealSelected} disabled={!selectedEntry}>{t.reveal}</button>
            <button onClick={revealAll}>{t.solveAll}</button>
            <button onClick={reset}>{t.clear}</button>
          </div>

          <div className="meta desktopOnly">
            <span>{bandToCefr(band)}</span>
            <span>{getModeDisplay(activeMode)}</span>
            <span>{cw.entries.length} {t.words}</span>
          </div>
        </div>
      )}

      {/* Mobile Clue Bar */}
      {cw && selectedEntry && (
        <div className="mobileClueBar">
          <button className="clueNavBtn" onClick={goToPrevClue}>‹</button>
          <div className="clueText">
            {isRtl ? (
              <span dir="rtl">{selectedEntry.number}. {selectedEntry.clue}</span>
            ) : (
              <>
                <span className="clueNumber">{selectedEntry.number}.</span>
                <span className="clueContent">{selectedEntry.clue}</span>
              </>
            )}
          </div>
          <button className="clueNavBtn" onClick={goToNextClue}>›</button>
        </div>
      )}

      {/* Mobile Keyboard */}
      {cw && (
        <div className="mobileKeyboard">
          {keyboardRows.map((row, i) => (
            <div key={i} className="keyboardRow">
              {row.map((char) => (
                <button key={char} className="keyBtn" onClick={() => onKeyboardPress(char)}>
                  {char}
                </button>
              ))}
              {i === keyboardRows.length - 1 && (
                <button className="keyBtn backspace" onClick={onKeyboardBackspace}>⌫</button>
              )}
            </div>
          ))}
          <div className="keyboardActions">
            <button onClick={checkSelected} disabled={!selectedEntry}>{t.check}</button>
            <button onClick={revealSelected} disabled={!selectedEntry}>{t.reveal}</button>
            <button onClick={revealAll}>{t.solve}</button>
            <button onClick={reset}>{t.clear}</button>
          </div>
        </div>
      )}

      {!cw && (
        <div className="startPrompt">
          <p>{t.startPrompt}</p>
          <button className="bigStartBtn" onClick={() => setShowSettings(true)}>
            {t.start}
          </button>
        </div>
      )}
    </div>
  );
}
