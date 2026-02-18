"use client";

import {
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  givensSetToBooleanBoard,
  noteMaskBoardToDigitsBoard,
  SudokuBoard,
  type SudokuBoardCell,
} from "@slobbe/sudoku-board";
import {
  boardComplete,
  clone,
  countSolutions,
  createSeededRng,
  dateSeed,
  generatePuzzle,
  type Board,
  type Difficulty,
} from "@slobbe/sudoku-engine";

type Theme = "slate" | "dusk" | "mist" | "amber";
type FillModeEntry = "long-press" | "double-tap";
type AppView = "home" | "game" | "settings" | "stats";
type PuzzleMode = "standard" | "daily";

type CellSelection = {
  row: number;
  col: number;
};

type DifficultyStats = {
  started: number;
  won: number;
};

type DailyResult = "won" | "lost";

type DailyHistoryEntry = {
  result: DailyResult;
  difficulty: Difficulty;
};

type DailyCalendarCell = {
  key: string;
  dateNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  entry: DailyHistoryEntry | null;
};

type DailyStats = {
  gamesStarted: number;
  gamesWon: number;
  currentStreak: number;
  bestStreak: number;
  byDifficulty: Record<Difficulty, DifficultyStats>;
  lastStartedDate: string | null;
  lastWonDate: string | null;
  historyByDate: Record<string, DailyHistoryEntry>;
};

type NotesBoard = number[][];

type GameStats = {
  gamesStarted: number;
  gamesWon: number;
  currentStreak: number;
  bestStreak: number;
  byDifficulty: Record<Difficulty, DifficultyStats>;
  daily: DailyStats;
};

type SessionSnapshot = {
  difficulty: Difficulty;
  puzzle: Board;
  solution: Board;
  board: Board;
  notes: NotesBoard;
  hintsPerGame: number;
  livesPerGame: number;
  hintsLeft: number;
  livesLeft: number;
  annotationMode: boolean;
  currentGameStarted: boolean;
  won: boolean;
  lost: boolean;
};

type DailySessionSnapshot = SessionSnapshot & {
  date: string;
  seed: string;
};

type Snapshot = {
  board: Board;
  notes: NotesBoard;
  selected: CellSelection | null;
  highlightValue: number | null;
  won: boolean;
};

type GameState = {
  mode: PuzzleMode;
  difficulty: Difficulty;
  configuredHintsPerGame: number;
  configuredLivesPerGame: number;
  puzzle: Board | null;
  solution: Board | null;
  board: Board | null;
  givens: Set<string>;
  selected: CellSelection | null;
  highlightValue: number | null;
  fillModeValue: number | null;
  annotationMode: boolean;
  notes: NotesBoard;
  showMistakes: boolean;
  fillModeEntry: FillModeEntry;
  theme: Theme;
  undoStack: Snapshot[];
  redoStack: Snapshot[];
  stats: GameStats;
  winRecorded: boolean;
  currentGameStarted: boolean;
  hintsPerGame: number;
  livesPerGame: number;
  hintsLeft: number;
  livesLeft: number;
  lost: boolean;
  won: boolean;
  dailyDate: string | null;
  dailySeed: string | null;
  standardSession: SessionSnapshot | null;
  dailySession: DailySessionSnapshot | null;
};

type SavedSessionPayload = {
  difficulty: Difficulty;
  puzzle: Board;
  solution: Board;
  board: Board;
  notes: NotesBoard;
  hintsPerGame: number;
  livesPerGame: number;
  hintsLeft: number;
  livesLeft: number;
  annotationMode: boolean;
  currentGameStarted: boolean;
  won: boolean;
  lost: boolean;
};

type SavedDailySessionPayload = SavedSessionPayload & {
  date: string;
  seed: string;
};

type SavedGamePayload = {
  mode?: PuzzleMode;
  difficulty: Difficulty;
  configuredHintsPerGame: number;
  configuredLivesPerGame: number;
  puzzle: Board;
  solution: Board;
  board: Board;
  hintsPerGame: number;
  livesPerGame: number;
  hintsLeft: number;
  livesLeft: number;
  annotationMode: boolean;
  notes: NotesBoard;
  showMistakes: boolean;
  fillModeEntry: FillModeEntry;
  theme: Theme;
  stats: GameStats;
  won: boolean;
  lost: boolean;
  currentGameStarted: boolean;
  dailyDate?: string | null;
  dailySeed?: string | null;
  standardSession?: SavedSessionPayload;
  dailySession?: SavedDailySessionPayload;
};

const DEFAULT_HINTS_PER_GAME = 3;
const DEFAULT_LIVES_PER_GAME = 3;
const MIN_HINTS_PER_GAME = 0;
const MAX_HINTS_PER_GAME = 9;
const MIN_LIVES_PER_GAME = 1;
const MAX_LIVES_PER_GAME = 9;
const SAVE_KEY = "sudoku-pwa-current-game-v1";
const DOUBLE_TAP_MS = 300;

const APP_NAME = "Sudoku";
const APP_VERSION = "0.4.0";
const APP_AUTHOR = "slobbe";

const THEMES: Theme[] = ["slate", "dusk", "mist", "amber"];
const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];
const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;
const WEEKDAY_SHORT_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const HINT_OPTIONS = Array.from(
  { length: MAX_HINTS_PER_GAME - MIN_HINTS_PER_GAME + 1 },
  (_, index) => MIN_HINTS_PER_GAME + index,
);
const LIVES_OPTIONS = Array.from(
  { length: MAX_LIVES_PER_GAME - MIN_LIVES_PER_GAME + 1 },
  (_, index) => MIN_LIVES_PER_GAME + index,
);

const HOME_STATUS_MESSAGES = [
  "Sudoku rule zero: no guessing, only dramatic confidence.",
  "Tip: scan rows and columns for cells with only one possible number.",
  "Your pencil notes are tiny detectives. Let them investigate.",
  "Tip: if a number can go in only one spot in a 3x3 box, place it.",
  "When stuck, look for what is missing, not what is possible.",
  "Tip: pairs of candidates can eliminate options from neighboring cells.",
  "Sudoku is yoga for your brain, but with more muttering.",
  "Tip: finish easy singles first to unlock harder patterns.",
  "Every solved cell is one less mystery and one more victory.",
  "Tip: check intersections where row and box constraints overlap.",
  "If the board stares back, stare harder and mark notes.",
  "Tip: after placing a number, recheck peers for new singles.",
  "A calm solver is a fast solver. Breathe, then scan.",
  "Tip: use hints sparingly; they are best when progress truly stalls.",
  "No rush: correct and steady beats fast and chaotic.",
];

const THEME_COLORS: Record<Theme, string> = {
  slate: "#151a21",
  mist: "#161918",
  dusk: "#171420",
  amber: "#1d1913",
};

function createDefaultDailyStats(): DailyStats {
  return {
    gamesStarted: 0,
    gamesWon: 0,
    currentStreak: 0,
    bestStreak: 0,
    byDifficulty: {
      easy: { started: 0, won: 0 },
      medium: { started: 0, won: 0 },
      hard: { started: 0, won: 0 },
    },
    lastStartedDate: null,
    lastWonDate: null,
    historyByDate: {},
  };
}

function createDefaultStats(): GameStats {
  return {
    gamesStarted: 0,
    gamesWon: 0,
    currentStreak: 0,
    bestStreak: 0,
    byDifficulty: {
      easy: { started: 0, won: 0 },
      medium: { started: 0, won: 0 },
      hard: { started: 0, won: 0 },
    },
    daily: createDefaultDailyStats(),
  };
}

function cloneStats(stats: GameStats): GameStats {
  return {
    gamesStarted: stats.gamesStarted,
    gamesWon: stats.gamesWon,
    currentStreak: stats.currentStreak,
    bestStreak: stats.bestStreak,
    byDifficulty: {
      easy: { ...stats.byDifficulty.easy },
      medium: { ...stats.byDifficulty.medium },
      hard: { ...stats.byDifficulty.hard },
    },
    daily: {
      gamesStarted: stats.daily.gamesStarted,
      gamesWon: stats.daily.gamesWon,
      currentStreak: stats.daily.currentStreak,
      bestStreak: stats.daily.bestStreak,
      byDifficulty: {
        easy: { ...stats.daily.byDifficulty.easy },
        medium: { ...stats.daily.byDifficulty.medium },
        hard: { ...stats.daily.byDifficulty.hard },
      },
      lastStartedDate: stats.daily.lastStartedDate,
      lastWonDate: stats.daily.lastWonDate,
      historyByDate: { ...stats.daily.historyByDate },
    },
  };
}

function keyOf(row: number, col: number): string {
  return `${row}-${col}`;
}

function createEmptyNotesBoard(): NotesBoard {
  return Array.from({ length: 9 }, () => Array<number>(9).fill(0));
}

function cloneNotesBoard(notes: NotesBoard): NotesBoard {
  return notes.map((row) => row.slice());
}

function isNotesBoardShape(notes: unknown): notes is NotesBoard {
  if (!Array.isArray(notes) || notes.length !== 9) {
    return false;
  }
  return notes.every(
    (row) =>
      Array.isArray(row)
      && row.length === 9
      && row.every((value) => Number.isInteger(value) && value >= 0 && value <= 511),
  );
}

function noteBit(value: number): number {
  return 1 << (value - 1);
}

function pickHomeStatusMessage(previous?: string): string {
  if (HOME_STATUS_MESSAGES.length === 0) {
    return "";
  }
  if (HOME_STATUS_MESSAGES.length === 1) {
    return HOME_STATUS_MESSAGES[0];
  }

  let next = HOME_STATUS_MESSAGES[Math.floor(Math.random() * HOME_STATUS_MESSAGES.length)] ?? HOME_STATUS_MESSAGES[0];
  for (let attempts = 0; attempts < 8 && next === previous; attempts += 1) {
    next = HOME_STATUS_MESSAGES[Math.floor(Math.random() * HOME_STATUS_MESSAGES.length)] ?? HOME_STATUS_MESSAGES[0];
  }

  return next;
}

function clearPeerNoteDigit(notes: NotesBoard, board: Board, row: number, col: number, value: number): void {
  const bit = noteBit(value);

  for (let i = 0; i < 9; i += 1) {
    if (i !== col && board[row][i] === 0) {
      notes[row][i] &= ~bit;
    }
    if (i !== row && board[i][col] === 0) {
      notes[i][col] &= ~bit;
    }
  }

  const rowStart = Math.floor(row / 3) * 3;
  const colStart = Math.floor(col / 3) * 3;
  for (let r = rowStart; r < rowStart + 3; r += 1) {
    for (let c = colStart; c < colStart + 3; c += 1) {
      if ((r !== row || c !== col) && board[r][c] === 0) {
        notes[r][c] &= ~bit;
      }
    }
  }
}

function isBoardShape(board: unknown): board is Board {
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

function buildGivens(puzzle: Board): Set<string> {
  const givens = new Set<string>();
  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 9; col += 1) {
      if (puzzle[row][col] !== 0) {
        givens.add(keyOf(row, col));
      }
    }
  }
  return givens;
}

function normalizeTheme(theme: unknown): Theme {
  if (theme === "purple") {
    return "dusk";
  }
  if (typeof theme !== "string") {
    return "slate";
  }
  if (THEMES.includes(theme as Theme)) {
    return theme as Theme;
  }
  return "slate";
}

function isDifficulty(value: unknown): value is Difficulty {
  return typeof value === "string" && DIFFICULTIES.includes(value as Difficulty);
}

function isFillModeEntry(value: unknown): value is FillModeEntry {
  return value === "double-tap" || value === "long-press";
}

function isNonNegativeInteger(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 0;
}

