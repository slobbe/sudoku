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
  boardComplete,
  clone,
  countSolutions,
  generatePuzzle,
  type Board,
  type Difficulty,
} from "@/lib/sudoku";

type Theme = "slate" | "dusk" | "mist" | "amber";
type FillModeEntry = "long-press" | "double-tap";
type AppView = "home" | "game" | "settings" | "stats";

type CellSelection = {
  row: number;
  col: number;
};

type DifficultyStats = {
  started: number;
  won: number;
};

type GameStats = {
  gamesStarted: number;
  gamesWon: number;
  currentStreak: number;
  bestStreak: number;
  byDifficulty: Record<Difficulty, DifficultyStats>;
};

type Snapshot = {
  board: Board;
  selected: CellSelection | null;
  highlightValue: number | null;
  won: boolean;
};

type GameState = {
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
};

type SavedGamePayload = {
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
  showMistakes: boolean;
  fillModeEntry: FillModeEntry;
  theme: Theme;
  stats: GameStats;
  won: boolean;
  lost: boolean;
  currentGameStarted: boolean;
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
const APP_VERSION = "0.2.1";
const APP_AUTHOR = "slobbe";

const THEMES: Theme[] = ["slate", "dusk", "mist", "amber"];
const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];
const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;
const HINT_OPTIONS = Array.from(
  { length: MAX_HINTS_PER_GAME - MIN_HINTS_PER_GAME + 1 },
  (_, index) => MIN_HINTS_PER_GAME + index,
);
const LIVES_OPTIONS = Array.from(
  { length: MAX_LIVES_PER_GAME - MIN_LIVES_PER_GAME + 1 },
  (_, index) => MIN_LIVES_PER_GAME + index,
);

const THEME_COLORS: Record<Theme, string> = {
  slate: "#151a21",
  mist: "#161918",
  dusk: "#171420",
  amber: "#1d1913",
};

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
  };
}

function keyOf(row: number, col: number): string {
  return `${row}-${col}`;
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

  return stats;
}

function createInitialState(): GameState {
  return {
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
  };
}

function createSnapshot(state: GameState): Snapshot {
  if (!state.board) {
    return {
      board: Array.from({ length: 9 }, () => Array(9).fill(0)),
      selected: state.selected ? { ...state.selected } : null,
      highlightValue: state.highlightValue,
      won: state.won,
    };
  }

  return {
    board: clone(state.board),
    selected: state.selected ? { ...state.selected } : null,
    highlightValue: state.highlightValue,
    won: state.won,
  };
}

function recordGameStart(stats: GameStats, difficulty: Difficulty): GameStats {
  const next = cloneStats(stats);
  next.gamesStarted += 1;
  next.byDifficulty[difficulty].started += 1;
  return next;
}

function recordWin(stats: GameStats, difficulty: Difficulty): GameStats {
  const next = cloneStats(stats);
  next.gamesWon += 1;
  next.byDifficulty[difficulty].won += 1;
  next.currentStreak += 1;
  if (next.currentStreak > next.bestStreak) {
    next.bestStreak = next.currentStreak;
  }
  return next;
}

