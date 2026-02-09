import {
  boardComplete,
  clone,
  countSolutions,
  generatePuzzle,
} from "./sudoku.js";

const HINTS_PER_GAME = 3;
const LIVES_PER_GAME = 3;
const SAVE_KEY = "sudoku-pwa-current-game-v1";
const FILL_MODE_ENTRY_TYPES = ["long-press", "double-tap"];
const THEMES = ["slate", "dusk", "mist", "amber"];
const DOUBLE_TAP_MS = 300;
const APP_NAME = "Sudoku";
const APP_VERSION = "0.1.6";
const APP_AUTHOR = "slobbe";

const DIFFICULTIES = ["easy", "medium", "hard"];

function createDefaultStats() {
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

const boardWrapEl = document.querySelector(".board-wrap");
const boardActionsEl = document.querySelector(".board-actions");
const boardEl = document.querySelector("#board");
const numpadEl = document.querySelector(".numpad");
const statsOpenEl = document.querySelector("#stats-open");
const statsModalEl = document.querySelector("#stats-modal");
const statsCloseEl = document.querySelector("#stats-close");
const settingsOpenEl = document.querySelector("#settings-open");
const settingsModalEl = document.querySelector("#settings-modal");
const settingsCloseEl = document.querySelector("#settings-close");
const winModalEl = document.querySelector("#win-modal");
const winNewGameEl = document.querySelector("#win-new-game");
const winLaterEl = document.querySelector("#win-later");
const loseModalEl = document.querySelector("#lose-modal");
const loseNewGameEl = document.querySelector("#lose-new-game");
const loseLaterEl = document.querySelector("#lose-later");
const undoEl = document.querySelector("#undo");
const redoEl = document.querySelector("#redo");
const resetGameEl = document.querySelector("#reset-game");
const difficultyEl = document.querySelector("#difficulty");
const showMistakesEl = document.querySelector("#show-mistakes");
const fillModeEntryEl = document.querySelector("#fill-mode-entry");
const themeEl = document.querySelector("#theme");
const newGameEl = document.querySelector("#new-game");
const hintEl = document.querySelector("#hint");
const hintsLeftEl = document.querySelector("#hints-left");
const livesEl = document.querySelector("#lives");
const livesDisplayEl = document.querySelector("#lives-display");
const statusTextEl = document.querySelector("#status-text");
const statsOverallEl = document.querySelector("#stats-overall");
const statsStreakEl = document.querySelector("#stats-streak");
const statsBestStreakEl = document.querySelector("#stats-best-streak");
const statsEasyEl = document.querySelector("#stats-easy");
const statsMediumEl = document.querySelector("#stats-medium");
const statsHardEl = document.querySelector("#stats-hard");
const updateActionEl = document.querySelector("#update-action");
const themeColorMetaEl = document.querySelector('meta[name="theme-color"]');
const appInfoNameEl = document.querySelector("#app-info-name");
const appInfoVersionEl = document.querySelector("#app-info-version");
const appInfoAuthorEl = document.querySelector("#app-info-author");

const THEME_COLORS = {
  slate: "#151a21",
  mist: "#161918",
  dusk: "#171420",
  amber: "#1d1913",
};

function normalizeTheme(theme) {
  if (typeof theme !== "string") {
    return "slate";
  }
  if (theme === "purple") {
    return "dusk";
  }
  if (THEMES.includes(theme)) {
    return theme;
  }
  return "slate";
}

const state = {
  difficulty: "medium",
  puzzle: null,
  solution: null,
  board: null,
  givens: new Set(),
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
  hintsLeft: HINTS_PER_GAME,
  livesLeft: LIVES_PER_GAME,
  lost: false,
  won: false,
};

let longPressTimer = null;
let longPressTriggered = false;
let lastTapDigit = null;
let lastTapAt = 0;
let pendingTapTimer = null;
let swRegistration = null;
let reloadTriggeredByUpdate = false;
let mobileLayoutRaf = null;

function isValidBoardShape(board) {
  if (!Array.isArray(board) || board.length !== 9) {
    return false;
  }
  return board.every(
    (row) =>
      Array.isArray(row)
      && row.length === 9
      && row.every((value) => Number.isInteger(value) && value >= 0 && value <= 9)
  );
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

function boardRespectsGivens(board, puzzle) {
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

function boardMatchesSolution(board, solution) {
  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 9; col += 1) {
      if (board[row][col] !== solution[row][col]) {
        return false;
      }
    }
  }
  return true;
}

function hasUserProgressOnBoard(board, puzzle) {
  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 9; col += 1) {
      if (puzzle[row][col] === 0 && board[row][col] !== 0) {
        return true;
      }
    }
  }
  return false;
}