function normalizePerGameCount(value: unknown, min: number, max: number, fallback: number): number {
  if (!Number.isInteger(value)) {
    return fallback;
  }
  const parsed = value as number;
  if (parsed < min || parsed > max) {
    return fallback;
  }
  return parsed;
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

function boardRespectsGivens(board: Board, puzzle: Board): boolean {
  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 9; col += 1) {
      const given = puzzle[row][col];
      if (given !== 0 && board[row][col] !== given) {
        return false;
      }
    }
  }
  return true;
}

function boardMatchesSolution(board: Board, solution: Board): boolean {
  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 9; col += 1) {
      if (board[row][col] !== solution[row][col]) {
        return false;
      }
    }
  }
  return true;
}

function hasUserProgressOnBoard(board: Board, puzzle: Board): boolean {
  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 9; col += 1) {
      if (puzzle[row][col] === 0 && board[row][col] !== 0) {
        return true;
      }
    }
  }
  return false;
}

function isSavedGameIntegrityValid(parsed: {
  puzzle: Board;
  solution: Board;
  board: Board;
  won: boolean;
}): boolean {
  if (!boardComplete(parsed.solution)) {
    return false;
  }
  if (!puzzleMatchesSolution(parsed.puzzle, parsed.solution)) {
    return false;
  }
  if (!boardRespectsGivens(parsed.board, parsed.puzzle)) {
    return false;
  }
  if (countSolutions(parsed.puzzle, 2) !== 1) {
    return false;
  }
  if (parsed.won && !boardMatchesSolution(parsed.board, parsed.solution)) {
    return false;
  }
  return true;
}

function normalizeStats(rawStats: unknown): GameStats {
  const fallback = createDefaultStats();
  if (!rawStats || typeof rawStats !== "object") {
    return fallback;
  }

  const entry = rawStats as {
    gamesStarted?: unknown;
    gamesWon?: unknown;
    currentStreak?: unknown;
    bestStreak?: unknown;
    byDifficulty?: Record<string, { started?: unknown; won?: unknown }>;
    daily?: {
      gamesStarted?: unknown;
      gamesWon?: unknown;
      currentStreak?: unknown;
      bestStreak?: unknown;
      byDifficulty?: Record<string, { started?: unknown; won?: unknown }>;
      lastStartedDate?: unknown;
      lastWonDate?: unknown;
      historyByDate?: Record<string, { result?: unknown; difficulty?: unknown }>;
    };
  };

  const stats: GameStats = {
    gamesStarted: isNonNegativeInteger(entry.gamesStarted) ? entry.gamesStarted : 0,
    gamesWon: isNonNegativeInteger(entry.gamesWon) ? entry.gamesWon : 0,
    currentStreak: isNonNegativeInteger(entry.currentStreak) ? entry.currentStreak : 0,
    bestStreak: isNonNegativeInteger(entry.bestStreak) ? entry.bestStreak : 0,
    byDifficulty: {
      easy: { started: 0, won: 0 },
      medium: { started: 0, won: 0 },
      hard: { started: 0, won: 0 },
    },
    daily: createDefaultDailyStats(),
  };

  for (const difficulty of DIFFICULTIES) {
    const diffEntry = entry.byDifficulty?.[difficulty];
    stats.byDifficulty[difficulty] = {
      started: isNonNegativeInteger(diffEntry?.started) ? diffEntry.started : 0,
      won: isNonNegativeInteger(diffEntry?.won) ? diffEntry.won : 0,
    };
  }

  if (stats.bestStreak < stats.currentStreak) {
    stats.bestStreak = stats.currentStreak;
  }

  const dailyEntry = entry.daily;
  if (dailyEntry && typeof dailyEntry === "object") {
    stats.daily.gamesStarted = isNonNegativeInteger(dailyEntry.gamesStarted) ? dailyEntry.gamesStarted : 0;
    stats.daily.gamesWon = isNonNegativeInteger(dailyEntry.gamesWon) ? dailyEntry.gamesWon : 0;
    stats.daily.currentStreak = isNonNegativeInteger(dailyEntry.currentStreak) ? dailyEntry.currentStreak : 0;
    stats.daily.bestStreak = isNonNegativeInteger(dailyEntry.bestStreak) ? dailyEntry.bestStreak : 0;

    for (const difficulty of DIFFICULTIES) {
      const diffEntry = dailyEntry.byDifficulty?.[difficulty];
      stats.daily.byDifficulty[difficulty] = {
        started: isNonNegativeInteger(diffEntry?.started) ? diffEntry.started : 0,
        won: isNonNegativeInteger(diffEntry?.won) ? diffEntry.won : 0,
      };
    }

    stats.daily.lastStartedDate = typeof dailyEntry.lastStartedDate === "string" ? dailyEntry.lastStartedDate : null;
    stats.daily.lastWonDate = typeof dailyEntry.lastWonDate === "string" ? dailyEntry.lastWonDate : null;

    const history = dailyEntry.historyByDate;
    if (history && typeof history === "object") {
      const historyByDate: Record<string, DailyHistoryEntry> = {};

      for (const [key, value] of Object.entries(history)) {
        if (!/^(\d{4})-(\d{2})-(\d{2})$/.test(key)) {
          continue;
        }
        if (!value || typeof value !== "object") {
          continue;
        }

        const entryValue = value as { result?: unknown; difficulty?: unknown };
        if ((entryValue.result === "won" || entryValue.result === "lost") && isDifficulty(entryValue.difficulty)) {
          historyByDate[key] = {
            result: entryValue.result,
            difficulty: entryValue.difficulty,
          };
        }
      }

      stats.daily.historyByDate = historyByDate;
    }
  }

  if (stats.daily.bestStreak < stats.daily.currentStreak) {
    stats.daily.bestStreak = stats.daily.currentStreak;
  }

  return stats;
}

function createInitialState(): GameState {
  return {
    mode: "standard",
    difficulty: "medium",
    configuredHintsPerGame: DEFAULT_HINTS_PER_GAME,
    configuredLivesPerGame: DEFAULT_LIVES_PER_GAME,
    puzzle: null,
    solution: null,
    board: null,
    givens: new Set<string>(),
    selected: null,
    highlightValue: null,
    fillModeValue: null,
    annotationMode: false,
    notes: createEmptyNotesBoard(),
    showMistakes: true,
    fillModeEntry: "double-tap",
    theme: "slate",
    undoStack: [],
    redoStack: [],
    stats: createDefaultStats(),
    winRecorded: false,
    currentGameStarted: false,
    hintsPerGame: DEFAULT_HINTS_PER_GAME,
    livesPerGame: DEFAULT_LIVES_PER_GAME,
    hintsLeft: DEFAULT_HINTS_PER_GAME,
    livesLeft: DEFAULT_LIVES_PER_GAME,
    lost: false,
    won: false,
    dailyDate: null,
    dailySeed: null,
    standardSession: null,
    dailySession: null,
  };
}

function createSnapshot(state: GameState): Snapshot {
  if (!state.board) {
    return {
      board: Array.from({ length: 9 }, () => Array(9).fill(0)),
      notes: cloneNotesBoard(state.notes),
      selected: state.selected ? { ...state.selected } : null,
      highlightValue: state.highlightValue,
      won: state.won,
    };
  }

  return {
    board: clone(state.board),
    notes: cloneNotesBoard(state.notes),
    selected: state.selected ? { ...state.selected } : null,
    highlightValue: state.highlightValue,
    won: state.won,
  };
}

function parseDateKey(value: string): number {
  const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!parts) {
    return Number.NaN;
  }
  const year = Number(parts[1]);
  const month = Number(parts[2]);
  const day = Number(parts[3]);
  return Date.UTC(year, month - 1, day);
}

function isPreviousDateKey(previous: string | null, current: string): boolean {
  if (!previous) {
    return false;
  }

  const previousValue = parseDateKey(previous);
  const currentValue = parseDateKey(current);
  if (!Number.isFinite(previousValue) || !Number.isFinite(currentValue)) {
    return false;
  }

  return currentValue - previousValue === 86400000;
}

function recordGameStart(
  stats: GameStats,
  difficulty: Difficulty,
  mode: PuzzleMode,
  dailyDate: string | null,
): GameStats {
  const next = cloneStats(stats);

  if (mode === "daily") {
    if (!dailyDate || next.daily.lastStartedDate === dailyDate) {
      return next;
    }

    next.daily.gamesStarted += 1;
    next.daily.byDifficulty[difficulty].started += 1;
    next.daily.lastStartedDate = dailyDate;
    return next;
  }

  next.gamesStarted += 1;
  next.byDifficulty[difficulty].started += 1;
  return next;
}

function recordWin(
  stats: GameStats,
  difficulty: Difficulty,
  mode: PuzzleMode,
  dailyDate: string | null,
): GameStats {
  const next = cloneStats(stats);

  if (mode === "daily") {
    if (!dailyDate || next.daily.historyByDate[dailyDate]?.result === "won") {
      return next;
    }

    next.daily.gamesWon += 1;
    next.daily.byDifficulty[difficulty].won += 1;

    if (isPreviousDateKey(next.daily.lastWonDate, dailyDate)) {
      next.daily.currentStreak += 1;
    } else {
      next.daily.currentStreak = 1;
    }

    if (next.daily.currentStreak > next.daily.bestStreak) {
      next.daily.bestStreak = next.daily.currentStreak;
    }

    next.daily.lastWonDate = dailyDate;
    next.daily.historyByDate[dailyDate] = {
      result: "won",
      difficulty,
    };
    return next;
  }

  next.gamesWon += 1;
  next.byDifficulty[difficulty].won += 1;
  next.currentStreak += 1;
  if (next.currentStreak > next.bestStreak) {
    next.bestStreak = next.currentStreak;
  }
  return next;
}

function recordDailyLoss(stats: GameStats, difficulty: Difficulty, dailyDate: string | null): GameStats {
  if (!dailyDate) {
    return stats;
  }

  const existing = stats.daily.historyByDate[dailyDate];
  if (existing?.result === "won" || existing?.result === "lost") {
    return stats;
  }

  const next = cloneStats(stats);
  next.daily.historyByDate[dailyDate] = {
    result: "lost",
    difficulty,
  };
  return next;
}

function markCurrentGameAsLossIfNeeded(state: GameState): GameStats {
  const next = cloneStats(state.stats);
  if (!state.puzzle || state.won || !state.currentGameStarted) {
    return next;
  }
  if (state.mode === "daily") {
    return next;
  }
  next.currentStreak = 0;
  return next;
}

function isPuzzleMode(value: unknown): value is PuzzleMode {
  return value === "standard" || value === "daily";
}

function cloneSessionSnapshot(snapshot: SessionSnapshot): SessionSnapshot {
  return {
    difficulty: snapshot.difficulty,
    puzzle: clone(snapshot.puzzle),
    solution: clone(snapshot.solution),
    board: clone(snapshot.board),
    notes: cloneNotesBoard(snapshot.notes),
    hintsPerGame: snapshot.hintsPerGame,
    livesPerGame: snapshot.livesPerGame,
    hintsLeft: snapshot.hintsLeft,
    livesLeft: snapshot.livesLeft,
    annotationMode: snapshot.annotationMode,
    currentGameStarted: snapshot.currentGameStarted,
    won: snapshot.won,
    lost: snapshot.lost,
  };
}

