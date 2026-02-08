import {
  boardComplete,
  clone,
  generatePuzzle,
  isValidPlacement,
} from "./sudoku.js";

const HINTS_PER_GAME = 3;
const SAVE_KEY = "sudoku-pwa-current-game-v1";

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

const boardEl = document.querySelector("#board");
const numpadEl = document.querySelector(".numpad");
const settingsOpenEl = document.querySelector("#settings-open");
const settingsModalEl = document.querySelector("#settings-modal");
const undoEl = document.querySelector("#undo");
const redoEl = document.querySelector("#redo");
const difficultyEl = document.querySelector("#difficulty");
const showMistakesEl = document.querySelector("#show-mistakes");
const newGameEl = document.querySelector("#new-game");
const hintEl = document.querySelector("#hint");
const hintsLeftEl = document.querySelector("#hints-left");
const statusTextEl = document.querySelector("#status-text");
const statsOverallEl = document.querySelector("#stats-overall");
const statsStreakEl = document.querySelector("#stats-streak");
const statsBestStreakEl = document.querySelector("#stats-best-streak");
const statsEasyEl = document.querySelector("#stats-easy");
const statsMediumEl = document.querySelector("#stats-medium");
const statsHardEl = document.querySelector("#stats-hard");

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
  undoStack: [],
  redoStack: [],
  stats: createDefaultStats(),
  winRecorded: false,
  hintsLeft: HINTS_PER_GAME,
  won: false,
};