function isSavedGameIntegrityValid(parsed) {
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

function isNonNegativeInteger(value) {
  return Number.isInteger(value) && value >= 0;
}

function normalizeStats(rawStats) {
  const fallback = createDefaultStats();
  if (!rawStats || typeof rawStats !== "object") {
    return fallback;
  }

  const stats = {
    gamesStarted: isNonNegativeInteger(rawStats.gamesStarted) ? rawStats.gamesStarted : 0,
    gamesWon: isNonNegativeInteger(rawStats.gamesWon) ? rawStats.gamesWon : 0,
    currentStreak: isNonNegativeInteger(rawStats.currentStreak) ? rawStats.currentStreak : 0,
    bestStreak: isNonNegativeInteger(rawStats.bestStreak) ? rawStats.bestStreak : 0,
    byDifficulty: {
      easy: { started: 0, won: 0 },
      medium: { started: 0, won: 0 },
      hard: { started: 0, won: 0 },
    },
  };

  for (const difficulty of DIFFICULTIES) {
    const entry = rawStats.byDifficulty && rawStats.byDifficulty[difficulty];
    stats.byDifficulty[difficulty] = {
      started: isNonNegativeInteger(entry && entry.started) ? entry.started : 0,
      won: isNonNegativeInteger(entry && entry.won) ? entry.won : 0,
    };
  }

  if (stats.bestStreak < stats.currentStreak) {
    stats.bestStreak = stats.currentStreak;
  }

  return stats;
}

function saveGame() {
  if (!state.puzzle || !state.solution || !state.board) {
    return;
  }

  const payload = {
    difficulty: state.difficulty,
    puzzle: state.puzzle,
    solution: state.solution,
    board: state.board,
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
    localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
  } catch {
    setStatus("Autosave is unavailable in this browser.");
  }
}

function loadSavedGame() {
  let raw = null;
  try {
    raw = localStorage.getItem(SAVE_KEY);
  } catch {
    return false;
  }

  if (!raw) {
    return false;
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return false;
  }

  const validDifficulty = ["easy", "medium", "hard"].includes(parsed.difficulty);
  if (!validDifficulty) {
    return false;
  }
  if (!isValidBoardShape(parsed.puzzle) || !isValidBoardShape(parsed.solution) || !isValidBoardShape(parsed.board)) {
    return false;
  }
  if (!Number.isInteger(parsed.hintsLeft) || parsed.hintsLeft < 0 || parsed.hintsLeft > HINTS_PER_GAME) {
    return false;
  }
  if (
    parsed.livesLeft !== undefined
    && (!Number.isInteger(parsed.livesLeft) || parsed.livesLeft < 0 || parsed.livesLeft > LIVES_PER_GAME)
  ) {
    return false;
  }
  if (typeof parsed.won !== "boolean") {
    return false;
  }
  if (parsed.lost !== undefined && typeof parsed.lost !== "boolean") {
    return false;
  }
  if (parsed.currentGameStarted !== undefined && typeof parsed.currentGameStarted !== "boolean") {
    return false;
  }
  if (parsed.showMistakes !== undefined && typeof parsed.showMistakes !== "boolean") {
    return false;
  }
  if (parsed.fillModeEntry !== undefined && !FILL_MODE_ENTRY_TYPES.includes(parsed.fillModeEntry)) {
    return false;
  }
  if (parsed.theme !== undefined && typeof parsed.theme !== "string") {
    return false;
  }
  if (!isSavedGameIntegrityValid(parsed)) {
    return false;
  }

  state.difficulty = parsed.difficulty;
  state.puzzle = parsed.puzzle;
  state.solution = parsed.solution;
  state.board = parsed.board;
  state.givens = buildGivens(parsed.puzzle);
  state.selected = null;
  state.highlightValue = null;
  state.fillModeValue = null;
  state.showMistakes = parsed.showMistakes !== undefined ? parsed.showMistakes : true;
  state.fillModeEntry = parsed.fillModeEntry || "double-tap";
  state.theme = normalizeTheme(parsed.theme);
  state.undoStack = [];
  state.redoStack = [];
  state.stats = normalizeStats(parsed.stats);
  state.hintsLeft = parsed.hintsLeft;
  state.livesLeft = parsed.livesLeft !== undefined ? parsed.livesLeft : LIVES_PER_GAME;
  state.won = parsed.won;
  state.lost = parsed.lost === true || (!state.won && state.livesLeft === 0);
  state.winRecorded = state.won;
  const inferredStarted = hasUserProgressOnBoard(parsed.board, parsed.puzzle);
  state.currentGameStarted = parsed.currentGameStarted === true || inferredStarted;

  difficultyEl.value = state.difficulty;
  showMistakesEl.checked = state.showMistakes;
  fillModeEntryEl.value = state.fillModeEntry;
  if (themeEl) {
    themeEl.value = state.theme;
  }
  applyTheme(state.theme);
  updateLivesUi();
  updateHintsUi();
  updateUndoRedoUi();
  renderStats();
  renderNumpadMode();
  renderBoard();
  setStatus("Restored your previous game.");
  if (state.lost) {
    showGameOverPrompt();
  }
  return true;
}

function key(row, col) {
  return `${row}-${col}`;
}

function isGiven(row, col) {
  return state.givens.has(key(row, col));
}

function setStatus(message) {
  if (!statusTextEl) {
    return;
  }
  statusTextEl.textContent = message;
}

function renderAppInfo() {
  if (appInfoNameEl) {
    appInfoNameEl.textContent = APP_NAME;
  }
  if (appInfoVersionEl) {
    appInfoVersionEl.textContent = APP_VERSION;
  }
  if (appInfoAuthorEl) {
    appInfoAuthorEl.textContent = APP_AUTHOR;
  }
}

function syncMobileViewportHeight() {
  const viewportHeight = window.visualViewport ? window.visualViewport.height : window.innerHeight;
  if (viewportHeight > 0) {
    document.documentElement.style.setProperty("--app-vh", `${viewportHeight * 0.01}px`);
  }
}

function syncMobileBoardSize() {
  if (!boardWrapEl || !boardEl) {
    return;
  }

  if (!window.matchMedia("(max-width: 600px)").matches) {
    boardEl.style.width = "";
    boardEl.style.height = "";
    if (boardActionsEl) {
      boardActionsEl.style.width = "";
    }
    boardWrapEl.style.justifyContent = "";
    return;
  }

  const availableWidth = boardWrapEl.clientWidth;
  const wrapStyles = window.getComputedStyle(boardWrapEl);
  const wrapGap = parseFloat(wrapStyles.gap) || 0;
  const actionsHeight = boardActionsEl ? boardActionsEl.getBoundingClientRect().height : 0;
  const availableHeight = boardWrapEl.clientHeight - actionsHeight - wrapGap;
  const size = Math.floor(Math.min(availableWidth, availableHeight));
  if (size > 0) {
    boardEl.style.width = `${size}px`;
    boardEl.style.height = `${size}px`;
    if (boardActionsEl) {
      boardActionsEl.style.width = `${size}px`;
    }
    boardWrapEl.style.justifyContent = availableHeight - size >= 10 ? "center" : "flex-start";
  } else {
    boardEl.style.width = "";
    boardEl.style.height = "";
    if (boardActionsEl) {
      boardActionsEl.style.width = "";
    }
    boardWrapEl.style.justifyContent = "";
  }
}

function scheduleMobileLayoutSync() {
  if (mobileLayoutRaf !== null) {
    return;
  }
  mobileLayoutRaf = window.requestAnimationFrame(() => {
    mobileLayoutRaf = null;
    syncMobileViewportHeight();
    syncMobileBoardSize();
    window.setTimeout(() => {
      syncMobileViewportHeight();
      syncMobileBoardSize();
    }, 80);
  });
}

function applyTheme(theme) {
  if (!THEMES.includes(theme)) {
    return;
  }

  document.documentElement.dataset.theme = theme;
  const color = THEME_COLORS[theme];
  if (themeColorMetaEl && color) {
    themeColorMetaEl.setAttribute("content", color);
  }
}

function isInputLocked() {
  return state.won || state.lost;
}

function updateLivesUi() {
  if (!livesDisplayEl) {
    return;
  }

  const symbols = document.createDocumentFragment();
  for (let i = 0; i < LIVES_PER_GAME; i += 1) {
    const symbol = document.createElement("span");
    if (i < state.livesLeft) {
      symbol.textContent = "\u2665";
      symbol.className = "lives-heart";
    } else {
      symbol.textContent = "\u2022";
      symbol.className = "lives-miss";
    }
    symbols.appendChild(symbol);
  }
  livesDisplayEl.replaceChildren(symbols);

  if (livesEl) {
    livesEl.classList.toggle("empty", state.livesLeft === 0);
    livesEl.setAttribute("aria-label", `Lives ${state.livesLeft} of ${LIVES_PER_GAME}`);
  }
}

function updateResetUi() {
  if (!resetGameEl) {
    return;
  }
  resetGameEl.disabled = state.lost;
}

function updateHintsUi() {
  hintsLeftEl.textContent = String(state.hintsLeft);
  hintEl.disabled = state.hintsLeft <= 0 || isInputLocked();
}

function setUpdateStatus(message) {
  if (!updateActionEl) {
    return;
  }
  updateActionEl.title = message;
}

function updateUpdateAction() {
  if (!updateActionEl) {
    return;
  }
  const waiting = Boolean(swRegistration && swRegistration.waiting);
  updateActionEl.textContent = waiting ? "Update now" : "Check for updates";
}

function formatRate(won, started) {
  if (started === 0) {
    return "0%";
  }
  return `${Math.round((won / started) * 100)}%`;
}

function formatLine(won, started) {
  return `${won}/${started} (${formatRate(won, started)})`;
}

function renderStats() {
  const { gamesStarted, gamesWon, currentStreak, bestStreak, byDifficulty } = state.stats;

  statsOverallEl.textContent = formatLine(gamesWon, gamesStarted);
  statsStreakEl.textContent = String(currentStreak);
  statsBestStreakEl.textContent = String(bestStreak);
  statsEasyEl.textContent = formatLine(byDifficulty.easy.won, byDifficulty.easy.started);
  statsMediumEl.textContent = formatLine(byDifficulty.medium.won, byDifficulty.medium.started);
  statsHardEl.textContent = formatLine(byDifficulty.hard.won, byDifficulty.hard.started);
}

function updateUndoRedoUi() {
  undoEl.disabled = state.lost || state.undoStack.length === 0;
  redoEl.disabled = state.lost || state.redoStack.length === 0;
  updateResetUi();
}

function createSnapshot() {
  return {
    board: clone(state.board),
    selected: state.selected ? { ...state.selected } : null,
    highlightValue: state.highlightValue,
    won: state.won,
  };
}

function applySnapshot(snapshot) {
  state.board = clone(snapshot.board);
  state.selected = snapshot.selected ? { ...snapshot.selected } : null;
  state.highlightValue = snapshot.highlightValue;
  state.won = snapshot.won;
}

function pushUndoSnapshot() {
  state.undoStack.push(createSnapshot());
  if (state.undoStack.length > 300) {
    state.undoStack.shift();
  }
  state.redoStack = [];
  updateUndoRedoUi();
}

function markCurrentGameAsLossIfNeeded() {
  if (!state.puzzle || state.won || !state.currentGameStarted) {
    return;
  }
  state.stats.currentStreak = 0;
}

function recordGameStart(difficulty) {
  state.stats.gamesStarted += 1;
  state.stats.byDifficulty[difficulty].started += 1;
}

function markCurrentGameStartedIfNeeded() {
  if (state.currentGameStarted) {
    return;
  }
  state.currentGameStarted = true;
  recordGameStart(state.difficulty);
  renderStats();
}

function loseLifeForWrongEntry() {
  if (state.lost || state.livesLeft <= 0) {
    return;
  }

  state.livesLeft -= 1;
  updateLivesUi();

  if (state.livesLeft > 0) {
    const label = state.livesLeft === 1 ? "life" : "lives";
    setStatus(`Wrong number. ${state.livesLeft} ${label} left.`);
    return;
  }

  state.lost = true;
  state.fillModeValue = null;
  markCurrentGameAsLossIfNeeded();
  renderStats();
  updateHintsUi();
  updateUndoRedoUi();
  renderNumpadMode();
  renderBoard();
  setStatus("Out of lives. Start a new game.");
  showGameOverPrompt();
}

function recordWin() {
  if (state.winRecorded) {
    return;
  }

  const difficulty = state.difficulty;
  state.stats.gamesWon += 1;
  state.stats.byDifficulty[difficulty].won += 1;
  state.stats.currentStreak += 1;
  if (state.stats.currentStreak > state.stats.bestStreak) {
    state.stats.bestStreak = state.stats.currentStreak;
  }
  state.winRecorded = true;
  renderStats();
}

function undoMove() {
  if (state.undoStack.length === 0) {
    return;
  }

  state.redoStack.push(createSnapshot());
  const snapshot = state.undoStack.pop();
  applySnapshot(snapshot);
  syncFillModeAvailability();
  updateHintsUi();
  updateUndoRedoUi();
  renderNumpadMode();
  renderBoard();
  saveGame();
}

function redoMove() {
  if (state.redoStack.length === 0) {
    return;
  }

  state.undoStack.push(createSnapshot());
  const snapshot = state.redoStack.pop();
  applySnapshot(snapshot);
  syncFillModeAvailability();
  updateHintsUi();
  updateUndoRedoUi();
  renderNumpadMode();
  renderBoard();
  saveGame();
}

function countDigitOnBoard(digit) {
  if (!state.board) {
    return 0;
  }

  let count = 0;
  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 9; col += 1) {
      if (state.board[row][col] === digit) {
        count += 1;
      }
    }
  }
  return count;
}

