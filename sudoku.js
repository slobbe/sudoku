const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

const DIFFICULTY_CLUES = {
  easy: [38, 42],
  medium: [32, 36],
  hard: [26, 30],
};

function cloneBoard(board) {
  return board.map((row) => row.slice());
}

function shuffled(values) {
  const arr = values.slice();
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function createEmptyBoard() {
  return Array.from({ length: 9 }, () => Array(9).fill(0));
}

function boxStart(index) {
  return Math.floor(index / 3) * 3;
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

function findMostConstrainedCell(board) {
  let best = null;
  let bestOptions = null;

  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 9; col += 1) {
      if (board[row][col] !== 0) {
        continue;
      }

      const options = [];
      for (const value of DIGITS) {
        if (isValidPlacement(board, row, col, value)) {
          options.push(value);
        }
      }

      if (options.length === 0) {
        return { row, col, options: [] };
      }

      if (bestOptions === null || options.length < bestOptions.length) {
        best = { row, col };
        bestOptions = options;
        if (options.length === 1) {
          return { ...best, options: bestOptions };
        }
      }
    }
  }

  if (!best) {
    return null;
  }

  return { ...best, options: bestOptions };
}

function fillBoard(board) {
  const next = findMostConstrainedCell(board);
  if (!next) {
    return true;
  }
  const { row, col, options } = next;
  for (const value of shuffled(options)) {
    board[row][col] = value;
    if (fillBoard(board)) {
      return true;
    }
  }
  board[row][col] = 0;
  return false;
}

export function countSolutions(inputBoard, limit = 2) {
  const board = cloneBoard(inputBoard);
  let count = 0;

  function search() {
    if (count >= limit) {
      return;
    }

    const next = findMostConstrainedCell(board);
    if (!next) {
      count += 1;
      return;
    }

    const { row, col, options } = next;
    for (const value of options) {
      board[row][col] = value;
      search();
      if (count >= limit) {
        return;
      }
      board[row][col] = 0;
    }
    board[row][col] = 0;
  }

  search();
  return count;
}

export function solveBoard(inputBoard) {
  const board = cloneBoard(inputBoard);

  function solve() {
    const next = findMostConstrainedCell(board);
    if (!next) {
      return true;
    }

    const { row, col, options } = next;
    for (const value of options) {
      board[row][col] = value;
      if (solve()) {
        return true;
      }
    }

    board[row][col] = 0;
    return false;
  }

  return solve() ? board : null;
}

export function generateSolvedBoard() {
  const board = createEmptyBoard();
  fillBoard(board);
  return board;
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function targetCluesForDifficulty(difficulty) {
  const range = DIFFICULTY_CLUES[difficulty] || DIFFICULTY_CLUES.medium;
  return randomInt(range[0], range[1]);
}

function indexToCell(index) {
  return { row: Math.floor(index / 9), col: index % 9 };
}

function carveUniquePuzzle(solvedBoard, cluesTarget) {
  const puzzle = cloneBoard(solvedBoard);
  const cells = shuffled(Array.from({ length: 81 }, (_, i) => i));
  let givens = 81;

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
    const solutions = countSolutions(puzzle, 2);
    if (solutions !== 1) {
      puzzle[row][col] = backup;
      continue;
    }

    givens -= 1;
  }

  return { puzzle, givens };
}

export function generatePuzzle(difficulty = "medium") {
  const cluesTarget = targetCluesForDifficulty(difficulty);

  for (let attempts = 0; attempts < 8; attempts += 1) {
    const solution = generateSolvedBoard();
    const { puzzle, givens } = carveUniquePuzzle(solution, cluesTarget);

    if (givens <= cluesTarget + 1) {
      return {
        puzzle,
        solution,
        difficulty,
        givens,
      };
    }
  }

  const fallbackSolution = generateSolvedBoard();
  const fallback = carveUniquePuzzle(fallbackSolution, cluesTarget + 2);
  return {
    puzzle: fallback.puzzle,
    solution: fallbackSolution,
    difficulty,
    givens: fallback.givens,
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
