const SIZE = 81;
const ALL = (1 << 9) - 1;

const DIFFICULTY_CLUES = {
  easy: [38, 42],
  medium: [32, 36],
  hard: [26, 30],
};

function cloneBoard(board) {
  return board.map((row) => row.slice());
}

function isValidBoardShape(board) {
  return Array.isArray(board)
    && board.length === 9
    && board.every(
      (row) => Array.isArray(row) && row.length === 9
        && row.every((value) => Number.isInteger(value) && value >= 0 && value <= 9),
    );
}

function shuffled(values, rng = Math.random) {
  const arr = values.slice();
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function boxStart(index) {
  return Math.floor(index / 3) * 3;
}

function rcToIdx(row, col) {
  return row * 9 + col;
}

function indexToCell(index) {
  return { row: Math.floor(index / 9), col: index % 9 };
}

function boxIndex(row, col) {
  return Math.floor(row / 3) * 3 + Math.floor(col / 3);
}

function digitToBit(value) {
  return 1 << (value - 1);
}

function bitCount(mask) {
  let count = 0;
  let value = mask;
  while (value) {
    value &= value - 1;
    count += 1;
  }
  return count;
}

function bitsToDigits(mask) {
  const digits = [];
  for (let value = 1; value <= 9; value += 1) {
    if (mask & digitToBit(value)) {
      digits.push(value);
    }
  }
  return digits;
}

function boardToGrid(board) {
  const grid = new Array(SIZE);
  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 9; col += 1) {
      grid[rcToIdx(row, col)] = board[row][col];
    }
  }
  return grid;
}

function gridToBoard(grid) {
  const board = Array.from({ length: 9 }, () => Array(9).fill(0));
  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 9; col += 1) {
      board[row][col] = grid[rcToIdx(row, col)];
    }
  }
  return board;
}

function initStateFromGrid(grid) {
  const rowMask = new Array(9).fill(0);
  const colMask = new Array(9).fill(0);
  const boxMask = new Array(9).fill(0);

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

function candidatesMask(state, row, col) {
  const box = boxIndex(row, col);
  const used = state.rowMask[row] | state.colMask[col] | state.boxMask[box];
  return ALL & ~used;
}

function place(state, grid, row, col, value) {
  const index = rcToIdx(row, col);
  const bit = digitToBit(value);
  const box = boxIndex(row, col);

  grid[index] = value;
  state.rowMask[row] |= bit;
  state.colMask[col] |= bit;
  state.boxMask[box] |= bit;
}

function unplace(state, grid, row, col, value) {
  const index = rcToIdx(row, col);
  const bit = digitToBit(value);
  const box = boxIndex(row, col);

  grid[index] = 0;
  state.rowMask[row] &= ~bit;
  state.colMask[col] &= ~bit;
  state.boxMask[box] &= ~bit;
}

function findBestCell(grid, state) {
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

function countSolutionsFromGrid(grid, limit = 2) {
  const maxSolutions = Math.max(1, Math.floor(limit));
  const state = initStateFromGrid(grid);
  if (!state) {
    return 0;
  }

  let solutions = 0;

  function dfs() {
    if (solutions >= maxSolutions) {
      return;
    }

    const choice = findBestCell(grid, state);
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
      place(state, grid, row, col, value);
      dfs();
      unplace(state, grid, row, col, value);
      if (solutions >= maxSolutions) {
        return;
      }
    }
  }

  dfs();
  return solutions;
}

function solveGrid(inputGrid) {
  const grid = inputGrid.slice();
  const state = initStateFromGrid(grid);
  if (!state) {
    return null;
  }

  function dfs() {
    const choice = findBestCell(grid, state);
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
      place(state, grid, row, col, value);
      if (dfs()) {
        return true;
      }
      unplace(state, grid, row, col, value);
    }

    return false;
  }

  return dfs() ? grid : null;
}

function generateSolvedGrid(rng = Math.random) {
  const grid = new Array(SIZE).fill(0);
  const state = initStateFromGrid(grid);

  function dfs() {
    const choice = findBestCell(grid, state);
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
      place(state, grid, row, col, value);
      if (dfs()) {
        return true;
      }
      unplace(state, grid, row, col, value);
    }

    return false;
  }

  if (!dfs()) {
    throw new Error("Failed to generate solved board.");
  }

  return grid;
}

export function isValidPlacement(board, row, col, value) {
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

export function countSolutions(inputBoard, limit = 2) {
  if (!isValidBoardShape(inputBoard)) {
    return 0;
  }
  return countSolutionsFromGrid(boardToGrid(inputBoard), limit);
}

export function solveBoard(inputBoard) {
  if (!isValidBoardShape(inputBoard)) {
    return null;
  }

  const solved = solveGrid(boardToGrid(inputBoard));
  if (!solved) {
    return null;
  }
  return gridToBoard(solved);
}

export function generateSolvedBoard() {
  return gridToBoard(generateSolvedGrid());
}

function puzzleMatchesSolution(puzzle, solution) {
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

function isPuzzleSolutionPairValid(puzzle, solution) {
  if (!isValidBoardShape(puzzle) || !isValidBoardShape(solution)) {
    return false;
  }
  if (!boardComplete(solution)) {
    return false;
  }
  if (!puzzleMatchesSolution(puzzle, solution)) {
    return false;
  }
  return countSolutions(puzzle, 2) === 1;
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function targetCluesForDifficulty(difficulty) {
  const range = DIFFICULTY_CLUES[difficulty] || DIFFICULTY_CLUES.medium;
  return randomInt(range[0], range[1]);
}

function carveUniquePuzzle(solvedBoard, cluesTarget) {
  const puzzle = cloneBoard(solvedBoard);
  const cells = shuffled(Array.from({ length: SIZE }, (_, i) => i));
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

export function generatePuzzle(difficulty = "medium") {
  const cluesTarget = targetCluesForDifficulty(difficulty);
  let bestCandidate = null;

  for (let attempts = 0; attempts < 20; attempts += 1) {
    const solvedSeed = generateSolvedBoard();
    const { puzzle, givens } = carveUniquePuzzle(solvedSeed, cluesTarget);
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

    const candidate = {
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

  const emergencySolution = generateSolvedBoard();
  const emergency = carveUniquePuzzle(emergencySolution, 70);
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

export function boardComplete(board) {
  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 9; col += 1) {
      if (board[row][col] === 0 || !isValidPlacement(board, row, col, board[row][col])) {
        return false;
      }
    }
  }
  return true;
}

export function clone(board) {
  return cloneBoard(board);
}
