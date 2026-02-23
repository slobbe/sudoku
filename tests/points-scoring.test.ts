import { describe, expect, it } from "bun:test";
import {
  POINTS_BASE_BY_DIFFICULTY,
  POINTS_WRONG_ENTRY_PENALTY,
  candidateCountFromCurrentState,
  clampWonPuzzlePoints,
  complexityBonusForCandidateCount,
  resolveAwardedPuzzlePoints,
  sanitizeBoardForScoring,
  scoreEntryAction,
  shouldAwardWinPointsOnTransition,
} from "../src/lib/scoring/points";
import type { Board } from "@slobbe/sudoku-engine";

const SOLUTION: Board = [
  [5, 3, 4, 6, 7, 8, 9, 1, 2],
  [6, 7, 2, 1, 9, 5, 3, 4, 8],
  [1, 9, 8, 3, 4, 2, 5, 6, 7],
  [8, 5, 9, 7, 6, 1, 4, 2, 3],
  [4, 2, 6, 8, 5, 3, 7, 9, 1],
  [7, 1, 3, 9, 2, 4, 8, 5, 6],
  [9, 6, 1, 5, 3, 7, 2, 8, 4],
  [2, 8, 7, 4, 1, 9, 6, 3, 5],
  [3, 4, 5, 2, 8, 6, 1, 7, 9],
];

const PUZZLE_STATE: Board = [
  [5, 3, 0, 0, 7, 0, 0, 0, 0],
  [6, 0, 0, 1, 9, 5, 0, 0, 0],
  [0, 9, 8, 0, 0, 0, 0, 6, 0],
  [8, 0, 0, 0, 6, 0, 0, 0, 3],
  [4, 0, 0, 8, 0, 3, 0, 0, 1],
  [7, 0, 0, 0, 2, 0, 0, 0, 6],
  [0, 6, 0, 0, 0, 0, 2, 8, 0],
  [0, 0, 0, 4, 1, 9, 0, 0, 5],
  [0, 0, 0, 0, 8, 0, 0, 7, 9],
];

describe("points scoring formula", () => {
  it("uses deterministic base points by difficulty", () => {
    expect(POINTS_BASE_BY_DIFFICULTY.easy).toBe(1);
    expect(POINTS_BASE_BY_DIFFICULTY.medium).toBe(2);
    expect(POINTS_BASE_BY_DIFFICULTY.hard).toBe(3);
    expect(POINTS_BASE_BY_DIFFICULTY.expert).toBe(4);
  });

  it("maps candidate count to complexity bonus boundaries", () => {
    expect(complexityBonusForCandidateCount(1)).toBe(0);
    expect(complexityBonusForCandidateCount(2)).toBe(1);
    expect(complexityBonusForCandidateCount(3)).toBe(2);
    expect(complexityBonusForCandidateCount(4)).toBe(3);
    expect(complexityBonusForCandidateCount(5)).toBe(4);
    expect(complexityBonusForCandidateCount(9)).toBe(4);
  });

  it("scores correct manual entries from difficulty base plus complexity bonus", () => {
    expect(scoreEntryAction({
      action: "correct",
      difficulty: "easy",
      candidateCount: 3,
    })).toBe(3);

    expect(scoreEntryAction({
      action: "correct",
      difficulty: "expert",
      candidateCount: 5,
    })).toBe(8);
  });

  it("scores wrong entries with fixed negative penalty", () => {
    expect(scoreEntryAction({
      action: "wrong",
      difficulty: "medium",
      candidateCount: 1,
    })).toBe(-POINTS_WRONG_ENTRY_PENALTY);
  });

  it("scores hints as zero", () => {
    expect(scoreEntryAction({
      action: "hint",
      difficulty: "hard",
      candidateCount: 4,
    })).toBe(0);
  });

  it("clamps won puzzle points to non-negative integers", () => {
    expect(clampWonPuzzlePoints(12)).toBe(12);
    expect(clampWonPuzzlePoints(-4)).toBe(0);
    expect(clampWonPuzzlePoints(7.9)).toBe(7);
    expect(clampWonPuzzlePoints(Number.NaN)).toBe(0);
  });

  it("awards zero points when puzzle is not won", () => {
    expect(resolveAwardedPuzzlePoints({ won: false, currentGamePoints: 999 })).toBe(0);
  });
});

describe("points candidate counting", () => {
  it("sanitizes wrong entries out of board state", () => {
    const boardWithWrong = PUZZLE_STATE.map((row) => row.slice()) as Board;
    boardWithWrong[0][3] = 1;
    const sanitized = sanitizeBoardForScoring(boardWithWrong, SOLUTION);

    expect(sanitized[0][3]).toBe(0);
    expect(sanitized[0][0]).toBe(5);
  });

  it("counts candidates from sanitized board state deterministically", () => {
    const boardWithWrong = PUZZLE_STATE.map((row) => row.slice()) as Board;
    boardWithWrong[0][3] = 1;

    const candidateCount = candidateCountFromCurrentState({
      board: boardWithWrong,
      solution: SOLUTION,
      row: 0,
      col: 2,
    });

    expect(candidateCount).toBe(3);
  });
});

describe("points win-award regressions", () => {
  it("awards points once on first solved transition", () => {
    expect(shouldAwardWinPointsOnTransition({
      solved: true,
      currentWon: false,
      winRecorded: false,
    })).toBe(true);
  });

  it("does not award again after reload when win is already recorded", () => {
    expect(shouldAwardWinPointsOnTransition({
      solved: true,
      currentWon: true,
      winRecorded: true,
    })).toBe(false);
  });

  it("does not award again when redo revisits solved board", () => {
    expect(shouldAwardWinPointsOnTransition({
      solved: true,
      currentWon: false,
      winRecorded: true,
    })).toBe(false);
  });

  it("does not award while puzzle is unsolved", () => {
    expect(shouldAwardWinPointsOnTransition({
      solved: false,
      currentWon: false,
      winRecorded: false,
    })).toBe(false);
  });
});