function isDigitCompletedCorrectly(digit) {
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

function findNextIncompleteDigit(fromDigit) {
  for (let step = 1; step <= 9; step += 1) {
    const candidate = ((fromDigit - 1 + step) % 9) + 1;
    if (!isDigitCompletedCorrectly(candidate)) {
      return candidate;
    }
  }
  return null;
}

function syncFillModeAvailability() {
  if (state.fillModeValue === null) {
    return;
  }

  if (isDigitCompletedCorrectly(state.fillModeValue)) {
    const next = findNextIncompleteDigit(state.fillModeValue);
    state.fillModeValue = next;
    state.highlightValue = next;
  }
}

function renderNumpadMode() {
  const buttons = numpadEl.querySelectorAll("button[data-value]");
  numpadEl.classList.toggle("fill-mode-active", state.fillModeValue !== null);
  for (const button of buttons) {
    const value = Number(button.dataset.value);
    button.disabled = state.lost || isDigitCompletedCorrectly(value);
    button.classList.toggle("fill-mode", state.fillModeValue !== null && value === state.fillModeValue);
  }
}

function activeHighlightValue() {
  if (state.fillModeValue !== null) {
    return state.fillModeValue;
  }
  return state.highlightValue;
}

function setFillMode(valueOrNull) {
  state.fillModeValue = valueOrNull;
  if (valueOrNull !== null) {
    state.highlightValue = valueOrNull;
  }
  renderNumpadMode();
  renderBoard();
}

function toggleFillModeForDigit(value) {
  if (state.fillModeValue === value) {
    setFillMode(null);
  } else {
    setFillMode(value);
  }
}

function buildGivens(puzzle) {
  const givens = new Set();
  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 9; col += 1) {
      if (puzzle[row][col] !== 0) {
        givens.add(key(row, col));
      }
    }
  }
  return givens;
}

