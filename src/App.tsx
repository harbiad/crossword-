import { useMemo, useState, useRef, useEffect, useLayoutEffect } from 'react';
import './App.css';
import type { Crossword, Entry } from './lib/crossword';
import { getEntryCells as getEntryCellsForEntry, getEntryCellAt, revealEntries, checkEntry, displayClue } from './lib/crossword';
import { generateCrossword, type WordClue } from './lib/generateCrossword';
import { bandToCefr, type CefrBand } from './lib/cefr';
import { getTranslations, type Mode, getModeLabel, getModeDisplay } from './lib/i18n';

import { enterCharacter, backspace, getPhysicalArrowCell, isArrowKey, type Fill } from './lib/navigation';

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

  // Focus after React commits the new entry, cell and value. Selecting the value
  // lets a deliberate click, clue selection or arrow move replace a filled cell.
  useLayoutEffect(() => {
    if (!activeCell) return;
    const input = inputRefs.current.get(key(activeCell.r, activeCell.c));
    input?.focus();
    input?.select();
  }, [activeCell, selectedEntryId]);

  function selectEntry(entry: Entry) {
    if (!cw) return;
    setSelectedEntryId(entry.id);
    setActiveCell(getEntryCellAt(entry, 0, cw.answerDirection));
    setLastTappedCell(null);
  }

  // Tab/focus navigation must keep the active cell and selected entry in sync,
  // but only a repeated click/tap may toggle the direction at a crossing.
  function onCellFocus(r: number, c: number) {
    if (!cw) return;
    const cell = cw.grid[r][c];
    if (cell.type === 'block') return;
    if (!selectedEntry || !cell.entries.has(selectedEntry.id)) {
      const entry = cw.entries.find(entry => cell.entries.has(entry.id) && entry.direction === 'across')
        ?? cw.entries.find(entry => cell.entries.has(entry.id));
      if (entry) setSelectedEntryId(entry.id);
    }
    if (activeCell?.r !== r || activeCell?.c !== c) {
      setActiveCell({ r, c });
      setLastTappedCell(null);
    }
  }

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

  // Physical input and the custom keyboard use exactly the same state changes.
  function onCellChange(r: number, c: number, value: string) {
    const result = enterCharacter(selectedCells, { r, c }, fill, normalizeChar(value));
    if (!result) return;
    setFill(result.fill);
    setActiveCell({ ...result.activeCell });
    setLastTappedCell(null);
  }

  function onBackspace(r: number, c: number) {
    const result = backspace(selectedCells, { r, c }, fill);
    if (!result) return;
    setFill(result.fill);
    setActiveCell({ ...result.activeCell });
    setLastTappedCell(null);
  }

  function onCellKeyDown(e: React.KeyboardEvent<HTMLInputElement>, r: number, c: number) {
    if (!cw || !selectedEntry || e.nativeEvent.isComposing) return;
    if (e.key === 'Backspace') {
      e.preventDefault();
      onBackspace(r, c);
    } else if (isArrowKey(e.key)) {
      e.preventDefault();
      const cell = getPhysicalArrowCell(selectedCells, { r, c }, e.key);
      if (cell) setActiveCell({ ...cell });
      setLastTappedCell(null);
    } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      // Handle printable keys directly so maxLength=1 cannot block replacement,
      // including retyping the same letter or using hardware keys on mobile.
      e.preventDefault();
      onCellChange(r, c, e.key);
    }
  }

  function onKeyboardPress(char: string) {
    if (activeCell) onCellChange(activeCell.r, activeCell.c, char);
  }

  function onKeyboardBackspace() {
    if (activeCell) onBackspace(activeCell.r, activeCell.c);
  }

  // Navigate to prev/next clue
  function goToPrevClue() {
    if (!selectedEntry || !sortedEntries.length) return;
    const idx = sortedEntries.findIndex(e => e.id === selectedEntry.id);
    const prevIdx = idx > 0 ? idx - 1 : sortedEntries.length - 1;
    const prev = sortedEntries[prevIdx];
    selectEntry(prev);
  }

  function goToNextClue() {
    if (!selectedEntry || !sortedEntries.length) return;
    const idx = sortedEntries.findIndex(e => e.id === selectedEntry.id);
    const nextIdx = idx < sortedEntries.length - 1 ? idx + 1 : 0;
    const next = sortedEntries[nextIdx];
    selectEntry(next);
  }

  function reset() {
    setFill({});
  }

  function revealSelected() {
    if (!cw || !selectedEntryId) return;
    const entry = cw.entries.find((e) => e.id === selectedEntryId);
    if (!entry) return;
    setFill(prev => revealEntries([entry], prev, cw.answerDirection));
  }

  function revealAll() {
    if (!cw) return;
    setFill(prev => revealEntries(cw.entries, prev, cw.answerDirection));
  }

  function checkSelected() {
    if (!cw || !selectedEntry) return;
    alert(checkEntry(selectedEntry, fill, cw.answerDirection) ? t.correct : t.notCorrect);
  }

  async function newPuzzle() {
    setLoading(true);
    setError(null);
    setSelectedEntryId(null);
    setActiveCell(null);
    setLastTappedCell(null);
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
          let data: { error?: string; entries?: WordClue[] } | null = null;
          try {
            data = raw ? JSON.parse(raw) : null;
          } catch {
            throw new Error(`Server returned non-JSON (${resp.status}).`);
          }
          if (!resp.ok) throw new Error(data?.error || `Failed (${resp.status})`);

          const entries = Array.isArray(data?.entries) ? data.entries : [];
          if (entries.length < 6) continue;

          for (let attempt = 0; attempt < attemptsPerRound; attempt++) {
            const candidate = generateCrossword(size, entries, answerDirection);
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
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  const getCellSize = () => 36;

  const answerDirection = cw?.answerDirection ?? (activeMode === 'en_to_ar' ? 'rtl' : 'ltr');
  const keyboardRows = answerDirection === 'rtl' ? KEYBOARD_AR : KEYBOARD_EN;

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
                  ['--cell-size' as string]: `${getCellSize()}px`,
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
                          className={answerDirection === 'rtl' ? 'rtlInput' : ''}
                          dir={answerDirection}
                          value={fill[key(r, c)] || ''}
                          onFocus={() => onCellFocus(r, c)}
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
                    <span className="clueText" dir="rtl"><strong>{selectedEntry.number}.</strong> {displayClue(selectedEntry)}</span>
                  ) : (
                    <>
                      <strong>{selectedEntry.number}. </strong>
                      <span>{displayClue(selectedEntry)}</span>
                    </>
                  )}
                </div>
              )}
              <div className="cluesContent">
                <div className="clueColumns">
                  <div className="clueSection">
                    <h3 dir={isRtl ? 'rtl' : 'ltr'}>{t.across}</h3>
                    <ul className="clueList" dir={isRtl ? 'rtl' : 'ltr'}>
                      {cw.entries
                        .filter((e) => e.direction === 'across')
                        .map((e) => (
                          <li key={e.id}>
                            <button className="clueBtn" onClick={() => selectEntry(e)}>
                              {isRtl ? <span className="clueText" dir="rtl">{e.number}. {displayClue(e)}</span> : `${e.number}. ${displayClue(e)}`}
                            </button>
                          </li>
                        ))}
                    </ul>
                  </div>
                  <div className="clueSection">
                    <h3 dir={isRtl ? 'rtl' : 'ltr'}>{t.down}</h3>
                    <ul className="clueList" dir={isRtl ? 'rtl' : 'ltr'}>
                      {cw.entries
                        .filter((e) => e.direction === 'down')
                        .map((e) => (
                          <li key={e.id}>
                            <button className="clueBtn" onClick={() => selectEntry(e)}>
                              {isRtl ? <span className="clueText" dir="rtl">{e.number}. {displayClue(e)}</span> : `${e.number}. ${displayClue(e)}`}
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
              <span dir="rtl">{selectedEntry.number}. {displayClue(selectedEntry)}</span>
            ) : (
              <>
                <span className="clueNumber">{selectedEntry.number}.</span>
                <span className="clueContent">{displayClue(selectedEntry)}</span>
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