function captureSessionFromState(state: GameState): SessionSnapshot | null {
  if (!state.puzzle || !state.solution || !state.board) {
    return null;
  }

  return {
    difficulty: state.difficulty,
    puzzle: clone(state.puzzle),
    solution: clone(state.solution),
    board: clone(state.board),
    notes: cloneNotesBoard(state.notes),
    hintsPerGame: state.hintsPerGame,
    livesPerGame: state.livesPerGame,
    hintsLeft: state.hintsLeft,
    livesLeft: state.livesLeft,
    annotationMode: state.annotationMode,
    currentGameStarted: state.currentGameStarted,
    won: state.won,
    lost: state.lost,
  };
}

function applySessionToState(
  state: GameState,
  session: SessionSnapshot,
  mode: PuzzleMode,
  dailyMeta?: { date: string; seed: string },
): GameState {
  const cloned = cloneSessionSnapshot(session);

  return {
    ...state,
    mode,
    difficulty: cloned.difficulty,
    puzzle: cloned.puzzle,
    solution: cloned.solution,
    board: cloned.board,
    givens: buildGivens(cloned.puzzle),
    selected: null,
    highlightValue: null,
    fillModeValue: null,
    annotationMode: cloned.annotationMode,
    notes: cloned.notes,
    undoStack: [],
    redoStack: [],
    winRecorded: cloned.won,
    currentGameStarted: cloned.currentGameStarted,
    hintsPerGame: cloned.hintsPerGame,
    livesPerGame: cloned.livesPerGame,
    hintsLeft: cloned.hintsLeft,
    livesLeft: cloned.livesLeft,
    lost: cloned.lost,
    won: cloned.won,
    dailyDate: mode === "daily" ? dailyMeta?.date ?? null : null,
    dailySeed: mode === "daily" ? dailyMeta?.seed ?? null : null,
  };
}

function stashActiveSession(state: GameState): GameState {
  const snapshot = captureSessionFromState(state);
  if (!snapshot) {
    return state;
  }

  if (state.mode === "daily" && state.dailyDate && state.dailySeed) {
    return {
      ...state,
      dailySession: {
        ...snapshot,
        date: state.dailyDate,
        seed: state.dailySeed,
      },
    };
  }

  return {
    ...state,
    standardSession: snapshot,
  };
}

function isSavedSessionPayload(value: unknown): value is SavedSessionPayload {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return isDifficulty(candidate.difficulty)
    && isBoardShape(candidate.puzzle)
    && isBoardShape(candidate.solution)
    && isBoardShape(candidate.board)
    && isNotesBoardShape(candidate.notes)
    && isNonNegativeInteger(candidate.hintsPerGame)
    && isNonNegativeInteger(candidate.livesPerGame)
    && isNonNegativeInteger(candidate.hintsLeft)
    && isNonNegativeInteger(candidate.livesLeft)
    && typeof candidate.annotationMode === "boolean"
    && typeof candidate.currentGameStarted === "boolean"
    && typeof candidate.won === "boolean"
    && typeof candidate.lost === "boolean";
}

function sessionFromSavedPayload(value: SavedSessionPayload): SessionSnapshot {
  return {
    difficulty: value.difficulty,
    puzzle: clone(value.puzzle),
    solution: clone(value.solution),
    board: clone(value.board),
    notes: cloneNotesBoard(value.notes),
    hintsPerGame: value.hintsPerGame,
    livesPerGame: value.livesPerGame,
    hintsLeft: value.hintsLeft,
    livesLeft: value.livesLeft,
    annotationMode: value.annotationMode,
    currentGameStarted: value.currentGameStarted,
    won: value.won,
    lost: value.lost,
  };
}

function isSavedDailySessionPayload(value: unknown): value is SavedDailySessionPayload {
  if (!isSavedSessionPayload(value)) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return typeof candidate.date === "string" && typeof candidate.seed === "string";
}

function serializeSession(snapshot: SessionSnapshot | null): SavedSessionPayload | undefined {
  if (!snapshot) {
    return undefined;
  }

  return {
    difficulty: snapshot.difficulty,
    puzzle: snapshot.puzzle,
    solution: snapshot.solution,
    board: snapshot.board,
    notes: snapshot.notes,
    hintsPerGame: snapshot.hintsPerGame,
    livesPerGame: snapshot.livesPerGame,
    hintsLeft: snapshot.hintsLeft,
    livesLeft: snapshot.livesLeft,
    annotationMode: snapshot.annotationMode,
    currentGameStarted: snapshot.currentGameStarted,
    won: snapshot.won,
    lost: snapshot.lost,
  };
}

function serializeDailySession(snapshot: DailySessionSnapshot | null): SavedDailySessionPayload | undefined {
  if (!snapshot) {
    return undefined;
  }

  return {
    ...serializeSession(snapshot)!,
    date: snapshot.date,
    seed: snapshot.seed,
  };
}

function getDailyRootSeed(dayKey: string): string {
  return `daily:v1:${dayKey}`;
}

function deriveDailyDifficulty(dayKey: string): Difficulty {
  const rng = createSeededRng(`${getDailyRootSeed(dayKey)}:difficulty`);
  const value = rng();
  if (value < (1 / 3)) {
    return "easy";
  }
  if (value < (2 / 3)) {
    return "medium";
  }
  return "hard";
}

function getDailyPuzzleSeed(dayKey: string, difficulty: Difficulty): string {
  return `${getDailyRootSeed(dayKey)}:puzzle:${difficulty}`;
}

function getCurrentLocalDayKey(referenceTime = Date.now()): string {
  return dateSeed(new Date(referenceTime), "local");
}

function formatCountdownToNextDaily(referenceTime = Date.now()): string {
  const now = new Date(referenceTime);
  const nextMidnight = new Date(now);
  nextMidnight.setHours(24, 0, 0, 0);
  const remainingMs = Math.max(0, nextMidnight.getTime() - now.getTime());
  const totalSeconds = Math.floor(remainingMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function getMonthKeyFromDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function parseMonthKey(monthKey: string): { year: number; month: number } {
  const match = /^(\d{4})-(\d{2})$/.exec(monthKey);
  if (!match) {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  }

  const year = Number(match[1]);
  const month = Number(match[2]) - 1;

  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 0 || month > 11) {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  }

  return { year, month };
}

function shiftMonthKey(monthKey: string, delta: number): string {
  const { year, month } = parseMonthKey(monthKey);
  const shifted = new Date(year, month + delta, 1);
  return getMonthKeyFromDate(shifted);
}

function buildDailyCalendarCells(
  monthKey: string,
  todayKey: string,
  historyByDate: Record<string, DailyHistoryEntry>,
): DailyCalendarCell[] {
  const { year, month } = parseMonthKey(monthKey);
  const firstOfMonth = new Date(year, month, 1);
  const startOffset = firstOfMonth.getDay();
  const gridStart = new Date(year, month, 1 - startOffset);
  const cells: DailyCalendarCell[] = [];

  for (let index = 0; index < 42; index += 1) {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    const key = dateSeed(date, "local");

    cells.push({
      key,
      dateNumber: date.getDate(),
      isCurrentMonth: date.getMonth() === month,
      isToday: key === todayKey,
      entry: historyByDate[key] ?? null,
    });
  }

  return cells;
}

function formatDailyEntryLabel(dateKey: string, entry: DailyHistoryEntry | null, isToday: boolean): string {
  const todaySuffix = isToday ? " (today)" : "";
  if (!entry) {
    return `${dateKey}: no daily result${todaySuffix}`;
  }

  const resultLabel = entry.result === "won" ? "solved" : "lost";
  return `${dateKey}: ${resultLabel} (${entry.difficulty})${todaySuffix}`;
}

function isSessionContinuable(session: SessionSnapshot | null): boolean {
  return Boolean(session && session.currentGameStarted && !session.won && !session.lost);
}

function countDigitOnBoard(board: Board | null, digit: number): number {
  if (!board) {
    return 0;
  }

  let count = 0;
  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 9; col += 1) {
      if (board[row][col] === digit) {
        count += 1;
      }
    }
  }
  return count;
}

function isDigitCompletedCorrectly(state: GameState, digit: number): boolean {
  if (!state.board || !state.solution) {
    return false;
  }

  let count = 0;
  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 9; col += 1) {
      if (state.board[row][col] !== digit) {
        continue;
      }
      if (state.solution[row][col] !== digit) {
        return false;
      }
      count += 1;
    }
  }

  return count === 9;
}

function findNextIncompleteDigit(state: GameState, fromDigit: number): number | null {
  for (let step = 1; step <= 9; step += 1) {
    const candidate = ((fromDigit - 1 + step) % 9) + 1;
    if (!isDigitCompletedCorrectly(state, candidate)) {
      return candidate;
    }
  }
  return null;
}

function syncFillModeAvailability(state: GameState): GameState {
  if (state.fillModeValue === null) {
    return state;
  }

  if (isDigitCompletedCorrectly(state, state.fillModeValue)) {
    const next = findNextIncompleteDigit(state, state.fillModeValue);
    return {
      ...state,
      fillModeValue: next,
      highlightValue: next,
    };
  }

  return state;
}

function calculateRatePercent(won: number, started: number): number {
  if (started <= 0) {
    return 0;
  }
  const value = (won / started) * 100;
  return Math.min(100, Math.max(0, value));
}

function formatRate(won: number, started: number): string {
  return `${Math.round(calculateRatePercent(won, started))}%`;
}

function formatLine(won: number, started: number): string {
  return `${won}/${started} (${formatRate(won, started)})`;
}

