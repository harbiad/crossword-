import { describe, expect, it } from 'vitest';
import { getEntryCellAt, getEntryCells, type Entry } from './crossword';
import { backspace, enterCharacter, getPhysicalArrowCell, isArrowKey, type Fill } from './navigation';

for (const answerDirection of ['ltr', 'rtl'] as const) {
  for (const direction of ['across', 'down'] as const) {
    for (const isInverted of [false, true]) {
      describe(`${answerDirection} ${direction} ${isInverted ? 'inverted' : 'normal'}`, () => {
        const entry: Entry = {
          id: 'entry', direction, answer: answerDirection === 'rtl' ? 'كتابك' : 'HELLO',
          row: 2, col: direction === 'across' && answerDirection === 'rtl' ? 6 : 2,
          isInverted, clue: 'Unmarked clue', number: 1,
        };
        const cells = getEntryCells(entry, answerDirection);
        const cellKey = (index: number) => `${cells[index].r},${cells[index].c}`;
        const filled = (...indices: number[]): Fill => Object.fromEntries(indices.map(i => [cellKey(i), entry.answer[i]]));

        it('types in canonical answer order through every cell', () => {
          let fill: Fill = {};
          let current = getEntryCellAt(entry, 0, answerDirection);
          const physicalStep = direction === 'down'
            ? { r: isInverted ? -1 : 1, c: 0 }
            : { r: 0, c: (answerDirection === 'rtl' ? -1 : 1) * (isInverted ? -1 : 1) };
          for (let i = 0; i < entry.answer.length; i++) {
            const result = enterCharacter(cells, current, fill, entry.answer[i])!;
            expect(result.fill[cellKey(i)]).toBe(entry.answer[i]);
            expect(fill[cellKey(i)]).toBeUndefined();
            if (i < cells.length - 1) {
              expect(result.activeCell).toEqual({ r: current.r + physicalStep.r, c: current.c + physicalStep.c });
            } else {
              expect(result.activeCell).toEqual(current);
            }
            fill = result.fill;
            current = result.activeCell;
          }
          expect(fill).toEqual(filled(0, 1, 2, 3, 4));
        });

        it('skips an existing crossing letter', () => {
          const fill = filled(2);
          const first = enterCharacter(cells, cells[0], fill, entry.answer[0])!;
          expect(first.activeCell).toEqual(cells[1]);
          const second = enterCharacter(cells, cells[1], first.fill, entry.answer[1])!;
          expect(second.activeCell).toEqual(cells[3]);
          expect(second.fill[cellKey(2)]).toBe(entry.answer[2]);
          expect(fill).toEqual(filled(2));
        });

        it('skips two consecutive filled crossing cells', () => {
          const result = enterCharacter(cells, cells[0], filled(1, 2), entry.answer[0])!;
          expect(result.activeCell).toEqual(cells[3]);
          expect(result.fill).toEqual(filled(0, 1, 2));
        });

        it('advances to the last available empty square', () => {
          expect(enterCharacter(cells, cells[0], filled(1, 2, 3), entry.answer[0])?.activeCell).toEqual(cells[4]);
        });

        it('stays put with a completely filled remainder, without wrapping to an earlier empty cell', () => {
          const result = enterCharacter(cells, cells[1], filled(2, 3, 4), entry.answer[1])!;
          expect(result.activeCell).toEqual(cells[1]);
          expect(result.fill[cellKey(0)]).toBeUndefined();
        });

        it('replaces a deliberately selected filled cell and allows retyping the same letter', () => {
          const fill = filled(0, 1, 2);
          expect(enterCharacter(cells, cells[1], fill, 'X')).toEqual({
            fill: { ...fill, [cellKey(1)]: 'X' }, activeCell: cells[3],
          });
          expect(enterCharacter(cells, cells[1], fill, entry.answer[1])?.activeCell).toEqual(cells[3]);
        });

        it('does not advance on deletion via the input change event', () => {
          expect(enterCharacter(cells, cells[1], filled(1), '')).toEqual({ fill: { [cellKey(1)]: '' }, activeCell: cells[1] });
        });

        it('Backspace clears a filled current cell without moving', () => {
          const fill = filled(0, 1, 2);
          expect(backspace(cells, cells[2], fill)).toEqual({ fill: { ...fill, [cellKey(2)]: '' }, activeCell: cells[2] });
          expect(fill).toEqual(filled(0, 1, 2));
        });

        it('Backspace on empty moves one answer index backward and clears even a crossing letter', () => {
          expect(backspace(cells, cells[3], filled(2))).toEqual({ fill: { [cellKey(2)]: '' }, activeCell: cells[2] });
          expect(backspace(cells, cells[3], filled(1))?.activeCell).toEqual(cells[2]);
        });

        it('Backspace at empty answer index zero stays within the entry', () => {
          expect(backspace(cells, cells[0], {})?.activeCell).toEqual(cells[0]);
        });

        it('arrows follow physical directions within the selected entry', () => {
          const current = cells[2];
          const offsets = { ArrowLeft: [0, -1], ArrowRight: [0, 1], ArrowUp: [-1, 0], ArrowDown: [1, 0] } as const;
          for (const [arrow, [dr, dc]] of Object.entries(offsets)) {
            expect(isArrowKey(arrow)).toBe(true);
            if (!isArrowKey(arrow)) throw new Error('Invalid test arrow');
            const expected = direction === 'across' ? dr === 0 : dc === 0;
            expect(getPhysicalArrowCell(cells, current, arrow)).toEqual(expected ? { r: current.r + dr, c: current.c + dc } : null);
          }
          const leftOrTop = direction === 'across' ? { r: 2, c: 2 } : cells.find(cell => cell.r === 2)!;
          expect(getPhysicalArrowCell(cells, leftOrTop, direction === 'across' ? 'ArrowLeft' : 'ArrowUp')).toBeNull();
        });

        it('never edits or navigates from a cell outside the entry', () => {
          const outside = { r: 0, c: 0 };
          expect(enterCharacter(cells, outside, {}, 'X')).toBeNull();
          expect(backspace(cells, outside, {})).toBeNull();
          expect(getPhysicalArrowCell(cells, outside, 'ArrowRight')).toBeNull();
          expect(enterCharacter(cells, cells[4], {}, 'X')?.activeCell).toEqual(cells[4]);
        });
      });
    }
  }
}