function cellFromEventTarget(target) {
  const cell = target.closest(".cell");
  if (!cell) {
    return null;
  }
  const row = Number(cell.dataset.row);
  const col = Number(cell.dataset.col);
  return { row, col };
}

function applySelection(row, col) {
  const value = state.board[row][col];
  state.highlightValue = value === 0 ? null : value;

  state.selected = { row, col };
  renderBoard();
}

function updateWinState() {
  if (!state.board) {
    return;
  }
  const wasWon = state.won;
  const solved = boardComplete(state.board);
  state.won = solved;
  if (solved && !wasWon) {
    recordWin();
    showWinCelebration();
  }
  updateUndoRedoUi();
}

function closeWinPrompt() {
  if (winModalEl.open) {
    winModalEl.close();
  }
}

function closeLosePrompt() {
  if (loseModalEl && loseModalEl.open) {
    loseModalEl.close();
  }
}

function showWinCelebration() {
  if (!winModalEl.open) {
    winModalEl.showModal();
  }
}

function showGameOverPrompt() {
  if (loseModalEl && !loseModalEl.open) {
    loseModalEl.showModal();
  }
}

function clearPendingTapTimer() {
  if (pendingTapTimer !== null) {
    window.clearTimeout(pendingTapTimer);
    pendingTapTimer = null;
  }
}

