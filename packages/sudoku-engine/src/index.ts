export type Difficulty = "easy" | "medium" | "hard";

export type Board = number[][];

export type PuzzleCandidate = {
  puzzle: Board;
  solution: Board;
  difficulty: Difficulty;
  givens: number;
};

export type DateSeedMode = "local" | "utc";

export type PuzzleGenerationOptions = {
  seed?: string | number;
  rng?: () => number;
};

type MaskState = {
  rowMask: number[];
  colMask: number[];
  boxMask: number[];
};

type CellChoice = {
  index: number;
  mask: number;
  count: number;
};

const SIZE = 81;
const ALL = (1 << 9) - 1;

const DIFFICULTY_CLUES: Record<Difficulty, [number, number]> = {
  easy: [38, 42],
  medium: [32, 36],
  hard: [26, 30],
};

function normalizeSeed(seed: string | number): string {
  return typeof seed === "number" ? `n:${seed}` : `s:${seed}`;
}

function hashSeed(seed: string | number): number {
  const normalized = normalizeSeed(seed);
  let hash = 2166136261;

  for (let index = 0; index < normalized.length; index += 1) {
    hash ^= normalized.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  const value = hash >>> 0;
  return value === 0 ? 0x9e3779b9 : value;
}

export function createSeededRng(seed: string | number): () => number {
  let state = hashSeed(seed);

  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let output = state;
    output = Math.imul(output ^ (output >>> 15), output | 1);
    output ^= output + Math.imul(output ^ (output >>> 7), output | 61);
    return ((output ^ (output >>> 14)) >>> 0) / 4294967296;
  };
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

export function dateSeed(date: Date = new Date(), mode: DateSeedMode = "local"): string {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    throw new Error("Invalid date provided for dateSeed.");
  }

  const year = mode === "utc" ? date.getUTCFullYear() : date.getFullYear();
  const month = mode === "utc" ? date.getUTCMonth() + 1 : date.getMonth() + 1;
  const day = mode === "utc" ? date.getUTCDate() : date.getDate();

  return `${year}-${pad2(month)}-${pad2(day)}`;
}

function resolveRng(options?: PuzzleGenerationOptions): () => number {
  if (options?.rng) {
    return options.rng;
  }
  if (options?.seed !== undefined) {
    return createSeededRng(options.seed);
  }
  return Math.random;
}

function cloneBoard(board: Board): Board {
  return board.map((row) => row.slice());
}

function isValidBoardShape(board: unknown): board is Board {
  if (!Array.isArray(board) || board.length !== 9) {
    return false;
  }

  return board.every(
    (row) =>
      Array.isArray(row)
      && row.length === 9
      && row.every((value) => Number.isInteger(value) && value >= 0 && value <= 9),
  );
}

function shuffled(values: number[], rng: () => number = Math.random): number[] {
  const arr = values.slice();
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function boxStart(index: number): number {
  return Math.floor(index / 3) * 3;
}

function rcToIdx(row: number, col: number): number {
  return row * 9 + col;
}

function indexToCell(index: number): { row: number; col: number } {
  return { row: Math.floor(index / 9), col: index % 9 };
}

function boxIndex(row: number, col: number): number {
  return Math.floor(row / 3) * 3 + Math.floor(col / 3);
}

function digitToBit(value: number): number {
  return 1 << (value - 1);
}

function bitCount(mask: number): number {
  let count = 0;
  let value = mask;
  while (value) {
    value &= value - 1;
    count += 1;
  }
  return count;
}

function bitsToDigits(mask: number): number[] {
  const digits: number[] = [];
  for (let value = 1; value <= 9; value += 1) {
    if (mask & digitToBit(value)) {
      digits.push(value);
    }
  }
  return digits;
}

function boardToGrid(board: Board): number[] {
  const grid = new Array<number>(SIZE);
  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 9; col += 1) {
      grid[rcToIdx(row, col)] = board[row][col];
    }
  }
  return grid;
}

function gridToBoard(grid: number[]): Board {
  const board = Array.from({ length: 9 }, () => Array<number>(9).fill(0));
  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 9; col += 1) {
      board[row][col] = grid[rcToIdx(row, col)];
    }
  }
  return board;
}

function initStateFromGrid(grid: number[]): MaskState | null {
  const rowMask = new Array<number>(9).fill(0);
  const colMask = new Array<number>(9).fill(0);
  const boxMask = new Array<number>(9).fill(0);

  for (let i = 0; i < SIZE; i += 1) {
    const value = grid[i];
    if (value === 0) {
      continue;
    }
    if (!Number.isInteger(value) || value < 1 || value > 9) {
      return null;
    }

    const row = Math.floor(i / 9);
    const col = i % 9;
    const box = boxIndex(row, col);
    const bit = digitToBit(value);

    if ((rowMask[row] & bit) || (colMask[col] & bit) || (boxMask[box] & bit)) {
      return null;
    }

    rowMask[row] |= bit;
    colMask[col] |= bit;
    boxMask[box] |= bit;
  }

  return { rowMask, colMask, boxMask };
}