function markCurrentGameAsLossIfNeeded(state: GameState): GameStats {
  const next = cloneStats(state.stats);
  if (!state.puzzle || state.won || !state.currentGameStarted) {
    return next;
  }
  next.currentStreak = 0;
  return next;
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
    showMistakes?: unknown;
    fillModeEntry?: unknown;
    theme?: unknown;
    stats?: unknown;
    won?: unknown;
    lost?: unknown;
    currentGameStarted?: unknown;
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
  if (candidate.showMistakes !== undefined && typeof candidate.showMistakes !== "boolean") {
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

  return {
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
    showMistakes: payload.showMistakes !== undefined ? payload.showMistakes : true,
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
  const [statusMessage, setStatusMessage] = useState<string>("Generating puzzle...");
  const [winPromptOpen, setWinPromptOpen] = useState(false);
  const [losePromptOpen, setLosePromptOpen] = useState(false);

  const [updateStatus, setUpdateStatus] = useState("");
  const [isHydrated, setIsHydrated] = useState(false);

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
      const current = stateRef.current;
      const difficulty = difficultyOverride ?? current.difficulty;
      const stats = markCurrentGameAsLossIfNeeded(current);
      const { puzzle, solution, givens } = generatePuzzle(difficulty);

      const next: GameState = {
        ...current,
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
        undoStack: [],
        redoStack: [],
        stats,
        winRecorded: false,
        currentGameStarted: false,
        hintsLeft: current.configuredHintsPerGame,
        livesLeft: current.configuredLivesPerGame,
        lost: false,
        won: false,
      };

      applyState(next);
      setWinPromptOpen(false);
      setLosePromptOpen(false);
      setStatusMessage(`New ${difficulty} puzzle ready (${givens} givens).`);
    },
    [applyState],
  );

  const startNewGameAndOpen = useCallback(
    (difficultyOverride?: Difficulty) => {
      startNewGame(difficultyOverride);
      setActiveView("game");
    },
    [startNewGame],
  );

  const goHome = useCallback(() => {
    setWinPromptOpen(false);
    setLosePromptOpen(false);
    setActiveView("home");
  }, []);

  const openSettingsView = useCallback(() => {
    setActiveView("settings");
  }, []);

  const openStatsView = useCallback(() => {
    setActiveView("stats");
  }, []);

  const continueCurrentPuzzle = useCallback(() => {
    setActiveView("game");
  }, []);

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
        stats = recordGameStart(current.stats, current.difficulty);
        currentGameStarted = true;
      }

      const wrongEntry = value !== 0 && value !== current.solution[row][col];

      let undoStack = [...current.undoStack, createSnapshot(current)];
      if (undoStack.length > 300) {
        undoStack = undoStack.slice(-300);
      }

      const board = clone(current.board);
      board[row][col] = value;

      let next: GameState = {
        ...current,
        board,
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
        next.stats = recordWin(next.stats, next.difficulty);
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
      setCellValue(current.selected.row, current.selected.col, value);
    },
    [isInputLocked, setCellValue],
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
      stats = recordGameStart(current.stats, current.difficulty);
      currentGameStarted = true;
    }

    let undoStack = [...current.undoStack, createSnapshot(current)];
    if (undoStack.length > 300) {
      undoStack = undoStack.slice(-300);
    }

    const board = clone(current.board);
    board[hintCell.row][hintCell.col] = current.solution[hintCell.row][hintCell.col];

    let next: GameState = {
      ...current,
      board,
      selected: { ...hintCell },
      highlightValue: current.solution[hintCell.row][hintCell.col],
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
      next.stats = recordWin(next.stats, next.difficulty);
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

  const onBoardClick = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      const current = stateRef.current;
      if (current.lost || !current.board) {
        return;
      }

      const cell = (event.target as HTMLElement).closest<HTMLButtonElement>(".cell");
      if (!cell) {
        return;
      }

      const row = Number(cell.dataset.row);
      const col = Number(cell.dataset.col);
      if (!Number.isInteger(row) || !Number.isInteger(col)) {
        return;
      }

      if (current.fillModeValue !== null && !isInputLocked(current)) {
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
      if (current.lost || current.fillModeEntry !== "long-press") {
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
      undoStack: [],
      redoStack: [],
      stats: recordGameStart(current.stats, current.difficulty),
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
    const restored = loadSavedGame();
    if (restored) {
      applyState(restored);
      setStatusMessage("Restored your previous puzzle.");
    } else {
      setStatusMessage("Choose New Puzzle to begin.");
    }
    setIsHydrated(true);
  }, [applyState]);

  useEffect(() => {
    if (!isHydrated || !state.puzzle || !state.solution || !state.board) {
      return;
    }

    const payload: SavedGamePayload = {
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
      showMistakes: state.showMistakes,
      fillModeEntry: state.fillModeEntry,
      theme: state.theme,
      stats: state.stats,
      won: state.won,
      lost: state.lost,
      currentGameStarted: state.currentGameStarted,
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
  const canContinueCurrentPuzzle = Boolean(
    state.puzzle
    && state.board
    && state.currentGameStarted
    && !state.won
    && !state.lost,
  );

  const statsOverall = formatLine(state.stats.gamesWon, state.stats.gamesStarted);
  const statsEasy = formatLine(state.stats.byDifficulty.easy.won, state.stats.byDifficulty.easy.started);
  const statsMedium = formatLine(state.stats.byDifficulty.medium.won, state.stats.byDifficulty.medium.started);
  const statsHard = formatLine(state.stats.byDifficulty.hard.won, state.stats.byDifficulty.hard.started);
  const statsOverallRate = calculateRatePercent(state.stats.gamesWon, state.stats.gamesStarted);
  const statsOverallAngle = (statsOverallRate / 100) * 360;
  const statsOverallUnfinished = Math.max(0, state.stats.gamesStarted - state.stats.gamesWon);
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
                  Continue Puzzle
                </button>
              ) : null}
              <button id="new-game" type="button" onClick={() => startNewGameAndOpen()}>
                New Puzzle
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
                      <button id="hint" type="button" disabled={state.hintsLeft <= 0 || isInputLocked(state)} onClick={handleHint}>
                        Hint (<span id="hints-left">{state.hintsLeft}</span>)
                      </button>
                    </div>
                  </div>

                  <div id="board" className="board" role="grid" aria-label="Sudoku grid" onClick={onBoardClick}>
                    {state.board
                      && state.board.map((rowValues, row) =>
                        rowValues.map((value, col) => {
                          const given = state.givens.has(keyOf(row, col));
                          const classes = ["cell"];

                          const boxParity = (Math.floor(row / 3) + Math.floor(col / 3)) % 2;
                          classes.push(boxParity === 0 ? "box-tone-a" : "box-tone-b");

                          if (col === 2 || col === 5) {
                            classes.push("box-right");
                          }
                          if (row === 2 || row === 5) {
                            classes.push("box-bottom");
                          }
                          if (given) {
                            classes.push("given");
                          }

                          if (showSelectionHighlights && state.selected && state.selected.row === row && state.selected.col === col) {
                            classes.push("selected");
                          } else if (showSelectionHighlights && state.selected) {
                            const sameRowOrCol = state.selected.row === row || state.selected.col === col;
                            const sameBox =
                              Math.floor(state.selected.row / 3) === Math.floor(row / 3)
                              && Math.floor(state.selected.col / 3) === Math.floor(col / 3);
                            if (sameRowOrCol) {
                              classes.push("peer");
                            } else if (sameBox) {
                              classes.push("peer-box");
                            }
                          }

                          if (highlighted !== null && value === highlighted) {
                            classes.push("match");
                          }

                          if (
                            state.showMistakes
                            && value !== 0
                            && !given
                            && state.solution
                            && value !== state.solution[row][col]
                          ) {
                            classes.push("invalid");
                          }

                          return (
                            <button
                              key={`${row}-${col}`}
                              type="button"
                              className={classes.join(" ")}
                              data-row={row}
                              data-col={col}
                              role="gridcell"
                              aria-label={`Row ${row + 1}, Column ${col + 1}`}
                            >
                              {value === 0 ? "" : String(value)}
                            </button>
                          );
                        }),
                      )}
                  </div>

                  <section
                    className={`numpad${state.fillModeValue !== null ? " fill-mode-active" : ""}`}
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
                      const isCompleted = countDigitOnBoard(state.board, digit) >= 9;

                      return (
                        <button
                          key={digit}
                          type="button"
                          data-value={digit}
                          disabled={disabled}
                          className={isFillMode ? "fill-mode" : ""}
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

                <div className="settings-row settings-row-checkbox">
                  <label htmlFor="show-mistakes">Show mistakes immediately</label>
                  <div className="settings-control">
                    <input
                      id="show-mistakes"
                      className="settings-checkbox"
                      type="checkbox"
                      checked={state.showMistakes}
                      onChange={(event) => {
                        const current = stateRef.current;
                        applyState({ ...current, showMistakes: event.target.checked });
                      }}
                    />
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
                  v<span id="app-info-version">{APP_VERSION}</span>
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
                      <p>
                        Overall:
                        {" "}
                        <span id="stats-overall">{statsOverall}</span>
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
                          Unfinished:
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

                <section className="stats-panel stats-panel-streak" aria-label="Current and best streak">
                  <h3>Streak Heat</h3>
                  <div className="stats-streak-grid">
                    <article className="stats-streak-card">
                      <p className="stats-streak-label">
                        <span className="stats-flame" aria-hidden="true">
                          🔥
                        </span>
                        Current streak
                      </p>
                      <p className="stats-streak-value">
                        <span id="stats-streak">{state.stats.currentStreak}</span>
                        <span className="stats-streak-unit">puzzles</span>
                      </p>
                    </article>
                    <article className="stats-streak-card">
                      <p className="stats-streak-label">
                        <span className="stats-flame" aria-hidden="true">
                          🔥
                        </span>
                        Best streak
                      </p>
                      <p className="stats-streak-value">
                        <span id="stats-best-streak">{state.stats.bestStreak}</span>
                        <span className="stats-streak-unit">puzzles</span>
                      </p>
                    </article>
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