function loadSavedGame(): GameState | null {
  let raw: string | null = null;

  try {
    raw = window.localStorage.getItem(SAVE_KEY);
  } catch {
    return null;
  }

  if (!raw) {
    return null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (!parsed || typeof parsed !== "object") {
    return null;
  }

  const candidate = parsed as {
    mode?: unknown;
    difficulty?: unknown;
    configuredHintsPerGame?: unknown;
    configuredLivesPerGame?: unknown;
    puzzle?: unknown;
    solution?: unknown;
    board?: unknown;
    hintsPerGame?: unknown;
    livesPerGame?: unknown;
    hintsLeft?: unknown;
    livesLeft?: unknown;
    annotationMode?: unknown;
    notes?: unknown;
    showMistakes?: unknown;
    fillModeEntry?: unknown;
    theme?: unknown;
    stats?: unknown;
    won?: unknown;
    lost?: unknown;
    currentGameStarted?: unknown;
    dailyDate?: unknown;
    dailySeed?: unknown;
    standardSession?: unknown;
    dailySession?: unknown;
  };

  if (!isDifficulty(candidate.difficulty)) {
    return null;
  }
  if (!isBoardShape(candidate.puzzle) || !isBoardShape(candidate.solution) || !isBoardShape(candidate.board)) {
    return null;
  }

  const configuredHintsPerGame = normalizePerGameCount(
    candidate.configuredHintsPerGame,
    MIN_HINTS_PER_GAME,
    MAX_HINTS_PER_GAME,
    DEFAULT_HINTS_PER_GAME,
  );
  const configuredLivesPerGame = normalizePerGameCount(
    candidate.configuredLivesPerGame,
    MIN_LIVES_PER_GAME,
    MAX_LIVES_PER_GAME,
    DEFAULT_LIVES_PER_GAME,
  );
  const hintsPerGame = normalizePerGameCount(
    candidate.hintsPerGame,
    MIN_HINTS_PER_GAME,
    MAX_HINTS_PER_GAME,
    configuredHintsPerGame,
  );
  const livesPerGame = normalizePerGameCount(
    candidate.livesPerGame,
    MIN_LIVES_PER_GAME,
    MAX_LIVES_PER_GAME,
    configuredLivesPerGame,
  );

  if (!isNonNegativeInteger(candidate.hintsLeft) || candidate.hintsLeft > hintsPerGame) {
    return null;
  }
  if (
    candidate.livesLeft !== undefined
    && (!isNonNegativeInteger(candidate.livesLeft) || candidate.livesLeft > livesPerGame)
  ) {
    return null;
  }
  if (typeof candidate.won !== "boolean") {
    return null;
  }
  if (candidate.lost !== undefined && typeof candidate.lost !== "boolean") {
    return null;
  }
  if (candidate.currentGameStarted !== undefined && typeof candidate.currentGameStarted !== "boolean") {
    return null;
  }
  if (candidate.mode !== undefined && !isPuzzleMode(candidate.mode)) {
    return null;
  }
  if (candidate.dailyDate !== undefined && candidate.dailyDate !== null && typeof candidate.dailyDate !== "string") {
    return null;
  }
  if (candidate.dailySeed !== undefined && candidate.dailySeed !== null && typeof candidate.dailySeed !== "string") {
    return null;
  }
  if (candidate.showMistakes !== undefined && typeof candidate.showMistakes !== "boolean") {
    return null;
  }
  if (candidate.annotationMode !== undefined && typeof candidate.annotationMode !== "boolean") {
    return null;
  }
  if (candidate.notes !== undefined && !isNotesBoardShape(candidate.notes)) {
    return null;
  }
  if (candidate.fillModeEntry !== undefined && !isFillModeEntry(candidate.fillModeEntry)) {
    return null;
  }

  const payload = {
    difficulty: candidate.difficulty,
    configuredHintsPerGame,
    configuredLivesPerGame,
    puzzle: candidate.puzzle,
    solution: candidate.solution,
    board: candidate.board,
    hintsPerGame,
    livesPerGame,
    hintsLeft: candidate.hintsLeft,
    livesLeft: candidate.livesLeft,
    annotationMode: candidate.annotationMode,
    notes: candidate.notes,
    showMistakes: candidate.showMistakes,
    fillModeEntry: candidate.fillModeEntry,
    theme: candidate.theme,
    stats: candidate.stats,
    won: candidate.won,
    lost: candidate.lost,
    currentGameStarted: candidate.currentGameStarted,
  };

  if (
    !isSavedGameIntegrityValid({
      puzzle: payload.puzzle,
      solution: payload.solution,
      board: payload.board,
      won: payload.won,
    })
  ) {
    return null;
  }

  const inferredStarted = hasUserProgressOnBoard(payload.board, payload.puzzle);
  const livesLeft = payload.livesLeft !== undefined ? payload.livesLeft : payload.livesPerGame;
  const won = payload.won;
  const mode = candidate.mode ?? "standard";
  const dailyDate = typeof candidate.dailyDate === "string" ? candidate.dailyDate : null;
  const dailySeed = typeof candidate.dailySeed === "string" ? candidate.dailySeed : null;

  const standardSession = isSavedSessionPayload(candidate.standardSession)
    ? sessionFromSavedPayload(candidate.standardSession)
    : null;
  const dailySession = isSavedDailySessionPayload(candidate.dailySession)
    ? {
      ...sessionFromSavedPayload(candidate.dailySession),
      date: candidate.dailySession.date,
      seed: candidate.dailySession.seed,
    }
    : null;

  return {
    mode,
    difficulty: payload.difficulty,
    configuredHintsPerGame: payload.configuredHintsPerGame,
    configuredLivesPerGame: payload.configuredLivesPerGame,
    puzzle: payload.puzzle,
    solution: payload.solution,
    board: payload.board,
    givens: buildGivens(payload.puzzle),
    selected: null,
    highlightValue: null,
    fillModeValue: null,
    annotationMode: payload.annotationMode === true,
    notes: payload.notes ?? createEmptyNotesBoard(),
    showMistakes: true,
    fillModeEntry: payload.fillModeEntry ?? "double-tap",
    theme: normalizeTheme(payload.theme),
    undoStack: [],
    redoStack: [],
    stats: normalizeStats(payload.stats),
    winRecorded: won,
    currentGameStarted: payload.currentGameStarted === true || inferredStarted,
    hintsPerGame: payload.hintsPerGame,
    livesPerGame: payload.livesPerGame,
    hintsLeft: payload.hintsLeft,
    livesLeft,
    lost: payload.lost === true || (!won && livesLeft === 0),
    won,
    dailyDate: mode === "daily" ? dailyDate : null,
    dailySeed: mode === "daily" ? dailySeed : null,
    standardSession,
    dailySession,
  };
}

function pickHintCell(state: GameState): CellSelection | null {
  if (!state.board || !state.solution) {
    return null;
  }

  if (state.selected) {
    const { row, col } = state.selected;
    if (!state.givens.has(keyOf(row, col)) && state.board[row][col] === 0) {
      return { row, col };
    }
  }

  const empty: CellSelection[] = [];
  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 9; col += 1) {
      if (!state.givens.has(keyOf(row, col)) && state.board[row][col] === 0) {
        empty.push({ row, col });
      }
    }
  }

  if (empty.length === 0) {
    return null;
  }

  return empty[Math.floor(Math.random() * empty.length)] ?? null;
}

function syncDialogState(dialog: HTMLDialogElement | null, open: boolean): void {
  if (!dialog) {
    return;
  }
  try {
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  } catch {
    if (open) {
      dialog.setAttribute("open", "");
    } else {
      dialog.removeAttribute("open");
    }
  }
}

