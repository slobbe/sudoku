import { describe, expect, it } from "vitest";
import {
  boardComplete,
  clone,
  countSolutions,
  generatePuzzle,
  solveBoard,
} from "../src/lib/sudoku";

function isBoardShapeValid(board: number[][]): boolean {
  return (
    board.length === 9
    && board.every((row) => row.length === 9 && row.every((value) => Number.isInteger(value) && value >= 0 && value <= 9))
  );
}

describe("sudoku engine", () => {
  const sample = generatePuzzle("medium");

  it("generates boards with expected shape", () => {
    expect(isBoardShapeValid(sample.puzzle)).toBe(true);
    expect(isBoardShapeValid(sample.solution)).toBe(true);
  });

  it("generates puzzles with exactly one solution", () => {
    expect(countSolutions(sample.puzzle, 2)).toBe(1);
  });

  it("solves generated puzzle to the same solution", () => {
    const solved = solveBoard(sample.puzzle);
    expect(solved).not.toBeNull();
    expect(solved).toEqual(sample.solution);
  });

  it("reports completion accurately", () => {
    expect(boardComplete(sample.puzzle)).toBe(false);
    expect(boardComplete(sample.solution)).toBe(true);
  });

  it("clones boards without mutating source", () => {
    const copied = clone(sample.puzzle);
    const original = sample.puzzle[0][0];
    copied[0][0] = original === 9 ? 8 : 9;
    expect(copied).not.toEqual(sample.puzzle);
    expect(sample.puzzle[0][0]).toBe(original);
  });
});