let longPressTimer = null;
let longPressTriggered = false;

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
    showMistakes: state.showMistakes,
    stats: state.stats,
    won: state.won,
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
  if (typeof parsed.won !== "boolean") {
    return false;
  }
  if (parsed.showMistakes !== undefined && typeof parsed.showMistakes !== "boolean") {
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
  state.undoStack = [];
  state.redoStack = [];
  state.stats = normalizeStats(parsed.stats);
  state.hintsLeft = parsed.hintsLeft;
  state.won = parsed.won;
  state.winRecorded = state.won;

  difficultyEl.value = state.difficulty;
  showMistakesEl.checked = state.showMistakes;
  updateHintsUi();
  updateUndoRedoUi();
  renderStats();
  renderNumpadMode();
  renderBoard();
  setStatus("Restored your previous game.");
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

function updateHintsUi() {
  hintsLeftEl.textContent = String(state.hintsLeft);
  hintEl.disabled = state.hintsLeft <= 0 || state.won;
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
  undoEl.disabled = state.undoStack.length === 0;
  redoEl.disabled = state.redoStack.length === 0;
}

function createSnapshot() {
  return {
    board: clone(state.board),
    selected: state.selected ? { ...state.selected } : null,
    highlightValue: state.highlightValue,
    hintsLeft: state.hintsLeft,
    won: state.won,
  };
}

function applySnapshot(snapshot) {
  state.board = clone(snapshot.board);
  state.selected = snapshot.selected ? { ...snapshot.selected } : null;
  state.highlightValue = snapshot.highlightValue;
  state.hintsLeft = snapshot.hintsLeft;
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
  if (!state.puzzle || state.won) {
    return;
  }
  state.stats.currentStreak = 0;
}

function recordGameStart(difficulty) {
  state.stats.gamesStarted += 1;
  state.stats.byDifficulty[difficulty].started += 1;
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
  updateHintsUi();
  updateUndoRedoUi();
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
  updateHintsUi();
  updateUndoRedoUi();
  renderBoard();
  saveGame();
}

function renderNumpadMode() {
  const buttons = numpadEl.querySelectorAll("button[data-value]");
  for (const button of buttons) {
    const value = Number(button.dataset.value);
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
    setStatus("You solved it! Start a new game for another puzzle.");
  }
  updateUndoRedoUi();
}

function setCellValue(row, col, value) {
  if (state.won || isGiven(row, col)) {
    return;
  }

  if (state.board[row][col] === value) {
    return;
  }

  pushUndoSnapshot();

  state.board[row][col] = value;
  state.highlightValue = value === 0 ? null : value;
  renderBoard();
  updateWinState();

  if (!state.won) {
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

      if (col === 2 || col === 5) {
        cell.classList.add("box-right");
      }
      if (row === 2 || row === 5) {
        cell.classList.add("box-bottom");
      }
      if (isGiven(row, col)) {
        cell.classList.add("given");
      }
      if (state.selected && state.selected.row === row && state.selected.col === col) {
        cell.classList.add("selected");
      } else if (state.selected) {
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
      if (state.showMistakes && value !== 0 && !isValidPlacement(state.board, row, col, value)) {
        cell.classList.add("invalid");
      }

      fragment.appendChild(cell);
    }
  }

  boardEl.replaceChildren(fragment);
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
  if (state.hintsLeft <= 0 || state.won) {
    return;
  }

  const cell = pickHintCell();
  if (!cell) {
    setStatus("No empty cell available for a hint.");
    return;
  }

  const { row, col } = cell;
  pushUndoSnapshot();
  state.board[row][col] = state.solution[row][col];
  state.highlightValue = state.solution[row][col];
  state.hintsLeft -= 1;
  state.selected = { row, col };
  updateHintsUi();
  renderBoard();
  updateWinState();

  if (!state.won) {
    setStatus("Hint revealed.");
  }

  saveGame();
}

function startNewGame() {
  setStatus("Generating puzzle...");

  markCurrentGameAsLossIfNeeded();
  recordGameStart(state.difficulty);

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
  state.undoStack = [];
  state.redoStack = [];
  state.hintsLeft = HINTS_PER_GAME;

  showMistakesEl.checked = state.showMistakes;
  renderStats();
  updateHintsUi();
  updateUndoRedoUi();
  renderNumpadMode();
  renderBoard();
  setStatus(`New ${state.difficulty} puzzle ready (${givens} givens).`);
  saveGame();
}

function applyNumberInput(value) {
  if (!state.selected || state.won) {
    return;
  }
  setCellValue(state.selected.row, state.selected.col, value);
}

function onBoardClick(event) {
  const cell = cellFromEventTarget(event.target);
  if (!cell) {
    return;
  }

  if (state.fillModeValue !== null && !state.won) {
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
  const button = event.target.closest("button[data-value]");
  if (!button) {
    return;
  }

  if (longPressTriggered) {
    longPressTriggered = false;
    return;
  }

  if (state.fillModeValue !== null) {
    return;
  }

  const value = Number(button.dataset.value);
  applyNumberInput(value);
}

function clearLongPressTimer() {
  if (longPressTimer !== null) {
    window.clearTimeout(longPressTimer);
    longPressTimer = null;
  }
}

function onNumpadPointerDown(event) {
  const button = event.target.closest("button[data-value]");
  if (!button) {
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
    if (state.fillModeValue === value) {
      setFillMode(null);
    } else {
      setFillMode(value);
    }
    longPressTriggered = true;
    clearLongPressTimer();
  }, 430);
}

function onNumpadPointerRelease() {
  clearLongPressTimer();
}

function moveSelection(deltaRow, deltaCol) {
  if (!state.board || state.won) {
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

  if (settingsModalEl.open) {
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
    return;
  }
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {
      setStatus("Game works, but offline mode could not be enabled.");
    });
  });
}

function openSettings() {
  settingsModalEl.showModal();
}

function closeSettingsOnBackdrop(event) {
  if (event.target === settingsModalEl) {
    settingsModalEl.close();
  }
}

function onShowMistakesChange(event) {
  state.showMistakes = event.target.checked;
  renderBoard();
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
settingsOpenEl.addEventListener("click", openSettings);
settingsModalEl.addEventListener("click", closeSettingsOnBackdrop);
difficultyEl.addEventListener("change", (event) => {
  state.difficulty = event.target.value;
  startNewGame();
});
showMistakesEl.addEventListener("change", onShowMistakesChange);
newGameEl.addEventListener("click", startNewGame);
hintEl.addEventListener("click", useHint);
window.addEventListener("keydown", onKeyDown);

registerServiceWorker();

if (!loadSavedGame()) {
  difficultyEl.value = state.difficulty;
  showMistakesEl.checked = state.showMistakes;
  startNewGame();
}
