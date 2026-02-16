import { describe, expect, it } from "bun:test";
import {
  createBooleanBoard,
  digitsToNoteMask,
  givensSetToBooleanBoard,
  noteMaskBoardToDigitsBoard,
  noteMaskToDigits,
  toggleNoteDigit,
} from "../packages/sudoku-board/src/helpers";

describe("sudoku board helpers", () => {
  it("converts note digits to mask and back", () => {
    const mask = digitsToNoteMask([1, 3, 9]);
    expect(mask).toBe((1 << 0) | (1 << 2) | (1 << 8));
    expect(noteMaskToDigits(mask)).toEqual([1, 3, 9]);
  });

  it("toggles note digits in a mask", () => {
    let mask = digitsToNoteMask([2, 4]);
    mask = toggleNoteDigit(mask, 4);
    mask = toggleNoteDigit(mask, 7);

    expect(noteMaskToDigits(mask)).toEqual([2, 7]);
  });

  it("converts givens set to boolean board", () => {
    const board = givensSetToBooleanBoard(new Set(["0-0", "4-8", "8-3", "a-b"]));
    expect(board[0][0]).toBe(true);
    expect(board[4][8]).toBe(true);
    expect(board[8][3]).toBe(true);
    expect(board[0][1]).toBe(false);
  });

  it("converts note mask board to note digits board", () => {
    const masks = createBooleanBoard(false).map(() => Array<number>(9).fill(0));
    masks[0][0] = digitsToNoteMask([1, 5]);
    masks[3][7] = digitsToNoteMask([2, 6, 9]);

    const notes = noteMaskBoardToDigitsBoard(masks);

    expect(notes[0][0]).toEqual([1, 5]);
    expect(notes[3][7]).toEqual([2, 6, 9]);
    expect(notes[8][8]).toEqual([]);
  });
});
