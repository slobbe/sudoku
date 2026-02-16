export const SUDOKU_DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

export type SudokuDigit = (typeof SUDOKU_DIGITS)[number];

export function cellKey(row: number, col: number): string {
  return `${row}-${col}`;
}

function isSudokuDigit(value: number): value is SudokuDigit {
  return Number.isInteger(value) && value >= 1 && value <= 9;
}

function noteBit(value: SudokuDigit): number {
  return 1 << (value - 1);
}

export function createBooleanBoard(initial = false): boolean[][] {
  return Array.from({ length: 9 }, () => Array<boolean>(9).fill(initial));
}

export function hasNoteDigit(mask: number, digit: number): boolean {
  if (!isSudokuDigit(digit)) {
    return false;
  }
  return (mask & noteBit(digit)) !== 0;
}

export function digitsToNoteMask(digits: readonly number[]): number {
  let mask = 0;
  for (const digit of digits) {
    if (isSudokuDigit(digit)) {
      mask |= noteBit(digit);
    }
  }
  return mask;
}

export function noteMaskToDigits(mask: number): SudokuDigit[] {
  if (!Number.isInteger(mask) || mask <= 0) {
    return [];
  }

  const digits: SudokuDigit[] = [];
  for (const digit of SUDOKU_DIGITS) {
    if (hasNoteDigit(mask, digit)) {
      digits.push(digit);
    }
  }
  return digits;
}

export function toggleNoteDigit(mask: number, digit: number): number {
  if (!isSudokuDigit(digit)) {
    return mask;
  }

  const bit = noteBit(digit);
  return (mask & bit) === 0 ? mask | bit : mask & ~bit;
}

export function noteMaskBoardToDigitsBoard(noteMasks: number[][]): number[][][] {
  return Array.from({ length: 9 }, (_, row) =>
    Array.from({ length: 9 }, (_, col) => noteMaskToDigits(noteMasks[row]?.[col] ?? 0)),
  );
}

export function givensSetToBooleanBoard(givens: ReadonlySet<string>): boolean[][] {
  const board = createBooleanBoard(false);

  for (const key of givens) {
    const match = /^(\d)-(\d)$/.exec(key);
    if (!match) {
      continue;
    }

    const row = Number(match[1]);
    const col = Number(match[2]);
    if (Number.isInteger(row) && Number.isInteger(col) && row >= 0 && row < 9 && col >= 0 && col < 9) {
      board[row][col] = true;
    }
  }

  return board;
}
