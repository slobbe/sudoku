import {
  boardComplete,
  clone,
  generatePuzzle,
  isValidPlacement,
} from "./sudoku.js";

const HINTS_PER_GAME = 3;
const SAVE_KEY = "sudoku-pwa-current-game-v1";

const boardEl = document.querySelector("#board");
const settingsOpenEl = document.querySelector("#settings-open");
const settingsModalEl = document.querySelector("#settings-modal");
const difficultyEl = document.querySelector("#difficulty");
const newGameEl = document.querySelector("#new-game");
const hintEl = document.querySelector("#hint");
const eraseSelectedEl = document.querySelector("#erase-selected");
const hintsLeftEl = document.querySelector("#hints-left");
const statusTextEl = document.querySelector("#status-text");

const state = {
  difficulty: "medium",
  puzzle: null,
  solution: null,
  board: null,
  givens: new Set(),
  selected: null,
  highlightValue: null,
  hintsLeft: HINTS_PER_GAME,
  won: false,
};

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

  state.difficulty = parsed.difficulty;
  state.puzzle = parsed.puzzle;
  state.solution = parsed.solution;
  state.board = parsed.board;
  state.givens = buildGivens(parsed.puzzle);
  state.selected = null;
  state.highlightValue = null;
  state.hintsLeft = parsed.hintsLeft;
  state.won = parsed.won;

  difficultyEl.value = state.difficulty;
  updateHintsUi();
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
  const solved = boardComplete(state.board);
  state.won = solved;
  if (solved) {
    setStatus("You solved it! Start a new game for another puzzle.");
  }
}

function setCellValue(row, col, value) {
  if (state.won || isGiven(row, col)) {
    return;
  }

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
      if (state.highlightValue !== null && value === state.highlightValue) {
        cell.classList.add("match");
      }
      if (value !== 0 && !isValidPlacement(state.board, row, col, value)) {
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

  const { puzzle, solution, givens } = generatePuzzle(state.difficulty);
  state.puzzle = puzzle;
  state.solution = solution;
  state.board = clone(puzzle);
  state.givens = buildGivens(puzzle);
  state.selected = null;
  state.highlightValue = null;
  state.won = false;
  state.hintsLeft = HINTS_PER_GAME;

  updateHintsUi();
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

function eraseSelectedCell() {
  applyNumberInput(0);
}

function onBoardClick(event) {
  const cell = cellFromEventTarget(event.target);
  if (!cell) {
    return;
  }
  applySelection(cell.row, cell.col);
}

function onNumpadClick(event) {
  const button = event.target.closest("button[data-value]");
  if (!button) {
    return;
  }
  const value = Number(button.dataset.value);
  applyNumberInput(value);
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

boardEl.addEventListener("click", onBoardClick);
document.querySelector(".numpad").addEventListener("click", onNumpadClick);
settingsOpenEl.addEventListener("click", openSettings);
settingsModalEl.addEventListener("click", closeSettingsOnBackdrop);
difficultyEl.addEventListener("change", (event) => {
  state.difficulty = event.target.value;
  startNewGame();
});
newGameEl.addEventListener("click", startNewGame);
hintEl.addEventListener("click", useHint);
eraseSelectedEl.addEventListener("click", eraseSelectedCell);
window.addEventListener("keydown", onKeyDown);

registerServiceWorker();

if (!loadSavedGame()) {
  difficultyEl.value = state.difficulty;
  startNewGame();
}
