import { expect, it } from 'vitest';
import { getEntryCells, revealEntries, type Entry } from './crossword';
import { backspace, enterCharacter } from './navigation';
import { chooseGridEntry, entrySelection, getTypingStartIndicator } from './typingStart';

const cases = [
  ['English Across', 'ltr', 'across', false, 2, 1, '→'],
  ['English Across inverted', 'ltr', 'across', true, 2, 4, '←'],
  ['Arabic Across', 'rtl', 'across', false, 2, 4, '←'],
  ['Arabic Across inverted', 'rtl', 'across', true, 2, 1, '→'],
  ['English Down', 'ltr', 'down', false, 2, 1, '↓'],
  ['English Down inverted', 'ltr', 'down', true, 5, 1, '↑'],
  ['Arabic Down', 'rtl', 'down', false, 2, 1, '↓'],
  ['Arabic Down inverted', 'rtl', 'down', true, 5, 1, '↑'],
] as const;

it.each(cases)('%s indicates and selects the first canonical typing cell', (_label, answerDirection, direction, isInverted, r, c, arrow) => {
  const entry: Entry = { id: 'entry', number: 1, row: 2,
    col: direction === 'across' && answerDirection === 'rtl' ? 4 : 1,
    direction, isInverted, answer: answerDirection === 'rtl' ? 'سلام' : 'WORD', clue: 'Plain clue' };
  const fill = Object.freeze({});
  expect(getTypingStartIndicator(entry, answerDirection, fill)).toEqual({ r, c, arrow });
  // Shared by clue clicks, Prev/Next, and crossing direction switches in App.
  expect(entrySelection(entry, answerDirection)).toEqual({ entryId: entry.id, activeCell: { r, c } });
  const chosen = chooseGridEntry([entry], new Set([entry.id]), null, false)!;
  expect(entrySelection(chosen, answerDirection).activeCell).toEqual({ r, c });
  expect(getTypingStartIndicator({ ...entry, clue: 'Misleading (inverted)' }, answerDirection, fill))
    .toEqual({ r, c, arrow });

  const cells = getEntryCells(entry, answerDirection);
  const typed = enterCharacter(cells, { r, c }, fill, entry.answer[0])!;
  expect(typed.fill[`${r},${c}`]).toBe(entry.answer[0]);
  expect(getTypingStartIndicator(entry, answerDirection, typed.fill)).toBeNull();
  expect(fill).toEqual({});
  const cleared = backspace(cells, { r, c }, typed.fill)!;
  expect(getTypingStartIndicator(entry, answerDirection, cleared.fill)).toEqual({ r, c, arrow });
  expect(getTypingStartIndicator(entry, answerDirection, revealEntries([entry], {}, answerDirection))).toBeNull();
});

it.each(['ltr', 'rtl'] as const)('repeated %s crossing clicks refocus each chosen entry start, never the crossing', answerDirection => {
  const across: Entry = { id: 'across', number: 1, row: 2, col: answerDirection === 'ltr' ? 1 : 4,
    direction: 'across', isInverted: true, answer: 'WORD', clue: '' };
  const down: Entry = { id: 'down', number: 2, row: 1, col: 2,
    direction: 'down', isInverted: true, answer: 'WORD', clue: '' };
  const ids = new Set(['across', 'down']);
  const crossing = { r: 2, c: 2 };
  let selected: string | null = null;
  for (const [i, expected] of [across, down, across, down].entries()) {
    const chosen = chooseGridEntry([down, across], ids, selected, i > 0)!;
    expect(chosen).toBe(expected);
    const selection = entrySelection(chosen, answerDirection);
    expect(selection.activeCell).toEqual(chosen === across
      ? { r: 2, c: answerDirection === 'ltr' ? 4 : 1 } : { r: 4, c: 2 });
    expect(selection.activeCell).not.toEqual(crossing);
    selected = selection.entryId;
  }
  expect(chooseGridEntry([down, across], ids, down.id, false)).toBe(across);
  expect(chooseGridEntry([down], new Set([down.id]), down.id, true)).toBe(down);
});

it('shows no indicator without a selected entry', () => {
  expect(getTypingStartIndicator(null, 'ltr', {})).toBeNull();
});