function resetDoubleTapTracking() {
  clearPendingTapTimer();
  lastTapDigit = null;
  lastTapAt = 0;
}

function handleDoubleTapEntry(value) {
  const now = Date.now();
  const isSecondTap = lastTapDigit === value && now - lastTapAt <= DOUBLE_TAP_MS;

  if (isSecondTap) {
    resetDoubleTapTracking();
    toggleFillModeForDigit(value);
    return;
  }

  lastTapDigit = value;
  lastTapAt = now;
  clearPendingTapTimer();
  pendingTapTimer = window.setTimeout(() => {
    pendingTapTimer = null;
    if (state.fillModeEntry === "double-tap" && state.fillModeValue === null) {
      applyNumberInput(value);
    }
    if (lastTapDigit === value) {
      lastTapDigit = null;
      lastTapAt = 0;
    }
  }, DOUBLE_TAP_MS);
}

function clearWinUi() {
  closeWinPrompt();
  closeLosePrompt();
}

function setCellValue(row, col, value) {
  if (isInputLocked() || isGiven(row, col)) {
    return;
  }

  if (state.board[row][col] === value) {
    return;
  }

  if (value !== 0 && state.board[row][col] === 0) {
    markCurrentGameStartedIfNeeded();
  }

  const wrongEntry = value !== 0 && value !== state.solution[row][col];

  pushUndoSnapshot();

  state.board[row][col] = value;
  state.highlightValue = value === 0 ? null : value;
  syncFillModeAvailability();
  renderNumpadMode();
  renderBoard();
  updateWinState();

  if (wrongEntry) {
    loseLifeForWrongEntry();
  } else if (!state.won) {
    setStatus("Keep going.");
  }

  saveGame();
}

