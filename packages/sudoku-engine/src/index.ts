export type Difficulty = "easy" | "medium" | "hard" | "expert";

export type Technique =
  | "naked-single"
  | "hidden-single"
  | "locked-candidates"
  | "naked-pair"
  | "hidden-pair"
  | "x-wing"
  | "swordfish";

export type TechniqueCounts = Record<Technique, number>;

export type PuzzleDifficultyAnalysis = {
  difficulty: Difficulty;
  score: number;
  hardestTechnique: Technique;
  techniqueCounts: TechniqueCounts;
  solvedByTechniques: boolean;
};

export type Board = number[][];

export type PuzzleCandidate = {
  puzzle: Board;
  solution: Board;
  difficulty: Difficulty;
  givens: number;
  score: number;
  hardestTechnique: Technique;
  techniqueCounts: TechniqueCounts;
  solvedByTechniques: boolean;
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

const CANDIDATE_CLUES_RANGE: [number, number] = [22, 45];

const TECHNIQUE_ORDER: Technique[] = [
  "naked-single",
  "hidden-single",
  "locked-candidates",
  "naked-pair",
  "hidden-pair",
  "x-wing",
  "swordfish",
];

const TECHNIQUE_WEIGHTS: Record<Technique, number> = {
  "naked-single": 1,
  "hidden-single": 2,
  "locked-candidates": 6,
  "naked-pair": 10,
  "hidden-pair": 12,
  "x-wing": 22,
  "swordfish": 30,
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

const ROW_BY_INDEX = Array.from({ length: SIZE }, (_, index) => Math.floor(index / 9));
const COL_BY_INDEX = Array.from({ length: SIZE }, (_, index) => index % 9);
const BOX_BY_INDEX = Array.from({ length: SIZE }, (_, index) => boxIndex(ROW_BY_INDEX[index], COL_BY_INDEX[index]));

const ROW_UNITS = Array.from(
  { length: 9 },
  (_, row) => Array.from({ length: 9 }, (_, col) => rcToIdx(row, col)),
);
const COL_UNITS = Array.from(
  { length: 9 },
  (_, col) => Array.from({ length: 9 }, (_, row) => rcToIdx(row, col)),
);
const BOX_UNITS = Array.from({ length: 9 }, (_, box) => {
  const rowStart = Math.floor(box / 3) * 3;
  const colStart = (box % 3) * 3;
  const cells: number[] = [];
  for (let row = rowStart; row < rowStart + 3; row += 1) {
    for (let col = colStart; col < colStart + 3; col += 1) {
      cells.push(rcToIdx(row, col));
    }
  }
  return cells;
});

const ALL_UNITS = [...ROW_UNITS, ...COL_UNITS, ...BOX_UNITS];

const PEERS = Array.from({ length: SIZE }, (_, index) => {
  const row = ROW_BY_INDEX[index];
  const col = COL_BY_INDEX[index];
  const box = BOX_BY_INDEX[index];
  const peerSet = new Set<number>();

  for (const candidate of ROW_UNITS[row]) {
    if (candidate !== index) {
      peerSet.add(candidate);
    }
  }
  for (const candidate of COL_UNITS[col]) {
    if (candidate !== index) {
      peerSet.add(candidate);
    }
  }
  for (const candidate of BOX_UNITS[box]) {
    if (candidate !== index) {
      peerSet.add(candidate);
    }
  }

  return Array.from(peerSet);
});

type PlacementAction = {
  technique: Technique;
  index: number;
  value: number;
};

type CandidateRemoval = {
  index: number;
  removeMask: number;
};

type RemovalAction = {
  technique: Technique;
  removals: CandidateRemoval[];
};

function singleDigitFromMask(mask: number): number {
  const lowestBit = mask & -mask;
  return Math.log2(lowestBit) + 1;
}

function createEmptyTechniqueCounts(): TechniqueCounts {
  return {
    "naked-single": 0,
    "hidden-single": 0,
    "locked-candidates": 0,
    "naked-pair": 0,
    "hidden-pair": 0,
    "x-wing": 0,
    "swordfish": 0,
  };
}

function initializeCandidateMasks(grid: number[], state: MaskState): number[] | null {
  const candidates = new Array<number>(SIZE).fill(0);

  for (let index = 0; index < SIZE; index += 1) {
    if (grid[index] !== 0) {
      continue;
    }

    const row = ROW_BY_INDEX[index];
    const col = COL_BY_INDEX[index];
    const mask = candidatesMask(state, row, col);
    if (mask === 0) {
      return null;
    }
    candidates[index] = mask;
  }

  return candidates;
}

function placeWithCandidates(
  state: MaskState,
  grid: number[],
  candidates: number[],
  index: number,
  value: number,
): boolean {
  const row = ROW_BY_INDEX[index];
  const col = COL_BY_INDEX[index];
  const box = BOX_BY_INDEX[index];
  const bit = digitToBit(value);

  if (grid[index] !== 0) {
    return grid[index] === value;
  }

  if ((candidates[index] & bit) === 0) {
    return false;
  }

  if ((state.rowMask[row] & bit) || (state.colMask[col] & bit) || (state.boxMask[box] & bit)) {
    return false;
  }

  place(state, grid, row, col, value);
  candidates[index] = 0;

  for (const peer of PEERS[index]) {
    if (grid[peer] !== 0) {
      continue;
    }

    const nextMask = candidates[peer] & ~bit;
    if (nextMask === candidates[peer]) {
      continue;
    }

    if (nextMask === 0) {
      return false;
    }

    candidates[peer] = nextMask;
  }

  return true;
}

function applyCandidateRemovals(grid: number[], candidates: number[], removals: CandidateRemoval[]): number {
  const merged = new Map<number, number>();

  for (const removal of removals) {
    if (grid[removal.index] !== 0) {
      continue;
    }

    const existing = merged.get(removal.index) ?? 0;
    merged.set(removal.index, existing | removal.removeMask);
  }

  let changedCells = 0;

  for (const [index, removeMask] of merged) {
    const before = candidates[index];
    const removal = before & removeMask;
    if (removal === 0) {
      continue;
    }

    const after = before & ~removal;
    if (after === 0) {
      return -1;
    }

    if (after !== before) {
      candidates[index] = after;
      changedCells += 1;
    }
  }

  return changedCells;
}

function findNakedSingle(grid: number[], candidates: number[]): PlacementAction | null {
  for (let index = 0; index < SIZE; index += 1) {
    if (grid[index] !== 0) {
      continue;
    }

    const mask = candidates[index];
    if (bitCount(mask) !== 1) {
      continue;
    }

    return {
      technique: "naked-single",
      index,
      value: singleDigitFromMask(mask),
    };
  }

  return null;
}

function findHiddenSingle(grid: number[], candidates: number[]): PlacementAction | null {
  for (const unit of ALL_UNITS) {
    for (let digit = 1; digit <= 9; digit += 1) {
      const bit = digitToBit(digit);
      let foundIndex = -1;
      let count = 0;

      for (const index of unit) {
        if (grid[index] !== 0 || (candidates[index] & bit) === 0) {
          continue;
        }

        foundIndex = index;
        count += 1;
        if (count > 1) {
          break;
        }
      }

      if (count === 1 && foundIndex !== -1) {
        return {
          technique: "hidden-single",
          index: foundIndex,
          value: digit,
        };
      }
    }
  }

  return null;
}

function findLockedCandidates(grid: number[], candidates: number[]): RemovalAction | null {
  for (let box = 0; box < 9; box += 1) {
    const boxCells = BOX_UNITS[box];
    for (let digit = 1; digit <= 9; digit += 1) {
      const bit = digitToBit(digit);
      const cells = boxCells.filter((index) => grid[index] === 0 && (candidates[index] & bit) !== 0);
      if (cells.length < 2) {
        continue;
      }

      const row = ROW_BY_INDEX[cells[0]];
      if (cells.every((index) => ROW_BY_INDEX[index] === row)) {
        const removals = ROW_UNITS[row]
          .filter((index) => BOX_BY_INDEX[index] !== box && grid[index] === 0 && (candidates[index] & bit) !== 0)
          .map((index) => ({ index, removeMask: bit }));
        if (removals.length > 0) {
          return { technique: "locked-candidates", removals };
        }
      }

      const col = COL_BY_INDEX[cells[0]];
      if (cells.every((index) => COL_BY_INDEX[index] === col)) {
        const removals = COL_UNITS[col]
          .filter((index) => BOX_BY_INDEX[index] !== box && grid[index] === 0 && (candidates[index] & bit) !== 0)
          .map((index) => ({ index, removeMask: bit }));
        if (removals.length > 0) {
          return { technique: "locked-candidates", removals };
        }
      }
    }
  }

  for (let row = 0; row < 9; row += 1) {
    const unit = ROW_UNITS[row];
    for (let digit = 1; digit <= 9; digit += 1) {
      const bit = digitToBit(digit);
      const cells = unit.filter((index) => grid[index] === 0 && (candidates[index] & bit) !== 0);
      if (cells.length < 2) {
        continue;
      }

      const box = BOX_BY_INDEX[cells[0]];
      if (!cells.every((index) => BOX_BY_INDEX[index] === box)) {
        continue;
      }

      const removals = BOX_UNITS[box]
        .filter((index) => ROW_BY_INDEX[index] !== row && grid[index] === 0 && (candidates[index] & bit) !== 0)
        .map((index) => ({ index, removeMask: bit }));
      if (removals.length > 0) {
        return { technique: "locked-candidates", removals };
      }
    }
  }

  for (let col = 0; col < 9; col += 1) {
    const unit = COL_UNITS[col];
    for (let digit = 1; digit <= 9; digit += 1) {
      const bit = digitToBit(digit);
      const cells = unit.filter((index) => grid[index] === 0 && (candidates[index] & bit) !== 0);
      if (cells.length < 2) {
        continue;
      }

      const box = BOX_BY_INDEX[cells[0]];
      if (!cells.every((index) => BOX_BY_INDEX[index] === box)) {
        continue;
      }

      const removals = BOX_UNITS[box]
        .filter((index) => COL_BY_INDEX[index] !== col && grid[index] === 0 && (candidates[index] & bit) !== 0)
        .map((index) => ({ index, removeMask: bit }));
      if (removals.length > 0) {
        return { technique: "locked-candidates", removals };
      }
    }
  }

  return null;
}

function findNakedPair(grid: number[], candidates: number[]): RemovalAction | null {
  for (const unit of ALL_UNITS) {
    const pairs = new Map<number, number[]>();

    for (const index of unit) {
      if (grid[index] !== 0) {
        continue;
      }

      const mask = candidates[index];
      if (bitCount(mask) !== 2) {
        continue;
      }

      const existing = pairs.get(mask) ?? [];
      existing.push(index);
      pairs.set(mask, existing);
    }

    for (const [pairMask, pairCells] of pairs) {
      if (pairCells.length !== 2) {
        continue;
      }

      const pairSet = new Set(pairCells);
      const removals: CandidateRemoval[] = [];

      for (const index of unit) {
        if (grid[index] !== 0 || pairSet.has(index)) {
          continue;
        }

        const removeMask = candidates[index] & pairMask;
        if (removeMask !== 0) {
          removals.push({ index, removeMask });
        }
      }

      if (removals.length > 0) {
        return { technique: "naked-pair", removals };
      }
    }
  }

  return null;
}

function samePair(left: number[], right: number[]): boolean {
  return left.length === 2 && right.length === 2 && left[0] === right[0] && left[1] === right[1];
}

function findHiddenPair(grid: number[], candidates: number[]): RemovalAction | null {
  for (const unit of ALL_UNITS) {
    for (let firstDigit = 1; firstDigit <= 8; firstDigit += 1) {
      const firstBit = digitToBit(firstDigit);
      const firstCells = unit.filter((index) => grid[index] === 0 && (candidates[index] & firstBit) !== 0);
      if (firstCells.length !== 2) {
        continue;
      }

      for (let secondDigit = firstDigit + 1; secondDigit <= 9; secondDigit += 1) {
        const secondBit = digitToBit(secondDigit);
        const secondCells = unit.filter((index) => grid[index] === 0 && (candidates[index] & secondBit) !== 0);
        if (!samePair(firstCells, secondCells)) {
          continue;
        }

        const pairMask = firstBit | secondBit;
        const removals: CandidateRemoval[] = [];

        for (const index of firstCells) {
          const removeMask = candidates[index] & ~pairMask;
          if (removeMask !== 0) {
            removals.push({ index, removeMask });
          }
        }

        if (removals.length > 0) {
          return { technique: "hidden-pair", removals };
        }
      }
    }
  }

  return null;
}

function findXWing(grid: number[], candidates: number[]): RemovalAction | null {
  for (let digit = 1; digit <= 9; digit += 1) {
    const bit = digitToBit(digit);

    const rowPairs: Array<{ row: number; cols: [number, number] }> = [];
    for (let row = 0; row < 9; row += 1) {
      const cols: number[] = [];
      for (let col = 0; col < 9; col += 1) {
        const index = rcToIdx(row, col);
        if (grid[index] === 0 && (candidates[index] & bit) !== 0) {
          cols.push(col);
        }
      }

      if (cols.length === 2) {
        rowPairs.push({ row, cols: [cols[0], cols[1]] });
      }
    }

    for (let left = 0; left < rowPairs.length; left += 1) {
      for (let right = left + 1; right < rowPairs.length; right += 1) {
        const first = rowPairs[left];
        const second = rowPairs[right];
        if (first.cols[0] !== second.cols[0] || first.cols[1] !== second.cols[1]) {
          continue;
        }

        const removals: CandidateRemoval[] = [];
        for (let row = 0; row < 9; row += 1) {
          if (row === first.row || row === second.row) {
            continue;
          }

          for (const col of first.cols) {
            const index = rcToIdx(row, col);
            if (grid[index] === 0 && (candidates[index] & bit) !== 0) {
              removals.push({ index, removeMask: bit });
            }
          }
        }

        if (removals.length > 0) {
          return { technique: "x-wing", removals };
        }
      }
    }

    const colPairs: Array<{ col: number; rows: [number, number] }> = [];
    for (let col = 0; col < 9; col += 1) {
      const rows: number[] = [];
      for (let row = 0; row < 9; row += 1) {
        const index = rcToIdx(row, col);
        if (grid[index] === 0 && (candidates[index] & bit) !== 0) {
          rows.push(row);
        }
      }

      if (rows.length === 2) {
        colPairs.push({ col, rows: [rows[0], rows[1]] });
      }
    }

    for (let left = 0; left < colPairs.length; left += 1) {
      for (let right = left + 1; right < colPairs.length; right += 1) {
        const first = colPairs[left];
        const second = colPairs[right];
        if (first.rows[0] !== second.rows[0] || first.rows[1] !== second.rows[1]) {
          continue;
        }

        const removals: CandidateRemoval[] = [];
        for (let col = 0; col < 9; col += 1) {
          if (col === first.col || col === second.col) {
            continue;
          }

          for (const row of first.rows) {
            const index = rcToIdx(row, col);
            if (grid[index] === 0 && (candidates[index] & bit) !== 0) {
              removals.push({ index, removeMask: bit });
            }
          }
        }

        if (removals.length > 0) {
          return { technique: "x-wing", removals };
        }
      }
    }
  }

  return null;
}

function findSwordfish(grid: number[], candidates: number[]): RemovalAction | null {
  for (let digit = 1; digit <= 9; digit += 1) {
    const bit = digitToBit(digit);

    const rowCandidates: Array<{ row: number; cols: number[] }> = [];
    for (let row = 0; row < 9; row += 1) {
      const cols: number[] = [];
      for (let col = 0; col < 9; col += 1) {
        const index = rcToIdx(row, col);
        if (grid[index] === 0 && (candidates[index] & bit) !== 0) {
          cols.push(col);
        }
      }

      if (cols.length >= 2 && cols.length <= 3) {
        rowCandidates.push({ row, cols });
      }
    }

    for (let first = 0; first < rowCandidates.length; first += 1) {
      for (let second = first + 1; second < rowCandidates.length; second += 1) {
        for (let third = second + 1; third < rowCandidates.length; third += 1) {
          const selectedRows = [rowCandidates[first], rowCandidates[second], rowCandidates[third]];
          const colSet = new Set<number>();
          for (const rowEntry of selectedRows) {
            for (const col of rowEntry.cols) {
              colSet.add(col);
            }
          }

          if (colSet.size !== 3) {
            continue;
          }

          const rowSet = new Set(selectedRows.map((entry) => entry.row));
          const removals: CandidateRemoval[] = [];
          for (const col of colSet) {
            for (let row = 0; row < 9; row += 1) {
              if (rowSet.has(row)) {
                continue;
              }

              const index = rcToIdx(row, col);
              if (grid[index] === 0 && (candidates[index] & bit) !== 0) {
                removals.push({ index, removeMask: bit });
              }
            }
          }

          if (removals.length > 0) {
            return { technique: "swordfish", removals };
          }
        }
      }
    }

    const colCandidates: Array<{ col: number; rows: number[] }> = [];
    for (let col = 0; col < 9; col += 1) {
      const rows: number[] = [];
      for (let row = 0; row < 9; row += 1) {
        const index = rcToIdx(row, col);
        if (grid[index] === 0 && (candidates[index] & bit) !== 0) {
          rows.push(row);
        }
      }

      if (rows.length >= 2 && rows.length <= 3) {
        colCandidates.push({ col, rows });
      }
    }

    for (let first = 0; first < colCandidates.length; first += 1) {
      for (let second = first + 1; second < colCandidates.length; second += 1) {
        for (let third = second + 1; third < colCandidates.length; third += 1) {
          const selectedCols = [colCandidates[first], colCandidates[second], colCandidates[third]];
          const rowSet = new Set<number>();
          for (const colEntry of selectedCols) {
            for (const row of colEntry.rows) {
              rowSet.add(row);
            }
          }

          if (rowSet.size !== 3) {
            continue;
          }

          const colSet = new Set(selectedCols.map((entry) => entry.col));
          const removals: CandidateRemoval[] = [];
          for (const row of rowSet) {
            for (let col = 0; col < 9; col += 1) {
              if (colSet.has(col)) {
                continue;
              }

              const index = rcToIdx(row, col);
              if (grid[index] === 0 && (candidates[index] & bit) !== 0) {
                removals.push({ index, removeMask: bit });
              }
            }
          }

          if (removals.length > 0) {
            return { technique: "swordfish", removals };
          }
        }
      }
    }
  }

  return null;
}

function findHardestTechnique(techniqueCounts: TechniqueCounts): Technique {
  for (let index = TECHNIQUE_ORDER.length - 1; index >= 0; index -= 1) {
    const technique = TECHNIQUE_ORDER[index];
    if (techniqueCounts[technique] > 0) {
      return technique;
    }
  }

  return "naked-single";
}

function scoreTechniqueCounts(techniqueCounts: TechniqueCounts): number {
  let score = 0;

  for (const technique of TECHNIQUE_ORDER) {
    score += techniqueCounts[technique] * TECHNIQUE_WEIGHTS[technique];
  }

  return score;
}

function classifyTechniqueScore(score: number, hardestTechnique: Technique, solvedByTechniques: boolean): Difficulty {
  void hardestTechnique;

  if (!solvedByTechniques) {
    return "expert";
  }

  if (score <= 42) {
    return "easy";
  }

  if (score <= 57) {
    return "medium";
  }

  if (score <= 75) {
    return "hard";
  }

  return "expert";
}

function evaluateGridDifficulty(grid: number[]): PuzzleDifficultyAnalysis {
  const working = grid.slice();
  const state = initStateFromGrid(working);
  const counts = createEmptyTechniqueCounts();

  if (!state) {
    return {
      difficulty: "expert",
      score: 999,
      hardestTechnique: "swordfish",
      techniqueCounts: counts,
      solvedByTechniques: false,
    };
  }

  const candidates = initializeCandidateMasks(working, state);
  if (!candidates) {
    return {
      difficulty: "expert",
      score: 999,
      hardestTechnique: "swordfish",
      techniqueCounts: counts,
      solvedByTechniques: false,
    };
  }

  while (true) {
    if (working.every((value) => value !== 0)) {
      break;
    }

    const nakedSingle = findNakedSingle(working, candidates);
    if (nakedSingle) {
      if (!placeWithCandidates(state, working, candidates, nakedSingle.index, nakedSingle.value)) {
        break;
      }
      counts[nakedSingle.technique] += 1;
      continue;
    }

    const hiddenSingle = findHiddenSingle(working, candidates);
    if (hiddenSingle) {
      if (!placeWithCandidates(state, working, candidates, hiddenSingle.index, hiddenSingle.value)) {
        break;
      }
      counts[hiddenSingle.technique] += 1;
      continue;
    }

    const lockedCandidates = findLockedCandidates(working, candidates);
    if (lockedCandidates) {
      const changed = applyCandidateRemovals(working, candidates, lockedCandidates.removals);
      if (changed < 0) {
        break;
      }
      if (changed > 0) {
        counts[lockedCandidates.technique] += 1;
        continue;
      }
    }

    const nakedPair = findNakedPair(working, candidates);
    if (nakedPair) {
      const changed = applyCandidateRemovals(working, candidates, nakedPair.removals);
      if (changed < 0) {
        break;
      }
      if (changed > 0) {
        counts[nakedPair.technique] += 1;
        continue;
      }
    }

    const hiddenPair = findHiddenPair(working, candidates);
    if (hiddenPair) {
      const changed = applyCandidateRemovals(working, candidates, hiddenPair.removals);
      if (changed < 0) {
        break;
      }
      if (changed > 0) {
        counts[hiddenPair.technique] += 1;
        continue;
      }
    }

    const xWing = findXWing(working, candidates);
    if (xWing) {
      const changed = applyCandidateRemovals(working, candidates, xWing.removals);
      if (changed < 0) {
        break;
      }
      if (changed > 0) {
        counts[xWing.technique] += 1;
        continue;
      }
    }

    const swordfish = findSwordfish(working, candidates);
    if (swordfish) {
      const changed = applyCandidateRemovals(working, candidates, swordfish.removals);
      if (changed < 0) {
        break;
      }
      if (changed > 0) {
        counts[swordfish.technique] += 1;
        continue;
      }
    }

    break;
  }

  const solvedByTechniques = working.every((value) => value !== 0);
  const hardestTechnique = findHardestTechnique(counts);
  let score = scoreTechniqueCounts(counts);

  if (!solvedByTechniques) {
    const unresolved = working.reduce((total, value) => total + (value === 0 ? 1 : 0), 0);
    score += TECHNIQUE_WEIGHTS.swordfish + unresolved * 2;
  }

  return {
    difficulty: classifyTechniqueScore(score, hardestTechnique, solvedByTechniques),
    score,
    hardestTechnique,
    techniqueCounts: counts,
    solvedByTechniques,
  };
}

function withDifficultyAnalysis(base: {
  puzzle: Board;
  solution: Board;
  givens: number;
}): PuzzleCandidate {
  const analysis = evaluateGridDifficulty(boardToGrid(base.puzzle));
  return {
    puzzle: base.puzzle,
    solution: base.solution,
    givens: base.givens,
    difficulty: analysis.difficulty,
    score: analysis.score,
    hardestTechnique: analysis.hardestTechnique,
    techniqueCounts: analysis.techniqueCounts,
    solvedByTechniques: analysis.solvedByTechniques,
  };
}

export function ratePuzzleDifficulty(inputBoard: unknown): PuzzleDifficultyAnalysis | null {
  if (!isValidBoardShape(inputBoard)) {
    return null;
  }

  return evaluateGridDifficulty(boardToGrid(inputBoard));
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

function targetCandidateClues(rng: () => number): number {
  return randomInt(CANDIDATE_CLUES_RANGE[0], CANDIDATE_CLUES_RANGE[1], rng);
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

function candidateDistanceFromTarget(candidate: PuzzleCandidate, cluesTarget: number): number {
  return Math.abs(candidate.givens - cluesTarget);
}

function generatePuzzleCandidateWithRng(rng: () => number): PuzzleCandidate {
  const cluesTarget = targetCandidateClues(rng);
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

    const candidate = withDifficultyAnalysis({
      puzzle,
      solution: solved,
      givens,
    });

    if (
      !bestCandidate
      || candidateDistanceFromTarget(candidate, cluesTarget) < candidateDistanceFromTarget(bestCandidate, cluesTarget)
    ) {
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
    return withDifficultyAnalysis({
      puzzle: emergency.puzzle,
      solution: solved,
      givens: emergency.givens,
    });
  }

  const safeSolution = cloneBoard(emergencySolution);
  return withDifficultyAnalysis({
    puzzle: cloneBoard(safeSolution),
    solution: safeSolution,
    givens: SIZE,
  });
}

export function generatePuzzleCandidate(
  difficultyHint: Difficulty = "medium",
  options: PuzzleGenerationOptions = {},
): PuzzleCandidate {
  void difficultyHint;

  const rng = resolveRng(options);
  return generatePuzzleCandidateWithRng(rng);
}

export function generatePuzzle(difficulty: Difficulty = "medium", options: PuzzleGenerationOptions = {}): PuzzleCandidate {
  const rng = resolveRng(options);

  while (true) {
    const candidate = generatePuzzleCandidateWithRng(rng);
    if (candidate.difficulty === difficulty) {
      return candidate;
    }
  }
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
