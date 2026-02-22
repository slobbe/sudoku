import { describe, expect, it } from "bun:test";
import {
  boardComplete,
  clone,
  countSolutions,
  createSeededRng,
  dateSeed,
  generatePuzzle,
  generatePuzzleCandidate,
  ratePuzzleDifficulty,
  solveBoard,
} from "@slobbe/sudoku-engine";

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

  it("generates deterministic puzzles from the same seed", () => {
    const first = generatePuzzle("medium", { seed: "daily:2026-02-18" });
    const second = generatePuzzle("medium", { seed: "daily:2026-02-18" });

    expect(first.puzzle).toEqual(second.puzzle);
    expect(first.solution).toEqual(second.solution);
    expect(first.givens).toBe(second.givens);
  });

  it("generates different puzzles for different seeds", () => {
    const first = generatePuzzle("medium", { seed: "daily:2026-02-18" });
    const second = generatePuzzle("medium", { seed: "daily:2026-02-19" });

    expect(first.puzzle).not.toEqual(second.puzzle);
  });

  it("keeps uniqueness guarantees for seeded puzzles", () => {
    const seeded = generatePuzzle("hard", { seed: "daily:2026-02-18" });
    expect(countSolutions(seeded.puzzle, 2)).toBe(1);
  });

  it("supports explicit rng override", () => {
    const rngA = createSeededRng("rng-seed");
    const rngB = createSeededRng("rng-seed");

    const first = generatePuzzle("easy", { rng: rngA });
    const second = generatePuzzle("easy", { rng: rngB });

    expect(first.puzzle).toEqual(second.puzzle);
    expect(first.solution).toEqual(second.solution);
  });

  it("supports exact expert generation", () => {
    const expert = generatePuzzle("expert", { seed: "daily:2026-02-20" });
    expect(expert.difficulty).toBe("expert");
  });

  it("scores generated candidate difficulty deterministically", () => {
    const candidate = generatePuzzleCandidate("hard", { seed: "daily:2026-02-22:candidate" });
    const analysis = ratePuzzleDifficulty(candidate.puzzle);
    expect(analysis).not.toBeNull();
    expect(analysis!.difficulty).toBe(candidate.difficulty);
    expect(analysis!.score).toBe(candidate.score);
  });

  it("keeps candidate generation independent from requested difficulty", () => {
    const seed = "daily:2026-02-23:candidate";
    const easyHint = generatePuzzleCandidate("easy", { seed });
    const expertHint = generatePuzzleCandidate("expert", { seed });

    expect(easyHint.puzzle).toEqual(expertHint.puzzle);
    expect(easyHint.solution).toEqual(expertHint.solution);
    expect(easyHint.givens).toBe(expertHint.givens);
    expect(easyHint.difficulty).toBe(expertHint.difficulty);
  });

  it("builds local date seeds by default", () => {
    const localDate = new Date(2026, 1, 3, 8, 30, 0);
    expect(dateSeed(localDate)).toBe("2026-02-03");
  });

  it("can build UTC date seeds", () => {
    const utcDate = new Date(Date.UTC(2026, 1, 3, 23, 30, 0));
    expect(dateSeed(utcDate, "utc")).toBe("2026-02-03");
  });
});