function renderBoard() {
  if (!state.board) {
    return;
  }

  const fragment = document.createDocumentFragment();

  const highlighted = activeHighlightValue();
  const showSelectionHighlights = state.fillModeValue === null;

  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 9; col += 1) {
      const value = state.board[row][col];
      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = "cell";
      cell.dataset.row = String(row);
      cell.dataset.col = String(col);
      cell.role = "gridcell";
      cell.textContent = value === 0 ? "" : String(value);
      cell.setAttribute("aria-label", `Row ${row + 1}, Column ${col + 1}`);
      const boxParity = (Math.floor(row / 3) + Math.floor(col / 3)) % 2;
      cell.classList.add(boxParity === 0 ? "box-tone-a" : "box-tone-b");

      if (col === 2 || col === 5) {
        cell.classList.add("box-right");
      }
      if (row === 2 || row === 5) {
        cell.classList.add("box-bottom");
      }
      if (isGiven(row, col)) {
        cell.classList.add("given");
      }
      if (showSelectionHighlights && state.selected && state.selected.row === row && state.selected.col === col) {
        cell.classList.add("selected");
      } else if (showSelectionHighlights && state.selected) {
        const sameRowOrCol = state.selected.row === row || state.selected.col === col;
        const sameBox = Math.floor(state.selected.row / 3) === Math.floor(row / 3)
          && Math.floor(state.selected.col / 3) === Math.floor(col / 3);
        if (sameRowOrCol) {
          cell.classList.add("peer");
        } else if (sameBox) {
          cell.classList.add("peer-box");
        }
      }
      if (highlighted !== null && value === highlighted) {
        cell.classList.add("match");
      }
      if (
        state.showMistakes
        && value !== 0
        && !isGiven(row, col)
        && state.solution
        && value !== state.solution[row][col]
      ) {
        cell.classList.add("invalid");
      }

      fragment.appendChild(cell);
    }
  }

  boardEl.replaceChildren(fragment);
  scheduleMobileLayoutSync();
}

function pickHintCell() {
  if (!state.board || !state.solution) {
    return null;
  }

  if (state.selected) {
    const { row, col } = state.selected;
    if (!isGiven(row, col) && state.board[row][col] === 0) {
      return { row, col };
    }
  }

  const empty = [];
  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 9; col += 1) {
      if (!isGiven(row, col) && state.board[row][col] === 0) {
        empty.push({ row, col });
      }
    }
  }

  if (empty.length === 0) {
    return null;
  }

  return empty[Math.floor(Math.random() * empty.length)];
}

function useHint() {
  if (state.hintsLeft <= 0 || isInputLocked()) {
    return;
  }

  const cell = pickHintCell();
  if (!cell) {
    setStatus("No empty cell available for a hint.");
    return;
  }

  const { row, col } = cell;
  markCurrentGameStartedIfNeeded();
  pushUndoSnapshot();
  state.board[row][col] = state.solution[row][col];
  state.highlightValue = state.solution[row][col];
  state.hintsLeft -= 1;
  state.selected = { row, col };
  syncFillModeAvailability();
  updateHintsUi();
  renderNumpadMode();
  renderBoard();
  updateWinState();

  if (!state.won) {
    setStatus("Hint revealed.");
  }

  saveGame();
}

function startNewGame() {
  clearWinUi();
  setStatus("Generating puzzle...");

  markCurrentGameAsLossIfNeeded();

  const { puzzle, solution, givens } = generatePuzzle(state.difficulty);
  state.puzzle = puzzle;
  state.solution = solution;
  state.board = clone(puzzle);
  state.givens = buildGivens(puzzle);
  state.selected = null;
  state.highlightValue = null;
  state.fillModeValue = null;
  state.won = false;
  state.winRecorded = false;
  state.currentGameStarted = false;
  state.undoStack = [];
  state.redoStack = [];
  state.hintsLeft = HINTS_PER_GAME;
  state.livesLeft = LIVES_PER_GAME;
  state.lost = false;

  showMistakesEl.checked = state.showMistakes;
  renderStats();
  updateLivesUi();
  updateHintsUi();
  updateUndoRedoUi();
  renderNumpadMode();
  renderBoard();
  setStatus(`New ${state.difficulty} puzzle ready (${givens} givens).`);
  saveGame();
}

function resetCurrentGame() {
  if (!state.puzzle || !state.board) {
    return;
  }

  if (state.lost) {
    setStatus("Out of lives. Start a new game.");
    return;
  }

  clearWinUi();
  state.board = clone(state.puzzle);
  state.selected = null;
  state.highlightValue = null;
  state.fillModeValue = null;
  state.won = false;
  state.lost = false;
  state.undoStack = [];
  state.redoStack = [];
  state.hintsLeft = HINTS_PER_GAME;
  state.livesLeft = LIVES_PER_GAME;

  updateLivesUi();
  updateHintsUi();
  updateUndoRedoUi();
  renderNumpadMode();
  renderBoard();
  setStatus("Puzzle reset.");
  saveGame();
}

