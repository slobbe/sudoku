import { isValidPlacement, type Board, type Difficulty } from "@slobbe/sudoku-engine";

export type ScoreEntryAction = "correct" | "wrong" | "hint";

export const POINTS_BASE_BY_DIFFICULTY: Record<Difficulty, number> = {
  easy: 1,
  medium: 2,
  hard: 3,
  expert: 4,
};

export const POINTS_WRONG_ENTRY_PENALTY = 2;

function normalizeCandidateCount(candidateCount: number): number {
  if (!Number.isInteger(candidateCount)) {
    return 1;
  }

  if (candidateCount < 1) {
    return 1;
  }

  if (candidateCount > 9) {
    return 9;
  }

  return candidateCount;
}

export function complexityBonusForCandidateCount(candidateCount: number): number {
  const normalized = normalizeCandidateCount(candidateCount);
  if (normalized >= 5) {
    return 4;
  }

  return normalized - 1;
}

export function scoreEntryAction(input: {
  action: ScoreEntryAction;
  difficulty: Difficulty;
  candidateCount: number;
}): number {
  if (input.action === "hint") {
    return 0;
  }

  if (input.action === "wrong") {
    return -POINTS_WRONG_ENTRY_PENALTY;
  }

  return POINTS_BASE_BY_DIFFICULTY[input.difficulty] + complexityBonusForCandidateCount(input.candidateCount);
}

export function clampWonPuzzlePoints(points: number): number {
  if (!Number.isFinite(points)) {
    return 0;
  }

  return Math.max(0, Math.trunc(points));
}

export function resolveAwardedPuzzlePoints(input: { won: boolean; currentGamePoints: number }): number {
  if (!input.won) {
    return 0;
  }

  return clampWonPuzzlePoints(input.currentGamePoints);
}

export function shouldAwardWinPointsOnTransition(input: {
  solved: boolean;
  currentWon: boolean;
  winRecorded: boolean;
}): boolean {
  return input.solved && !input.currentWon && !input.winRecorded;
}

export function sanitizeBoardForScoring(board: Board, solution: Board): Board {
  return board.map((row, rowIndex) =>
    row.map((value, colIndex) => {
      if (value === 0) {
        return 0;
      }

      return value === solution[rowIndex][colIndex] ? value : 0;
    }),
  );
}

export function countCandidatesForCell(board: Board, row: number, col: number): number {
  if (board[row]?.[col] !== 0) {
    return 0;
  }

  let count = 0;
  for (let value = 1; value <= 9; value += 1) {
    if (isValidPlacement(board, row, col, value)) {
      count += 1;
    }
  }

  return count;
}

export function candidateCountFromCurrentState(input: {
  board: Board;
  solution: Board;
  row: number;
  col: number;
}): number {
  const sanitized = sanitizeBoardForScoring(input.board, input.solution);
  return countCandidatesForCell(sanitized, input.row, input.col);
}
