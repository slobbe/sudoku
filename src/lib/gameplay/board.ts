import type { Board } from "@slobbe/sudoku-engine";

export function cellKey(row: number, col: number): string {
  return `${row}-${col}`;
}

export function createGivensSet(puzzle: Board): Set<string> {
  const givens = new Set<string>();
  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 9; col += 1) {
      if (puzzle[row][col] !== 0) {
        givens.add(cellKey(row, col));
      }
    }
  }

  return givens;
}

export function countFilledCells(board: Board | null): number {
  if (!board) {
    return 0;
  }

  let total = 0;
  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 9; col += 1) {
      if (board[row][col] !== 0) {
        total += 1;
      }
    }
  }

  return total;
}

export function boardsMatch(left: Board, right: Board): boolean {
  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 9; col += 1) {
      if (left[row][col] !== right[row][col]) {
        return false;
      }
    }
  }

  return true;
}