function candidatesMask(state: MaskState, row: number, col: number): number {
  const box = boxIndex(row, col);
  const used = state.rowMask[row] | state.colMask[col] | state.boxMask[box];
  return ALL & ~used;
}

function place(state: MaskState, grid: number[], row: number, col: number, value: number): void {
  const index = rcToIdx(row, col);
  const bit = digitToBit(value);
  const box = boxIndex(row, col);

  grid[index] = value;
  state.rowMask[row] |= bit;
  state.colMask[col] |= bit;
  state.boxMask[box] |= bit;
}

function unplace(state: MaskState, grid: number[], row: number, col: number, value: number): void {
  const index = rcToIdx(row, col);
  const bit = digitToBit(value);
  const box = boxIndex(row, col);

  grid[index] = 0;
  state.rowMask[row] &= ~bit;
  state.colMask[col] &= ~bit;
  state.boxMask[box] &= ~bit;
}

function findBestCell(grid: number[], state: MaskState): CellChoice | null {
  let bestIndex = -1;
  let bestMask = 0;
  let bestCount = 10;

  for (let i = 0; i < SIZE; i += 1) {
    if (grid[i] !== 0) {
      continue;
    }

    const row = Math.floor(i / 9);
    const col = i % 9;
    const mask = candidatesMask(state, row, col);
    const count = bitCount(mask);

    if (count === 0) {
      return { index: i, mask: 0, count: 0 };
    }

    if (count < bestCount) {
      bestCount = count;
      bestIndex = i;
      bestMask = mask;
      if (count === 1) {
        break;
      }
    }
  }

  if (bestIndex === -1) {
    return null;
  }

  return { index: bestIndex, mask: bestMask, count: bestCount };
}

function countSolutionsFromGrid(grid: number[], limit = 2): number {
  const maxSolutions = Math.max(1, Math.floor(limit));
  const state = initStateFromGrid(grid);
  if (!state) {
    return 0;
  }
  const maskState = state;

  let solutions = 0;

  function dfs(): void {
    if (solutions >= maxSolutions) {
      return;
    }

    const choice = findBestCell(grid, maskState);
    if (choice === null) {
      solutions += 1;
      return;
    }
    if (choice.count === 0) {
      return;
    }

    const row = Math.floor(choice.index / 9);
    const col = choice.index % 9;
    const values = bitsToDigits(choice.mask);

    for (const value of values) {
      place(maskState, grid, row, col, value);
      dfs();
      unplace(maskState, grid, row, col, value);
      if (solutions >= maxSolutions) {
        return;
      }
    }
  }

  dfs();
  return solutions;
}

function solveGrid(inputGrid: number[]): number[] | null {
  const grid = inputGrid.slice();
  const state = initStateFromGrid(grid);
  if (!state) {
    return null;
  }
  const maskState = state;

  function dfs(): boolean {
    const choice = findBestCell(grid, maskState);
    if (choice === null) {
      return true;
    }
    if (choice.count === 0) {
      return false;
    }

    const row = Math.floor(choice.index / 9);
    const col = choice.index % 9;
    const values = bitsToDigits(choice.mask);

    for (const value of values) {
      place(maskState, grid, row, col, value);
      if (dfs()) {
        return true;
      }
      unplace(maskState, grid, row, col, value);
    }

    return false;
  }

  return dfs() ? grid : null;
}

function generateSolvedGrid(rng: () => number = Math.random): number[] {
  const grid = new Array<number>(SIZE).fill(0);
  const state = initStateFromGrid(grid);
  if (!state) {
    throw new Error("Could not initialize solver state.");
  }
  const maskState = state;

  function dfs(): boolean {
    const choice = findBestCell(grid, maskState);
    if (choice === null) {
      return true;
    }
    if (choice.count === 0) {
      return false;
    }

    const row = Math.floor(choice.index / 9);
    const col = choice.index % 9;
    const values = shuffled(bitsToDigits(choice.mask), rng);

    for (const value of values) {
      place(maskState, grid, row, col, value);
      if (dfs()) {
        return true;
      }
      unplace(maskState, grid, row, col, value);
    }

    return false;
  }

  if (!dfs()) {
    throw new Error("Failed to generate solved board.");
  }

  return grid;
}