function applyNumberInput(value) {
  if (!state.selected || isInputLocked()) {
    return;
  }
  setCellValue(state.selected.row, state.selected.col, value);
}

function onBoardClick(event) {
  if (state.lost) {
    return;
  }

  const cell = cellFromEventTarget(event.target);
  if (!cell) {
    return;
  }

  if (state.fillModeValue !== null && !isInputLocked()) {
    const { row, col } = cell;
    if (!isGiven(row, col) && state.board[row][col] === 0) {
      state.selected = { row, col };
      setCellValue(row, col, state.fillModeValue);
      return;
    }
  }

  applySelection(cell.row, cell.col);
}

function onNumpadClick(event) {
  if (state.lost) {
    return;
  }

  const button = event.target.closest("button[data-value]");
  if (!button) {
    return;
  }

  if (button.disabled) {
    return;
  }

  if (longPressTriggered) {
    longPressTriggered = false;
    return;
  }

  const value = Number(button.dataset.value);

  if (state.fillModeEntry === "double-tap") {
    handleDoubleTapEntry(value);
    return;
  }

  if (state.fillModeValue !== null) {
    return;
  }

  applyNumberInput(value);
}

function clearLongPressTimer() {
  if (longPressTimer !== null) {
    window.clearTimeout(longPressTimer);
    longPressTimer = null;
  }
}

function onNumpadPointerDown(event) {
  if (state.lost) {
    return;
  }

  const button = event.target.closest("button[data-value]");
  if (!button) {
    return;
  }

  if (button.disabled) {
    return;
  }

  if (state.fillModeEntry !== "long-press") {
    return;
  }

  event.preventDefault();

  const value = Number(button.dataset.value);
  if (value < 1 || value > 9) {
    return;
  }

  longPressTriggered = false;
  clearLongPressTimer();
  longPressTimer = window.setTimeout(() => {
    toggleFillModeForDigit(value);
    longPressTriggered = true;
    clearLongPressTimer();
  }, 430);
}

function onNumpadPointerRelease() {
  clearLongPressTimer();
}

function moveSelection(deltaRow, deltaCol) {
  if (!state.board || isInputLocked()) {
    return;
  }

  const base = state.selected || { row: 0, col: 0 };
  let row = (base.row + deltaRow + 9) % 9;
  let col = (base.col + deltaCol + 9) % 9;

  for (let tries = 0; tries < 81; tries += 1) {
    if (!isGiven(row, col)) {
      state.selected = { row, col };
      renderBoard();
      return;
    }
    col = (col + 1) % 9;
    if (col === 0) {
      row = (row + 1) % 9;
    }
  }
}

function onKeyDown(event) {
  if (!state.board) {
    return;
  }

  if (settingsModalEl.open || (statsModalEl && statsModalEl.open) || winModalEl.open || (loseModalEl && loseModalEl.open)) {
    return;
  }

  if (state.lost) {
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

  if (event.key === "Escape" && state.fillModeValue !== null) {
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
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    setUpdateStatus("Updates unavailable in this browser.");
    if (updateActionEl) {
      updateActionEl.disabled = true;
      updateActionEl.textContent = "Updates unavailable";
    }
    return;
  }

  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (reloadTriggeredByUpdate) {
      return;
    }
    reloadTriggeredByUpdate = true;
    window.location.reload();
  });

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js")
      .then((registration) => {
        swRegistration = registration;
        updateUpdateAction();
        setUpdateStatus(registration.waiting ? "Update available." : "Up to date.");

        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (!newWorker) {
            return;
          }
          setUpdateStatus("Downloading update...");
          newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "installed") {
              updateUpdateAction();
              if (navigator.serviceWorker.controller) {
                setUpdateStatus("Update available.");
              } else {
                setUpdateStatus("Up to date.");
              }
            }
          });
        });
      })
      .catch(() => {
        setStatus("Game works, but offline mode could not be enabled.");
        setUpdateStatus("Service worker setup failed.");
        if (updateActionEl) {
          updateActionEl.disabled = true;
          updateActionEl.textContent = "Update unavailable";
        }
      });
  });
}

function checkForUpdates() {
  if (!swRegistration) {
    setUpdateStatus("Checking unavailable right now.");
    return;
  }

  setUpdateStatus("Checking for updates...");
  swRegistration.update()
    .then(() => {
      updateUpdateAction();
      if (swRegistration.waiting) {
        setUpdateStatus("Update available.");
      } else {
        setUpdateStatus("Up to date.");
      }
    })
    .catch(() => {
      setUpdateStatus("Could not check for updates.");
    });
}

function applyUpdateNow() {
  if (!swRegistration || !swRegistration.waiting) {
    setUpdateStatus("No update ready.");
    return;
  }

  setUpdateStatus("Applying update...");
  swRegistration.waiting.postMessage({ type: "SKIP_WAITING" });
}