export function SudokuApp() {
  const [state, setState] = useState<GameState>(createInitialState);
  const stateRef = useRef<GameState>(state);

  const [activeView, setActiveView] = useState<AppView>("home");
  const [statusMessage, setStatusMessage] = useState<string>(() => HOME_STATUS_MESSAGES[0] ?? "");
  const [winPromptOpen, setWinPromptOpen] = useState(false);
  const [losePromptOpen, setLosePromptOpen] = useState(false);

  const [updateStatus, setUpdateStatus] = useState("");
  const [isHydrated, setIsHydrated] = useState(false);
  const [nowTick, setNowTick] = useState(() => Date.now());
  const [dailyCalendarMonthKey, setDailyCalendarMonthKey] = useState(() => getMonthKeyFromDate(new Date()));

  const winDialogRef = useRef<HTMLDialogElement>(null);
  const loseDialogRef = useRef<HTMLDialogElement>(null);

  const longPressTimerRef = useRef<number | null>(null);
  const longPressTriggeredRef = useRef(false);
  const lastTapDigitRef = useRef<number | null>(null);
  const lastTapAtRef = useRef(0);
  const pendingTapTimerRef = useRef<number | null>(null);

  const reloadTriggeredByUpdateRef = useRef(false);

  const applyState = useCallback((next: GameState) => {
    stateRef.current = next;
    setState(next);
  }, []);

  const isInputLocked = useCallback((sourceState: GameState): boolean => {
    return sourceState.won || sourceState.lost;
  }, []);

  const clearLongPressTimer = useCallback(() => {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const clearPendingTapTimer = useCallback(() => {
    if (pendingTapTimerRef.current !== null) {
      window.clearTimeout(pendingTapTimerRef.current);
      pendingTapTimerRef.current = null;
    }
  }, []);

  const resetDoubleTapTracking = useCallback(() => {
    clearPendingTapTimer();
    lastTapDigitRef.current = null;
    lastTapAtRef.current = 0;
  }, [clearPendingTapTimer]);

  const setFillMode = useCallback(
    (valueOrNull: number | null) => {
      const current = stateRef.current;
      const next: GameState = {
        ...current,
        fillModeValue: valueOrNull,
        highlightValue: valueOrNull !== null ? valueOrNull : current.highlightValue,
      };
      applyState(next);
    },
    [applyState],
  );

  const toggleAnnotationMode = useCallback(() => {
    const current = stateRef.current;
    if (isInputLocked(current)) {
      return;
    }

    clearLongPressTimer();
    resetDoubleTapTracking();

    const nextMode = !current.annotationMode;
    const next: GameState = {
      ...current,
      annotationMode: nextMode,
      fillModeValue: nextMode ? null : current.fillModeValue,
    };

    applyState(next);
  }, [applyState, clearLongPressTimer, isInputLocked, resetDoubleTapTracking]);

  const toggleFillModeForDigit = useCallback(
    (value: number) => {
      const current = stateRef.current;
      if (current.fillModeValue === value) {
        setFillMode(null);
      } else {
        setFillMode(value);
      }
    },
    [setFillMode],
  );

  const startNewGame = useCallback(
    (difficultyOverride?: Difficulty) => {
      const current = stashActiveSession(stateRef.current);
      const difficulty = difficultyOverride ?? current.difficulty;
      const stats = markCurrentGameAsLossIfNeeded(current);
      const { puzzle, solution, givens } = generatePuzzle(difficulty);

      const next: GameState = {
        ...current,
        mode: "standard",
        difficulty,
        hintsPerGame: current.configuredHintsPerGame,
        livesPerGame: current.configuredLivesPerGame,
        puzzle,
        solution,
        board: clone(puzzle),
        givens: buildGivens(puzzle),
        selected: null,
        highlightValue: null,
        fillModeValue: null,
        annotationMode: false,
        notes: createEmptyNotesBoard(),
        undoStack: [],
        redoStack: [],
        stats,
        winRecorded: false,
        currentGameStarted: false,
        hintsLeft: current.configuredHintsPerGame,
        livesLeft: current.configuredLivesPerGame,
        lost: false,
        won: false,
        dailyDate: null,
        dailySeed: null,
        standardSession: null,
      };

      applyState(next);
      setWinPromptOpen(false);
      setLosePromptOpen(false);
      setStatusMessage(`New ${difficulty} puzzle ready (${givens} givens).`);
    },
    [applyState],
  );

  const startDailyPuzzleAndOpen = useCallback(() => {
    const current = stashActiveSession(stateRef.current);
    const dayKey = getCurrentLocalDayKey();
    const difficulty = deriveDailyDifficulty(dayKey);
    const seed = getDailyPuzzleSeed(dayKey, difficulty);

    if (current.dailySession && current.dailySession.date === dayKey) {
      const next = applySessionToState(current, current.dailySession, "daily", { date: dayKey, seed });
      next.dailySession = null;
      applyState(next);
      setWinPromptOpen(false);
      setLosePromptOpen(false);
      setActiveView("game");

      if (next.won) {
        setStatusMessage(`Daily puzzle for ${dayKey} already solved.`);
      } else {
        setStatusMessage(`Daily ${difficulty} puzzle resumed for ${dayKey}.`);
      }
      return;
    }

    if (current.mode === "daily" && current.dailyDate === dayKey && current.puzzle && current.solution && current.board) {
      setActiveView("game");
      setWinPromptOpen(false);
      setLosePromptOpen(false);
      setStatusMessage(`Daily ${difficulty} puzzle resumed for ${dayKey}.`);
      return;
    }

    const { puzzle, solution, givens } = generatePuzzle(difficulty, { seed });

    const next: GameState = {
      ...current,
      mode: "daily",
      difficulty,
      hintsPerGame: current.configuredHintsPerGame,
      livesPerGame: current.configuredLivesPerGame,
      puzzle,
      solution,
      board: clone(puzzle),
      givens: buildGivens(puzzle),
      selected: null,
      highlightValue: null,
      fillModeValue: null,
      annotationMode: false,
      notes: createEmptyNotesBoard(),
      undoStack: [],
      redoStack: [],
      winRecorded: false,
      currentGameStarted: false,
      hintsLeft: current.configuredHintsPerGame,
      livesLeft: current.configuredLivesPerGame,
      lost: false,
      won: false,
      dailyDate: dayKey,
      dailySeed: seed,
      dailySession: null,
    };

    applyState(next);
    setWinPromptOpen(false);
    setLosePromptOpen(false);
    setActiveView("game");
    setStatusMessage(`Daily ${difficulty} puzzle ready for ${dayKey} (${givens} givens).`);
  }, [applyState]);

  const startNewGameAndOpen = useCallback(
    (difficultyOverride?: Difficulty) => {
      startNewGame(difficultyOverride);
      setActiveView("game");
    },
    [startNewGame],
  );

  const continueStandardPuzzle = useCallback(() => {
    const current = stateRef.current;

    if (current.mode === "standard") {
      setActiveView("game");
      return;
    }

    if (!current.standardSession) {
      startNewGameAndOpen();
      return;
    }

    const stashed = stashActiveSession(current);
    const standardSession = stashed.standardSession;
    if (!standardSession) {
      startNewGameAndOpen();
      return;
    }

    const next = applySessionToState(stashed, standardSession, "standard");
    next.standardSession = null;
    applyState(next);
    setWinPromptOpen(false);
    setLosePromptOpen(false);
    setActiveView("game");
    setStatusMessage(`Standard ${next.difficulty} puzzle resumed.`);
  }, [applyState, startNewGameAndOpen]);

  const continueDailyPuzzle = useCallback(() => {
    const current = stateRef.current;
    const dayKey = getCurrentLocalDayKey();
    const difficulty = deriveDailyDifficulty(dayKey);
    const seed = getDailyPuzzleSeed(dayKey, difficulty);

    if (current.mode === "daily" && current.dailyDate === dayKey && current.puzzle) {
      setActiveView("game");
      return;
    }

    if (current.dailySession && current.dailySession.date === dayKey) {
      const stashed = stashActiveSession(current);
      const dailySession = stashed.dailySession;
      if (!dailySession) {
        startDailyPuzzleAndOpen();
        return;
      }

      const next = applySessionToState(stashed, dailySession, "daily", { date: dayKey, seed });
      next.dailySession = null;
      applyState(next);
      setWinPromptOpen(false);
      setLosePromptOpen(false);
      setActiveView("game");
      setStatusMessage(`Daily ${difficulty} puzzle resumed for ${dayKey}.`);
      return;
    }

    startDailyPuzzleAndOpen();
  }, [applyState, startDailyPuzzleAndOpen]);

  const goHome = useCallback(() => {
    setWinPromptOpen(false);
    setLosePromptOpen(false);
    setActiveView("home");
    setStatusMessage((currentMessage) => pickHomeStatusMessage(currentMessage));
  }, []);

  const openSettingsView = useCallback(() => {
    setActiveView("settings");
  }, []);

  const openStatsView = useCallback(() => {
    setDailyCalendarMonthKey(getMonthKeyFromDate(new Date()));
    setActiveView("stats");
  }, []);

  const showPreviousDailyMonth = useCallback(() => {
    setDailyCalendarMonthKey((current) => shiftMonthKey(current, -1));
  }, []);

  const showNextDailyMonth = useCallback(() => {
    setDailyCalendarMonthKey((current) => shiftMonthKey(current, 1));
  }, []);

  const continueCurrentPuzzle = continueStandardPuzzle;

  const resetCurrentGame = useCallback(() => {
    const current = stateRef.current;
    if (!current.puzzle || !current.board) {
      return;
    }
    if (current.lost) {
      setStatusMessage("Out of lives. Start a new puzzle.");
      return;
    }

    const next: GameState = {
      ...current,
      board: clone(current.puzzle),
      selected: null,
      highlightValue: null,
      fillModeValue: null,
      annotationMode: false,
      notes: createEmptyNotesBoard(),
      won: false,
      lost: false,
      undoStack: [],
      redoStack: [],
      hintsLeft: current.hintsPerGame,
      livesLeft: current.livesPerGame,
    };

    applyState(next);
    setWinPromptOpen(false);
    setLosePromptOpen(false);
    setStatusMessage("Puzzle reset.");
  }, [applyState]);

  const applySelection = useCallback(
    (row: number, col: number) => {
      const current = stateRef.current;
      if (!current.board) {
        return;
      }

      const value = current.board[row][col];
      const next: GameState = {
        ...current,
        selected: { row, col },
        highlightValue: value === 0 ? null : value,
      };
      applyState(next);
    },
    [applyState],
  );

  const setCellValue = useCallback(
    (row: number, col: number, value: number) => {
      const current = stateRef.current;
      if (!current.board || !current.solution) {
        return;
      }
      if (isInputLocked(current) || current.givens.has(keyOf(row, col))) {
        return;
      }
      if (current.board[row][col] === value) {
        return;
      }

      let stats = current.stats;
      let currentGameStarted = current.currentGameStarted;
      if (value !== 0 && current.board[row][col] === 0 && !current.currentGameStarted) {
        stats = recordGameStart(current.stats, current.difficulty, current.mode, current.dailyDate);
        currentGameStarted = true;
      }

      const wrongEntry = value !== 0 && value !== current.solution[row][col];

      let undoStack = [...current.undoStack, createSnapshot(current)];
      if (undoStack.length > 300) {
        undoStack = undoStack.slice(-300);
      }

      const board = clone(current.board);
      board[row][col] = value;

      const notes = cloneNotesBoard(current.notes);
      if (value !== 0) {
        notes[row][col] = 0;
        if (!wrongEntry) {
          clearPeerNoteDigit(notes, board, row, col, value);
        }
      }

      let next: GameState = {
        ...current,
        board,
        notes,
        highlightValue: value === 0 ? null : value,
        undoStack,
        redoStack: [],
        stats,
        currentGameStarted,
      };

      next = syncFillModeAvailability(next);

      const solved = boardComplete(next.board);
      next.won = solved;
      if (solved && !current.won && !next.winRecorded) {
        next.stats = recordWin(next.stats, next.difficulty, next.mode, next.dailyDate);
        next.winRecorded = true;
        setWinPromptOpen(true);
      }

      if (wrongEntry) {
        if (!next.lost && next.livesLeft > 0) {
          next.livesLeft -= 1;
          if (next.livesLeft > 0) {
            const label = next.livesLeft === 1 ? "life" : "lives";
            setStatusMessage(`Wrong number. ${next.livesLeft} ${label} left.`);
          } else {
            next.lost = true;
            next.fillModeValue = null;
            next.stats = markCurrentGameAsLossIfNeeded(next);
            if (next.mode === "daily") {
              next.stats = recordDailyLoss(next.stats, next.difficulty, next.dailyDate);
            }
            setLosePromptOpen(true);
            setStatusMessage("Out of lives. Start a new puzzle.");
          }
        }
      } else if (!next.won) {
        setStatusMessage("Keep going.");
      }

      applyState(next);
    },
    [applyState, isInputLocked],
  );

  const applyNumberInput = useCallback(
    (value: number) => {
      const current = stateRef.current;
      if (!current.selected || isInputLocked(current)) {
        return;
      }

      const { row, col } = current.selected;
      if (current.annotationMode) {
        if (!current.board || current.givens.has(keyOf(row, col)) || current.board[row][col] !== 0) {
          return;
        }

        const currentMask = current.notes[row][col];
        let nextMask = currentMask;
        if (value === 0) {
          nextMask = 0;
        } else {
          nextMask = currentMask ^ noteBit(value);
        }

        if (nextMask === currentMask) {
          return;
        }

        let undoStack = [...current.undoStack, createSnapshot(current)];
        if (undoStack.length > 300) {
          undoStack = undoStack.slice(-300);
        }

        const notes = cloneNotesBoard(current.notes);
        notes[row][col] = nextMask;

        const next: GameState = {
          ...current,
          notes,
          undoStack,
          redoStack: [],
        };

        applyState(next);
        return;
      }

      setCellValue(row, col, value);
    },
    [applyState, isInputLocked, setCellValue],
  );

  const undoMove = useCallback(() => {
    const current = stateRef.current;
    if (current.undoStack.length === 0 || !current.board) {
      return;
    }

    const snapshot = current.undoStack[current.undoStack.length - 1];
    const redoSnapshot = createSnapshot(current);

    let next: GameState = {
      ...current,
      board: clone(snapshot.board),
      notes: cloneNotesBoard(snapshot.notes),
      selected: snapshot.selected ? { ...snapshot.selected } : null,
      highlightValue: snapshot.highlightValue,
      won: snapshot.won,
      undoStack: current.undoStack.slice(0, -1),
      redoStack: [...current.redoStack, redoSnapshot],
    };

    next = syncFillModeAvailability(next);
    applyState(next);
  }, [applyState]);

  const redoMove = useCallback(() => {
    const current = stateRef.current;
    if (current.redoStack.length === 0 || !current.board) {
      return;
    }

    const snapshot = current.redoStack[current.redoStack.length - 1];
    const undoSnapshot = createSnapshot(current);

    let next: GameState = {
      ...current,
      board: clone(snapshot.board),
      notes: cloneNotesBoard(snapshot.notes),
      selected: snapshot.selected ? { ...snapshot.selected } : null,
      highlightValue: snapshot.highlightValue,
      won: snapshot.won,
      undoStack: [...current.undoStack, undoSnapshot],
      redoStack: current.redoStack.slice(0, -1),
    };

    next = syncFillModeAvailability(next);
    applyState(next);
  }, [applyState]);

  const moveSelection = useCallback(
    (deltaRow: number, deltaCol: number) => {
      const current = stateRef.current;
      if (!current.board || isInputLocked(current)) {
        return;
      }

      const base = current.selected ?? { row: 0, col: 0 };
      let row = (base.row + deltaRow + 9) % 9;
      let col = (base.col + deltaCol + 9) % 9;

      for (let tries = 0; tries < 81; tries += 1) {
        if (!current.givens.has(keyOf(row, col))) {
          const next: GameState = {
            ...current,
            selected: { row, col },
          };
          applyState(next);
          return;
        }
        col = (col + 1) % 9;
        if (col === 0) {
          row = (row + 1) % 9;
        }
      }
    },
    [applyState, isInputLocked],
  );

  const handleHint = useCallback(() => {
    const current = stateRef.current;
    if (!current.board || !current.solution || current.hintsLeft <= 0 || isInputLocked(current)) {
      return;
    }

    const hintCell = pickHintCell(current);
    if (!hintCell) {
      setStatusMessage("No empty cell available for a hint.");
      return;
    }

    let stats = current.stats;
    let currentGameStarted = current.currentGameStarted;
    if (!current.currentGameStarted) {
      stats = recordGameStart(current.stats, current.difficulty, current.mode, current.dailyDate);
      currentGameStarted = true;
    }

    let undoStack = [...current.undoStack, createSnapshot(current)];
    if (undoStack.length > 300) {
      undoStack = undoStack.slice(-300);
    }

    const board = clone(current.board);
    const hintValue = current.solution[hintCell.row][hintCell.col];
    board[hintCell.row][hintCell.col] = hintValue;
    const notes = cloneNotesBoard(current.notes);
    notes[hintCell.row][hintCell.col] = 0;
    clearPeerNoteDigit(notes, board, hintCell.row, hintCell.col, hintValue);

    let next: GameState = {
      ...current,
      board,
      notes,
      selected: { ...hintCell },
      highlightValue: hintValue,
      hintsLeft: current.hintsLeft - 1,
      undoStack,
      redoStack: [],
      stats,
      currentGameStarted,
    };

    next = syncFillModeAvailability(next);

    const solved = boardComplete(next.board);
    next.won = solved;
    if (solved && !current.won && !next.winRecorded) {
      next.stats = recordWin(next.stats, next.difficulty, next.mode, next.dailyDate);
      next.winRecorded = true;
      setWinPromptOpen(true);
    }

    applyState(next);
    if (!next.won) {
      setStatusMessage("Hint revealed.");
    }
  }, [applyState, isInputLocked]);

  const handleDoubleTapEntry = useCallback(
    (value: number) => {
      const now = Date.now();
      const isSecondTap = lastTapDigitRef.current === value && now - lastTapAtRef.current <= DOUBLE_TAP_MS;

      if (isSecondTap) {
        resetDoubleTapTracking();
        toggleFillModeForDigit(value);
        return;
      }

      lastTapDigitRef.current = value;
      lastTapAtRef.current = now;

      clearPendingTapTimer();
      pendingTapTimerRef.current = window.setTimeout(() => {
        pendingTapTimerRef.current = null;
        const current = stateRef.current;
        if (current.fillModeEntry === "double-tap" && current.fillModeValue === null) {
          applyNumberInput(value);
        }
        if (lastTapDigitRef.current === value) {
          lastTapDigitRef.current = null;
          lastTapAtRef.current = 0;
        }
      }, DOUBLE_TAP_MS);
    },
    [applyNumberInput, clearPendingTapTimer, resetDoubleTapTracking, toggleFillModeForDigit],
  );

  const onBoardCellSelect = useCallback(
    ({ row, col }: SudokuBoardCell) => {
      const current = stateRef.current;
      if (current.lost || !current.board) {
        return;
      }

      if (!current.annotationMode && current.fillModeValue !== null && !isInputLocked(current)) {
        if (!current.givens.has(keyOf(row, col)) && current.board[row][col] === 0) {
          const next: GameState = {
            ...current,
            selected: { row, col },
          };
          applyState(next);
          setCellValue(row, col, current.fillModeValue);
          return;
        }
      }

      applySelection(row, col);
    },
    [applySelection, applyState, isInputLocked, setCellValue],
  );

  const onNumpadClick = useCallback(
    (event: ReactMouseEvent<HTMLElement>) => {
      const current = stateRef.current;
      if (current.lost) {
        return;
      }

      const button = (event.target as HTMLElement).closest<HTMLButtonElement>("button[data-value]");
      if (!button || button.disabled) {
        return;
      }

      if (longPressTriggeredRef.current) {
        longPressTriggeredRef.current = false;
        return;
      }

      const value = Number(button.dataset.value);
      if (value < 1 || value > 9) {
        return;
      }

      if (current.annotationMode) {
        applyNumberInput(value);
        return;
      }

      if (current.fillModeEntry === "double-tap") {
        handleDoubleTapEntry(value);
        return;
      }

      if (current.fillModeValue !== null) {
        return;
      }

      applyNumberInput(value);
    },
    [applyNumberInput, handleDoubleTapEntry],
  );

  const onNumpadPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      const current = stateRef.current;
      if (current.lost || current.annotationMode || current.fillModeEntry !== "long-press") {
        return;
      }

      const button = (event.target as HTMLElement).closest<HTMLButtonElement>("button[data-value]");
      if (!button || button.disabled) {
        return;
      }

      event.preventDefault();

      const value = Number(button.dataset.value);
      if (value < 1 || value > 9) {
        return;
      }

      longPressTriggeredRef.current = false;
      clearLongPressTimer();
      longPressTimerRef.current = window.setTimeout(() => {
        toggleFillModeForDigit(value);
        longPressTriggeredRef.current = true;
        clearLongPressTimer();
      }, 430);
    },
    [clearLongPressTimer, toggleFillModeForDigit],
  );

  const onNumpadPointerRelease = useCallback(() => {
    clearLongPressTimer();
  }, [clearLongPressTimer]);

  const closeWinPrompt = useCallback(() => {
    setWinPromptOpen(false);
  }, []);

  const closeLosePrompt = useCallback(() => {
    setLosePromptOpen(false);
  }, []);

  const onWinNewGame = useCallback(() => {
    closeWinPrompt();
    startNewGameAndOpen();
  }, [closeWinPrompt, startNewGameAndOpen]);

  const onWinHome = useCallback(() => {
    goHome();
  }, [goHome]);

  const onWinViewBoard = useCallback(() => {
    closeWinPrompt();
    setActiveView("game");
  }, [closeWinPrompt]);

  const restartCurrentPuzzle = useCallback(() => {
    const current = stateRef.current;
    if (!current.puzzle || !current.solution || !current.board) {
      return;
    }

    const next: GameState = {
      ...current,
      board: clone(current.puzzle),
      selected: null,
      highlightValue: null,
      fillModeValue: null,
      annotationMode: false,
      notes: createEmptyNotesBoard(),
      undoStack: [],
      redoStack: [],
      stats: recordGameStart(current.stats, current.difficulty, current.mode, current.dailyDate),
      currentGameStarted: true,
      hintsLeft: current.hintsPerGame,
      livesLeft: current.livesPerGame,
      lost: false,
      won: false,
      winRecorded: false,
    };

    applyState(next);
    setLosePromptOpen(false);
    setWinPromptOpen(false);
    setActiveView("game");
    setStatusMessage("Puzzle restarted.");
  }, [applyState]);

  const onLoseNewGame = useCallback(() => {
    closeLosePrompt();
    startNewGameAndOpen();
  }, [closeLosePrompt, startNewGameAndOpen]);

  const onLoseHome = useCallback(() => {
    goHome();
  }, [goHome]);

  const onLoseViewBoard = useCallback(() => {
    closeLosePrompt();
    setActiveView("game");
  }, [closeLosePrompt]);

  const onLoseRestart = useCallback(() => {
    restartCurrentPuzzle();
  }, [restartCurrentPuzzle]);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    syncDialogState(winDialogRef.current, winPromptOpen);
  }, [winPromptOpen]);

  useEffect(() => {
    syncDialogState(loseDialogRef.current, losePromptOpen);
  }, [losePromptOpen]);

  useEffect(() => {
    document.documentElement.dataset.theme = state.theme;
    const themeMeta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (themeMeta) {
      themeMeta.setAttribute("content", THEME_COLORS[state.theme]);
    }
  }, [state.theme]);

  useEffect(() => {
    const syncViewportHeight = () => {
      const viewportHeight = window.visualViewport ? window.visualViewport.height : window.innerHeight;
      if (viewportHeight > 0) {
        document.documentElement.style.setProperty("--app-vh", `${viewportHeight * 0.01}px`);
      }
    };

    syncViewportHeight();
    window.addEventListener("resize", syncViewportHeight);
    window.addEventListener("orientationchange", syncViewportHeight);
    window.addEventListener("pageshow", syncViewportHeight);
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", syncViewportHeight);
      window.visualViewport.addEventListener("scroll", syncViewportHeight);
    }

    return () => {
      window.removeEventListener("resize", syncViewportHeight);
      window.removeEventListener("orientationchange", syncViewportHeight);
      window.removeEventListener("pageshow", syncViewportHeight);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener("resize", syncViewportHeight);
        window.visualViewport.removeEventListener("scroll", syncViewportHeight);
      }
    };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNowTick(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    const restored = loadSavedGame();
    if (restored) {
      applyState(restored);
    }
    setStatusMessage((currentMessage) => pickHomeStatusMessage(currentMessage));
    setIsHydrated(true);
  }, [applyState]);

  useEffect(() => {
    if (!isHydrated || !state.puzzle || !state.solution || !state.board) {
      return;
    }

    const saveState = stashActiveSession(state);

    const payload: SavedGamePayload = {
      mode: saveState.mode,
      difficulty: state.difficulty,
      configuredHintsPerGame: state.configuredHintsPerGame,
      configuredLivesPerGame: state.configuredLivesPerGame,
      puzzle: state.puzzle,
      solution: state.solution,
      board: state.board,
      hintsPerGame: state.hintsPerGame,
      livesPerGame: state.livesPerGame,
      hintsLeft: state.hintsLeft,
      livesLeft: state.livesLeft,
      annotationMode: state.annotationMode,
      notes: state.notes,
      showMistakes: state.showMistakes,
      fillModeEntry: state.fillModeEntry,
      theme: state.theme,
      stats: state.stats,
      won: state.won,
      lost: state.lost,
      currentGameStarted: state.currentGameStarted,
      dailyDate: saveState.dailyDate,
      dailySeed: saveState.dailySeed,
      standardSession: serializeSession(saveState.standardSession),
      dailySession: serializeDailySession(saveState.dailySession),
    };

    try {
      window.localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
    } catch {
      setStatusMessage("Autosave is unavailable in this browser.");
    }
  }, [isHydrated, state]);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      setUpdateStatus("Updates unavailable in this browser.");
      return;
    }

    if (process.env.NODE_ENV !== "production") {
      setUpdateStatus("Service worker disabled in development.");

      navigator.serviceWorker.getRegistrations()
        .then((registrations) => Promise.all(registrations.map((registration) => registration.unregister())))
        .catch(() => undefined);

      if ("caches" in window) {
        window.caches.keys()
          .then((cacheKeys) => Promise.all(cacheKeys.map((cacheKey) => window.caches.delete(cacheKey))))
          .catch(() => undefined);
      }

      return;
    }

    const onControllerChange = () => {
      if (reloadTriggeredByUpdateRef.current) {
        return;
      }
      reloadTriggeredByUpdateRef.current = true;
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    const registerServiceWorker = () => {
      navigator.serviceWorker
        .register("./sw.js")
        .then((registration) => {
          setUpdateStatus(registration.waiting ? "Update available." : "Updates are active.");

          registration.addEventListener("updatefound", () => {
            const newWorker = registration.installing;
            if (!newWorker) {
              return;
            }

            setUpdateStatus("Downloading update...");
            newWorker.addEventListener("statechange", () => {
              if (newWorker.state === "installed") {
                if (navigator.serviceWorker.controller) {
                  setUpdateStatus("Update available. Restart app to apply.");
                } else {
                  setUpdateStatus("Updates are active.");
                }
              }
            });
          });
        })
        .catch(() => {
          setStatusMessage("Puzzle app works, but offline mode could not be enabled.");
          setUpdateStatus("Service worker setup failed.");
        });
    };

    if (document.readyState === "complete") {
      registerServiceWorker();
    } else {
      window.addEventListener("load", registerServiceWorker, { once: true });
    }

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
      window.removeEventListener("load", registerServiceWorker);
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (activeView !== "game") {
        return;
      }

      const current = stateRef.current;
      if (!current.board) {
        return;
      }
      if (winPromptOpen || losePromptOpen) {
        return;
      }
      if (current.lost) {
        return;
      }

      if (event.key >= "1" && event.key <= "9") {
        applyNumberInput(Number(event.key));
        return;
      }

      if (!event.metaKey && !event.ctrlKey && event.key.toLowerCase() === "n") {
        event.preventDefault();
        toggleAnnotationMode();
        return;
      }

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) {
          redoMove();
        } else {
          undoMove();
        }
        return;
      }

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "y") {
        event.preventDefault();
        redoMove();
        return;
      }

      if (event.key === "Escape" && current.fillModeValue !== null) {
        setFillMode(null);
        return;
      }

      if (event.key === "Backspace" || event.key === "Delete" || event.key === "0") {
        applyNumberInput(0);
        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        moveSelection(-1, 0);
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        moveSelection(1, 0);
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        moveSelection(0, -1);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        moveSelection(0, 1);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [
    applyNumberInput,
    losePromptOpen,
    moveSelection,
    redoMove,
    setFillMode,
    toggleAnnotationMode,
    undoMove,
    winPromptOpen,
    activeView,
  ]);

  useEffect(() => {
    return () => {
      clearLongPressTimer();
      clearPendingTapTimer();
    };
  }, [clearLongPressTimer, clearPendingTapTimer]);

  const highlighted = state.fillModeValue !== null ? state.fillModeValue : state.highlightValue;
  const showSelectionHighlights = state.fillModeValue === null;
  const currentSessionSnapshot = useMemo(() => captureSessionFromState(state), [state]);
  const todayDailyKey = useMemo(() => getCurrentLocalDayKey(nowTick), [nowTick]);
  const todayDailyDifficulty = useMemo(() => deriveDailyDifficulty(todayDailyKey), [todayDailyKey]);
  const todayDailySeed = useMemo(() => getDailyPuzzleSeed(todayDailyKey, todayDailyDifficulty), [todayDailyDifficulty, todayDailyKey]);

  const standardSessionForHome = useMemo(() => {
    if (state.mode === "standard") {
      return currentSessionSnapshot;
    }
    return state.standardSession;
  }, [currentSessionSnapshot, state.mode, state.standardSession]);

  const dailySessionForToday = useMemo(() => {
    if (state.mode === "daily" && state.dailyDate === todayDailyKey && currentSessionSnapshot) {
      return {
        ...currentSessionSnapshot,
        date: state.dailyDate,
        seed: state.dailySeed ?? todayDailySeed,
      } satisfies DailySessionSnapshot;
    }

    if (state.dailySession && state.dailySession.date === todayDailyKey) {
      return state.dailySession;
    }

    return null;
  }, [currentSessionSnapshot, state.dailyDate, state.dailySeed, state.dailySession, state.mode, todayDailyKey, todayDailySeed]);

  const boardGivens = useMemo(() => givensSetToBooleanBoard(state.givens), [state.givens]);
  const boardNotes = useMemo(() => noteMaskBoardToDigitsBoard(state.notes), [state.notes]);
  const invalidCells = useMemo(() => {
    if (!state.showMistakes || !state.board || !state.solution) {
      return undefined;
    }

    return state.board.map((rowValues, row) =>
      rowValues.map((value, col) => {
        if (value === 0 || state.givens.has(keyOf(row, col))) {
          return false;
        }
        return value !== state.solution?.[row]?.[col];
      }),
    );
  }, [state.board, state.givens, state.showMistakes, state.solution]);
  const canContinueCurrentPuzzle = isSessionContinuable(standardSessionForHome);
  const canContinueDailyPuzzle = isSessionContinuable(dailySessionForToday);
  const dailyCompletedToday = Boolean(dailySessionForToday?.won);
  const dailyButtonLabel = dailyCompletedToday
    ? `Next daily puzzle in ${formatCountdownToNextDaily(nowTick)}`
    : "Daily Puzzle";

  const statsOverall = formatLine(state.stats.gamesWon, state.stats.gamesStarted);
  const statsEasy = formatLine(state.stats.byDifficulty.easy.won, state.stats.byDifficulty.easy.started);
  const statsMedium = formatLine(state.stats.byDifficulty.medium.won, state.stats.byDifficulty.medium.started);
  const statsHard = formatLine(state.stats.byDifficulty.hard.won, state.stats.byDifficulty.hard.started);
  const statsOverallRate = calculateRatePercent(state.stats.gamesWon, state.stats.gamesStarted);
  const statsOverallAngle = (statsOverallRate / 100) * 360;
  const statsOverallUnfinished = Math.max(0, state.stats.gamesStarted - state.stats.gamesWon);
  const dailyStatsOverall = formatLine(state.stats.daily.gamesWon, state.stats.daily.gamesStarted);
  const todayCalendarFallbackEntry = useMemo<DailyHistoryEntry | null>(() => {
    if (!dailySessionForToday) {
      return null;
    }

    if (dailySessionForToday.won) {
      return { result: "won", difficulty: todayDailyDifficulty };
    }

    if (dailySessionForToday.lost) {
      return { result: "lost", difficulty: todayDailyDifficulty };
    }

    return null;
  }, [dailySessionForToday, todayDailyDifficulty]);

  const effectiveDailyHistory = useMemo(() => {
    const history = { ...state.stats.daily.historyByDate };
    if (todayCalendarFallbackEntry && !history[todayDailyKey]) {
      history[todayDailyKey] = todayCalendarFallbackEntry;
    }
    return history;
  }, [state.stats.daily.historyByDate, todayCalendarFallbackEntry, todayDailyKey]);

  const dailyCalendarCells = useMemo(
    () => buildDailyCalendarCells(dailyCalendarMonthKey, todayDailyKey, effectiveDailyHistory),
    [dailyCalendarMonthKey, effectiveDailyHistory, todayDailyKey],
  );
  const dailyCalendarMonthLabel = useMemo(() => {
    const { year, month } = parseMonthKey(dailyCalendarMonthKey);
    return new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(new Date(year, month, 1));
  }, [dailyCalendarMonthKey]);
  const dailyMonthSummary = useMemo(() => {
    let won = 0;
    let lost = 0;

    for (const cell of dailyCalendarCells) {
      if (!cell.isCurrentMonth || !cell.entry) {
        continue;
      }
      if (cell.entry.result === "won") {
        won += 1;
      } else {
        lost += 1;
      }
    }

    return { won, lost };
  }, [dailyCalendarCells]);
  const difficultyRateRows: Array<{
    key: Difficulty;
    label: string;
    line: string;
    rate: number;
    rateText: string;
  }> = [
    {
      key: "easy",
      label: "Easy",
      line: statsEasy,
      rate: calculateRatePercent(state.stats.byDifficulty.easy.won, state.stats.byDifficulty.easy.started),
      rateText: formatRate(state.stats.byDifficulty.easy.won, state.stats.byDifficulty.easy.started),
    },
    {
      key: "medium",
      label: "Medium",
      line: statsMedium,
      rate: calculateRatePercent(state.stats.byDifficulty.medium.won, state.stats.byDifficulty.medium.started),
      rateText: formatRate(state.stats.byDifficulty.medium.won, state.stats.byDifficulty.medium.started),
    },
    {
      key: "hard",
      label: "Hard",
      line: statsHard,
      rate: calculateRatePercent(state.stats.byDifficulty.hard.won, state.stats.byDifficulty.hard.started),
      rateText: formatRate(state.stats.byDifficulty.hard.won, state.stats.byDifficulty.hard.started),
    },
  ];

  const livesText = useMemo(() => {
    const symbols = [] as Array<{ key: string; text: string; className: string }>;
    for (let i = 0; i < state.livesPerGame; i += 1) {
      if (i < state.livesLeft) {
        symbols.push({ key: `life-${i}`, text: "\u2665", className: "lives-heart" });
      } else {
        symbols.push({ key: `life-${i}`, text: "\u2022", className: "lives-miss" });
      }
    }
    return symbols;
  }, [state.livesLeft, state.livesPerGame]);

  return (
    <>
      <main className={`app ${activeView === "home" ? "app-home" : activeView === "game" ? "app-game" : "app-panel"}`}>
        {activeView === "home" ? (
          <section className="home-view" aria-label="Home menu">
            <h1 className="view-title">Sudoku</h1>
            <div className="home-actions" aria-label="Main actions">
              {canContinueCurrentPuzzle ? (
                <button id="continue-current-puzzle" type="button" onClick={continueCurrentPuzzle}>
                  Continue Standard
                </button>
              ) : null}
              {canContinueDailyPuzzle && !dailyCompletedToday ? (
                <button id="continue-daily-puzzle" type="button" onClick={continueDailyPuzzle}>
                  Continue Daily
                </button>
              ) : null}
              <button id="new-game" type="button" onClick={() => startNewGameAndOpen()}>
                New Puzzle
              </button>
              <button
                id="daily-game"
                type="button"
                disabled={dailyCompletedToday}
                onClick={startDailyPuzzleAndOpen}
              >
                {dailyCompletedToday ? dailyButtonLabel : `Daily Puzzle (${todayDailyDifficulty})`}
              </button>
              <button id="settings-open" type="button" onClick={openSettingsView}>
                Settings
              </button>
              <button id="stats-open" type="button" onClick={openStatsView}>
                Statistics
              </button>
            </div>
            <p className="home-status" aria-live="polite">{statusMessage}</p>
          </section>
        ) : activeView === "game" ? (
          <>
            <div className="game-header" aria-label="Puzzle header">
              <button id="reset-game" type="button" disabled={state.lost} onClick={resetCurrentGame}>
                Reset
              </button>
              <h2 className="game-title">Sudoku</h2>
              <button id="home-button" type="button" onClick={goHome}>
                Home
              </button>
            </div>

            <section className="board-wrap" aria-label="Sudoku board">
              <div className="board-area">
                <div className="board-stack">
                  <div className="game-subbar" aria-label="Puzzle quick actions">
                    <div className="game-subbar-left">
                      <button id="undo" type="button" title="Undo" disabled={state.lost || state.undoStack.length === 0} onClick={undoMove}>
                        Undo
                      </button>
                      <button id="redo" type="button" title="Redo" disabled={state.lost || state.redoStack.length === 0} onClick={redoMove}>
                        Redo
                      </button>
                    </div>
                    <p
                      id="lives"
                      className={`lives${state.livesLeft === 0 ? " empty" : ""}`}
                      aria-label={`Lives ${state.livesLeft} of ${state.livesPerGame}`}
                    >
                      <span id="lives-display">
                        {livesText.map((entry) => (
                          <span key={entry.key} className={entry.className}>
                            {entry.text}
                          </span>
                        ))}
                      </span>
                    </p>
                    <div className="game-subbar-right">
                      <button
                        id="annotation-mode"
                        type="button"
                        disabled={isInputLocked(state)}
                        className={state.annotationMode ? "annotation-enabled" : ""}
                        aria-pressed={state.annotationMode}
                        onClick={toggleAnnotationMode}
                      >
                        Notes
                      </button>
                      <button id="hint" type="button" disabled={state.hintsLeft <= 0 || isInputLocked(state)} onClick={handleHint}>
                        Hint (<span id="hints-left">{state.hintsLeft}</span>)
                      </button>
                    </div>
                  </div>

                  {state.board ? (
                    <SudokuBoard
                      id="board"
                      className="pwa-board-theme"
                      values={state.board}
                      notes={boardNotes}
                      givens={boardGivens}
                      selectedCell={state.selected}
                      highlightedDigit={highlighted}
                      invalidCells={invalidCells}
                      showSelectionHighlights={showSelectionHighlights}
                      onSelectCell={onBoardCellSelect}
                    />
                  ) : null}

                  <section
                    className={`numpad${state.fillModeValue !== null ? " fill-mode-active" : ""}${state.annotationMode ? " annotation-mode-active" : ""}`}
                    aria-label="Number input"
                    onClick={onNumpadClick}
                    onPointerDown={onNumpadPointerDown}
                    onPointerUp={onNumpadPointerRelease}
                    onPointerLeave={onNumpadPointerRelease}
                    onPointerCancel={onNumpadPointerRelease}
                  >
                    {DIGITS.map((digit) => {
                      const disabled = state.lost || isDigitCompletedCorrectly(state, digit);
                      const isFillMode = state.fillModeValue !== null && state.fillModeValue === digit;
                      const isAnnotationMode = state.annotationMode;
                      const isCompleted = countDigitOnBoard(state.board, digit) >= 9;

                      return (
                        <button
                          key={digit}
                          type="button"
                          data-value={digit}
                          disabled={disabled}
                          className={isFillMode ? "fill-mode" : isAnnotationMode ? "annotation-mode" : ""}
                          aria-label={isCompleted ? `Number ${digit} completed` : `Number ${digit}`}
                        >
                          {digit}
                        </button>
                      );
                    })}
                  </section>
                </div>
              </div>
            </section>
          </>
        ) : activeView === "settings" ? (
          <section className="panel-view settings-view" aria-label="Puzzle settings">
            <div className="settings-card">
              <div className="settings-header">
                <h2>Settings</h2>
                <button id="settings-close" type="button" onClick={goHome}>
                  Home
                </button>
              </div>
              <div className="settings-grid">
                <div className="settings-row">
                  <label htmlFor="difficulty">Difficulty</label>
                  <div className="settings-control">
                    <select
                      id="difficulty"
                      value={state.difficulty}
                      onChange={(event) => {
                        const difficulty = event.target.value as Difficulty;
                        const current = stateRef.current;
                        applyState({ ...current, difficulty });
                        setStatusMessage(`Difficulty set to ${difficulty}.`);
                      }}
                    >
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                  </div>
                </div>

                <div className="settings-row">
                  <label htmlFor="hints-per-game">Hints per game</label>
                  <div className="settings-control">
                    <select
                      id="hints-per-game"
                      value={state.configuredHintsPerGame}
                      onChange={(event) => {
                        const hintsPerGame = normalizePerGameCount(
                          Number(event.target.value),
                          MIN_HINTS_PER_GAME,
                          MAX_HINTS_PER_GAME,
                          DEFAULT_HINTS_PER_GAME,
                        );
                        const current = stateRef.current;
                        applyState({ ...current, configuredHintsPerGame: hintsPerGame });
                        setStatusMessage(`Hints per game set to ${hintsPerGame}. Applies to new puzzles.`);
                      }}
                    >
                      {HINT_OPTIONS.map((count) => (
                        <option key={`hints-${count}`} value={count}>{count}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="settings-row">
                  <label htmlFor="lives-per-game">Lives per game</label>
                  <div className="settings-control">
                    <select
                      id="lives-per-game"
                      value={state.configuredLivesPerGame}
                      onChange={(event) => {
                        const livesPerGame = normalizePerGameCount(
                          Number(event.target.value),
                          MIN_LIVES_PER_GAME,
                          MAX_LIVES_PER_GAME,
                          DEFAULT_LIVES_PER_GAME,
                        );
                        const current = stateRef.current;
                        applyState({ ...current, configuredLivesPerGame: livesPerGame });
                        setStatusMessage(`Lives per game set to ${livesPerGame}. Applies to new puzzles.`);
                      }}
                    >
                      {LIVES_OPTIONS.map((count) => (
                        <option key={`lives-${count}`} value={count}>{count}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="settings-row">
                  <label htmlFor="fill-mode-entry">Fill mode trigger</label>
                  <div className="settings-control">
                    <select
                      id="fill-mode-entry"
                      value={state.fillModeEntry}
                      onChange={(event) => {
                        const entry = event.target.value as FillModeEntry;
                        const current = stateRef.current;
                        applyState({ ...current, fillModeEntry: entry });
                        clearLongPressTimer();
                        resetDoubleTapTracking();
                      }}
                    >
                      <option value="long-press">Long press</option>
                      <option value="double-tap">Double tap</option>
                    </select>
                  </div>
                </div>

                <div className="settings-row">
                  <label htmlFor="theme">Theme</label>
                  <div className="settings-control">
                    <select
                      id="theme"
                      value={state.theme}
                      onChange={(event) => {
                        const current = stateRef.current;
                        const nextTheme = normalizeTheme(event.target.value);
                        applyState({ ...current, theme: nextTheme });
                      }}
                    >
                      <option value="slate">Slate</option>
                      <option value="dusk">Dusk</option>
                      <option value="mist">Mist</option>
                      <option value="amber">Amber</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="settings-footer" aria-label="App info and update status">
                <p className="app-info-inline">
                  <span id="app-info-name">{APP_NAME}</span>
                  {" "}
                  <span id="app-info-version">{APP_VERSION}</span>
                  {" "}
                  by <span id="app-info-author">{APP_AUTHOR}</span>
                </p>
                <p className="app-update-status">{updateStatus || "Update checks active."}</p>
              </div>
            </div>
          </section>
        ) : (
          <section className="panel-view stats-view" aria-label="Puzzle stats">
            <div className="stats-card">
              <div className="settings-header">
                <h2>Statistics</h2>
                <button id="stats-close" type="button" onClick={goHome}>
                  Home
                </button>
              </div>
              <section className="stats" aria-label="Puzzle stats">
                <section className="stats-panel stats-panel-overall" aria-label="Overall finished puzzles">
                  <h3>Overall Finished</h3>
                  <div className="stats-overview-grid">
                    <div
                      className="stats-pie-chart"
                      role="img"
                      aria-label={`Overall finished ${formatRate(state.stats.gamesWon, state.stats.gamesStarted)}`}
                      style={{
                        background:
                          `conic-gradient(var(--stats-finished) 0deg ${statsOverallAngle}deg, var(--stats-unfinished) ${statsOverallAngle}deg 360deg)`,
                      }}
                    >
                      <span className="stats-pie-center">{formatRate(state.stats.gamesWon, state.stats.gamesStarted)}</span>
                    </div>
                    <div className="stats-overview-lines">
                      <p className="stats-overview-combo">
                        <span>
                          Overall:
                          {" "}
                          <span id="stats-overall">{statsOverall}</span>
                        </span>
                        <span>
                          <span className="stats-flame" aria-hidden="true">
                            🔥
                          </span>
                          {" "}
                          Streak:
                          {" "}
                          <span id="stats-streak">{state.stats.currentStreak}</span>
                          {" "}
                          (best
                          {" "}
                          <span id="stats-best-streak">{state.stats.bestStreak}</span>
                          )
                        </span>
                      </p>
                      <ul className="stats-pie-legend" aria-label="Overall puzzle legend">
                        <li>
                          <span className="stats-legend-swatch solved" aria-hidden="true" />
                          Won:
                          {" "}
                          {state.stats.gamesWon}
                        </li>
                        <li>
                          <span className="stats-legend-swatch unfinished" aria-hidden="true" />
                          Lost:
                          {" "}
                          {statsOverallUnfinished}
                        </li>
                      </ul>
                    </div>
                  </div>
                </section>

                <section className="stats-panel stats-panel-difficulty" aria-label="Win rate by difficulty">
                  <h3>Difficulty Win Rate</h3>
                  <div className="stats-bars" role="img" aria-label="Difficulty win rate bar chart">
                    {difficultyRateRows.map((entry) => (
                      <div key={entry.key} className="stats-bar-row">
                        <div className="stats-bar-head">
                          <span className="stats-bar-title">{entry.label}</span>
                          <span className="stats-bar-rate">{entry.rateText}</span>
                        </div>
                        <div className="stats-bar-track">
                          <div className={`stats-bar-fill stats-bar-fill-${entry.key}`} style={{ width: `${entry.rate}%` }} />
                        </div>
                        <p className="stats-bar-line">
                          <span id={`stats-${entry.key}`}>{entry.line}</span>
                        </p>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="stats-panel" aria-label="Daily puzzle stats">
                  <h3>Daily Challenge</h3>
                  <div className="daily-summary-line">
                    <span>
                      Today:
                      {" "}
                      <span id="stats-daily-today">{todayDailyKey}</span>
                      {" "}
                      ({todayDailyDifficulty})
                    </span>
                    <span id="stats-daily-overall">{dailyStatsOverall}</span>
                  </div>
                  <div className="daily-summary-line">
                    <span>{`Played: ${state.stats.daily.gamesStarted}`}</span>
                    <span>{`Won: ${state.stats.daily.gamesWon}`}</span>
                    <span>{`Lost: ${Math.max(0, state.stats.daily.gamesStarted - state.stats.daily.gamesWon)}`}</span>
                  </div>
                  <div className="daily-summary-line">
                    <span>
                      Streak:
                      {" "}
                      <span id="stats-daily-streak">{state.stats.daily.currentStreak}</span>
                      {" "}
                      (best
                      {" "}
                      <span id="stats-daily-best-streak">{state.stats.daily.bestStreak}</span>
                      )
                    </span>
                    <span>{`Month W/L: ${dailyMonthSummary.won}/${dailyMonthSummary.lost}`}</span>
                  </div>

                  <div className="daily-calendar-header">
                    <button
                      id="daily-calendar-prev"
                      type="button"
                      aria-label="Previous month"
                      onClick={showPreviousDailyMonth}
                    >
                      ←
                    </button>
                    <p className="daily-calendar-month">{dailyCalendarMonthLabel}</p>
                    <button
                      id="daily-calendar-next"
                      type="button"
                      aria-label="Next month"
                      onClick={showNextDailyMonth}
                    >
                      →
                    </button>
                  </div>

                  <div className="daily-calendar-weekdays" aria-hidden="true">
                    {WEEKDAY_SHORT_LABELS.map((day) => (
                      <span key={`weekday-${day}`}>{day}</span>
                    ))}
                  </div>

                  <div className="daily-calendar-grid" role="grid" aria-label={`Daily result calendar for ${dailyCalendarMonthLabel}`}>
                    {dailyCalendarCells.map((cell) => {
                      const classNames = ["daily-calendar-day"];
                      if (!cell.isCurrentMonth) {
                        classNames.push("outside-month");
                      }
                      if (cell.entry?.result === "won") {
                        classNames.push("won");
                      } else if (cell.entry?.result === "lost") {
                        classNames.push("lost");
                      }
                      if (cell.isToday) {
                        classNames.push("today");
                      }

                      const difficultyBadge = cell.entry ? cell.entry.difficulty[0].toUpperCase() : null;

                      return (
                        <div
                          key={cell.key}
                          className={classNames.join(" ")}
                          role="gridcell"
                          aria-label={formatDailyEntryLabel(cell.key, cell.entry, cell.isToday)}
                        >
                          <span className="daily-calendar-day-number">{cell.dateNumber}</span>
                          {difficultyBadge ? <span className="daily-calendar-day-difficulty">{difficultyBadge}</span> : null}
                        </div>
                      );
                    })}
                  </div>

                  <div className="daily-calendar-legend" aria-label="Daily calendar legend">
                    <span><span className="legend-swatch won" /> Solved</span>
                    <span><span className="legend-swatch lost" /> Lost</span>
                    <span><span className="legend-swatch today" /> Today</span>
                  </div>
                </section>

              </section>
            </div>
          </section>
        )}
      </main>

      <dialog
        id="win-modal"
        ref={winDialogRef}
        className="win-modal"
        aria-label="Puzzle completed"
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            closeWinPrompt();
          }
        }}
        onCancel={(event) => {
          event.preventDefault();
          closeWinPrompt();
        }}
      >
        <div className="win-card">
          <h2>Great Solve</h2>
          <p>What next?</p>
          <div className="win-actions">
            <button id="win-new-game" type="button" onClick={onWinNewGame}>
              New Puzzle
            </button>
            <button id="win-view-board" type="button" onClick={onWinViewBoard}>
              View Board
            </button>
            <button id="win-home" type="button" onClick={onWinHome}>
              Home
            </button>
          </div>
        </div>
      </dialog>

      <dialog
        id="lose-modal"
        ref={loseDialogRef}
        className="win-modal"
        aria-label="Puzzle over"
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            closeLosePrompt();
          }
        }}
        onCancel={(event) => {
          event.preventDefault();
          closeLosePrompt();
        }}
      >
        <div className="win-card">
          <h2>Puzzle Over</h2>
          <p>You are out of lives. What next?</p>
          <div className="win-actions">
            <button id="lose-restart" type="button" onClick={onLoseRestart}>
              Restart
            </button>
            <button id="lose-new-game" type="button" onClick={onLoseNewGame}>
              New Puzzle
            </button>
            <button id="lose-view-board" type="button" onClick={onLoseViewBoard}>
              View Board
            </button>
            <button id="lose-home" type="button" onClick={onLoseHome}>
              Home
            </button>
          </div>
        </div>
      </dialog>

    </>
  );
}