export function isValidPlacement(board: Board, row: number, col: number, value: number): boolean {
  if (value === 0) {
    return true;
  }

  for (let i = 0; i < 9; i += 1) {
    if (i !== col && board[row][i] === value) {
      return false;
    }
    if (i !== row && board[i][col] === value) {
      return false;
    }
  }

  const rowStart = boxStart(row);
  const colStart = boxStart(col);
  for (let r = rowStart; r < rowStart + 3; r += 1) {
    for (let c = colStart; c < colStart + 3; c += 1) {
      if ((r !== row || c !== col) && board[r][c] === value) {
        return false;
      }
    }
  }

  return true;
}

export function countSolutions(inputBoard: unknown, limit = 2): number {
  if (!isValidBoardShape(inputBoard)) {
    return 0;
  }
  return countSolutionsFromGrid(boardToGrid(inputBoard), limit);
}

export function solveBoard(inputBoard: unknown): Board | null {
  if (!isValidBoardShape(inputBoard)) {
    return null;
  }

  const solved = solveGrid(boardToGrid(inputBoard));
  if (!solved) {
    return null;
  }
  return gridToBoard(solved);
}

export function generateSolvedBoard(rng: () => number = Math.random): Board {
  return gridToBoard(generateSolvedGrid(rng));
}

function puzzleMatchesSolution(puzzle: Board, solution: Board): boolean {
  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 9; col += 1) {
      const value = puzzle[row][col];
      if (value !== 0 && value !== solution[row][col]) {
        return false;
      }
    }
  }
  return true;
}

function isPuzzleSolutionPairValid(puzzle: Board, solution: Board): boolean {
  if (!boardComplete(solution)) {
    return false;
  }
  if (!puzzleMatchesSolution(puzzle, solution)) {
    return false;
  }
  return countSolutions(puzzle, 2) === 1;
}

function randomInt(min: number, max: number, rng: () => number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function targetCluesForDifficulty(difficulty: Difficulty, rng: () => number): number {
  const range = DIFFICULTY_CLUES[difficulty] ?? DIFFICULTY_CLUES.medium;
  return randomInt(range[0], range[1], rng);
}

function carveUniquePuzzle(solvedBoard: Board, cluesTarget: number, rng: () => number): { puzzle: Board; givens: number } {
  const puzzle = cloneBoard(solvedBoard);
  const cells = shuffled(Array.from({ length: SIZE }, (_, i) => i), rng);
  let givens = SIZE;

  for (const cellIndex of cells) {
    if (givens <= cluesTarget) {
      break;
    }

    const { row, col } = indexToCell(cellIndex);
    const backup = puzzle[row][col];
    if (backup === 0) {
      continue;
    }

    puzzle[row][col] = 0;
    if (countSolutions(puzzle, 2) !== 1) {
      puzzle[row][col] = backup;
      continue;
    }

    givens -= 1;
  }

  return { puzzle, givens };
}

export function generatePuzzle(difficulty: Difficulty = "medium", options: PuzzleGenerationOptions = {}): PuzzleCandidate {
  const rng = resolveRng(options);
  const cluesTarget = targetCluesForDifficulty(difficulty, rng);
  let bestCandidate: PuzzleCandidate | null = null;

  for (let attempts = 0; attempts < 20; attempts += 1) {
    const solvedSeed = generateSolvedBoard(rng);
    const { puzzle, givens } = carveUniquePuzzle(solvedSeed, cluesTarget, rng);
    if (countSolutions(puzzle, 2) !== 1) {
      continue;
    }

    const solved = solveBoard(puzzle);
    if (!solved) {
      continue;
    }

    if (!isPuzzleSolutionPairValid(puzzle, solved)) {
      continue;
    }

    const candidate: PuzzleCandidate = {
      puzzle,
      solution: solved,
      difficulty,
      givens,
    };

    if (!bestCandidate || candidate.givens < bestCandidate.givens) {
      bestCandidate = candidate;
    }

    if (givens <= cluesTarget + 1) {
      return candidate;
    }
  }

  if (bestCandidate) {
    return bestCandidate;
  }

  const emergencySolution = generateSolvedBoard(rng);
  const emergency = carveUniquePuzzle(emergencySolution, 70, rng);
  const solved = solveBoard(emergency.puzzle);

  if (solved && isPuzzleSolutionPairValid(emergency.puzzle, solved)) {
    return {
      puzzle: emergency.puzzle,
      solution: solved,
      difficulty,
      givens: emergency.givens,
    };
  }

  const safeSolution = cloneBoard(emergencySolution);

  return {
    puzzle: cloneBoard(safeSolution),
    solution: safeSolution,
    difficulty,
    givens: SIZE,
  };
}

export function boardComplete(board: unknown): boolean {
  if (!isValidBoardShape(board)) {
    return false;
  }

  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 9; col += 1) {
      if (board[row][col] === 0 || !isValidPlacement(board, row, col, board[row][col])) {
        return false;
      }
    }
  }
  return true;
}

export function clone(board: Board): Board {
  return cloneBoard(board);
}