function runUpdateAction() {
  const waiting = Boolean(swRegistration && swRegistration.waiting);
  if (waiting) {
    applyUpdateNow();
  } else {
    checkForUpdates();
  }
}

function openStats() {
  if (!statsModalEl) {
    return;
  }
  renderStats();
  statsModalEl.showModal();
}

function closeStats() {
  if (statsModalEl && statsModalEl.open) {
    statsModalEl.close();
  }
}

function closeStatsOnBackdrop(event) {
  if (event.target === statsModalEl) {
    closeStats();
  }
}

function openSettings() {
  settingsModalEl.showModal();
}

function closeSettings() {
  settingsModalEl.close();
}

function closeSettingsOnBackdrop(event) {
  if (event.target === settingsModalEl) {
    settingsModalEl.close();
  }
}

function closeWinOnBackdrop(event) {
  if (event.target === winModalEl) {
    closeWinPrompt();
  }
}

function closeLoseOnBackdrop(event) {
  if (event.target === loseModalEl) {
    closeLosePrompt();
  }
}

function onWinNewGame() {
  closeWinPrompt();
  startNewGame();
}

function onLoseNewGame() {
  closeLosePrompt();
  startNewGame();
}

function onShowMistakesChange(event) {
  state.showMistakes = event.target.checked;
  renderBoard();
  saveGame();
}

function onFillModeEntryChange(event) {
  state.fillModeEntry = event.target.value;
  clearLongPressTimer();
  resetDoubleTapTracking();
  saveGame();
}

function onThemeChange(event) {
  state.theme = event.target.value;
  applyTheme(state.theme);
  saveGame();
}

boardEl.addEventListener("click", onBoardClick);
numpadEl.addEventListener("click", onNumpadClick);
numpadEl.addEventListener("pointerdown", onNumpadPointerDown);
numpadEl.addEventListener("pointerup", onNumpadPointerRelease);
numpadEl.addEventListener("pointerleave", onNumpadPointerRelease);
numpadEl.addEventListener("pointercancel", onNumpadPointerRelease);
undoEl.addEventListener("click", undoMove);
redoEl.addEventListener("click", redoMove);
if (resetGameEl) {
  resetGameEl.addEventListener("click", resetCurrentGame);
}
if (statsOpenEl) {
  statsOpenEl.addEventListener("click", openStats);
}
if (statsCloseEl) {
  statsCloseEl.addEventListener("click", closeStats);
}
if (statsModalEl) {
  statsModalEl.addEventListener("click", closeStatsOnBackdrop);
}
settingsOpenEl.addEventListener("click", openSettings);
settingsCloseEl.addEventListener("click", closeSettings);
settingsModalEl.addEventListener("click", closeSettingsOnBackdrop);
winModalEl.addEventListener("click", closeWinOnBackdrop);
if (loseModalEl) {
  loseModalEl.addEventListener("click", closeLoseOnBackdrop);
}
difficultyEl.addEventListener("change", (event) => {
  state.difficulty = event.target.value;
  startNewGame();
});
showMistakesEl.addEventListener("change", onShowMistakesChange);
fillModeEntryEl.addEventListener("change", onFillModeEntryChange);
if (themeEl) {
  themeEl.addEventListener("change", onThemeChange);
}
newGameEl.addEventListener("click", startNewGame);
hintEl.addEventListener("click", useHint);
winNewGameEl.addEventListener("click", onWinNewGame);
winLaterEl.addEventListener("click", closeWinPrompt);
if (loseNewGameEl) {
  loseNewGameEl.addEventListener("click", onLoseNewGame);
}
if (loseLaterEl) {
  loseLaterEl.addEventListener("click", closeLosePrompt);
}
if (updateActionEl) {
  updateActionEl.addEventListener("click", runUpdateAction);
}
window.addEventListener("keydown", onKeyDown);
window.addEventListener("resize", scheduleMobileLayoutSync);
window.addEventListener("orientationchange", scheduleMobileLayoutSync);
window.addEventListener("pageshow", scheduleMobileLayoutSync);
if (window.visualViewport) {
  window.visualViewport.addEventListener("resize", scheduleMobileLayoutSync);
  window.visualViewport.addEventListener("scroll", scheduleMobileLayoutSync);
}
window.addEventListener("load", scheduleMobileLayoutSync);

renderAppInfo();
scheduleMobileLayoutSync();
registerServiceWorker();

if (!loadSavedGame()) {
  difficultyEl.value = state.difficulty;
  showMistakesEl.checked = state.showMistakes;
  fillModeEntryEl.value = state.fillModeEntry;
  if (themeEl) {
    themeEl.value = state.theme;
  }
  applyTheme(state.theme);
  startNewGame();
}
