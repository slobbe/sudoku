import type { Board } from "@slobbe/sudoku-engine";
import type {
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
} from "react";
import { useCallback, useEffect, useRef } from "react";

export type FillModeEntry = "long-press" | "double-tap";
export type NotesBoard = number[][];

const DOUBLE_TAP_MS = 300;

export function createEmptyNotesBoard(): NotesBoard {
  return Array.from({ length: 9 }, () => Array<number>(9).fill(0));
}

export function cloneNotesBoard(notes: NotesBoard): NotesBoard {
  return notes.map((row) => row.slice());
}

export function noteBit(value: number): number {
  return 1 << (value - 1);
}

export function countDigitOnBoard(board: Board | null, value: number): number {
  if (!board) {
    return 0;
  }

  let total = 0;
  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 9; col += 1) {
      if (board[row][col] === value) {
        total += 1;
      }
    }
  }

  return total;
}

export function clearPeerNoteDigit(notes: NotesBoard, board: Board, row: number, col: number, value: number): void {
  const bit = noteBit(value);

  for (let index = 0; index < 9; index += 1) {
    if (index !== col && board[row][index] === 0) {
      notes[row][index] &= ~bit;
    }
    if (index !== row && board[index][col] === 0) {
      notes[index][col] &= ~bit;
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

type NumpadControllerOptions = {
  canInteract: () => boolean;
  getAnnotationMode: () => boolean;
  getFillModeEntry: () => FillModeEntry;
  getFillModeValue: () => number | null;
  applyNumberInput: (value: number) => void;
  toggleFillModeForDigit: (value: number) => void;
};

export function useSudokuNumpadController(options: NumpadControllerOptions) {
  const longPressTimerRef = useRef<number | null>(null);
  const longPressTriggeredRef = useRef(false);
  const lastTapDigitRef = useRef<number | null>(null);
  const lastTapAtRef = useRef(0);
  const pendingTapTimerRef = useRef<number | null>(null);

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

  const handleDoubleTapEntry = useCallback((value: number) => {
    const now = Date.now();
    const isSecondTap = lastTapDigitRef.current === value && now - lastTapAtRef.current <= DOUBLE_TAP_MS;

    if (isSecondTap) {
      resetDoubleTapTracking();
      options.toggleFillModeForDigit(value);
      return;
    }

    lastTapDigitRef.current = value;
    lastTapAtRef.current = now;

    clearPendingTapTimer();
    pendingTapTimerRef.current = window.setTimeout(() => {
      pendingTapTimerRef.current = null;
      if (options.getFillModeEntry() === "double-tap" && options.getFillModeValue() === null) {
        options.applyNumberInput(value);
      }

      if (lastTapDigitRef.current === value) {
        lastTapDigitRef.current = null;
        lastTapAtRef.current = 0;
      }
    }, DOUBLE_TAP_MS);
  }, [clearPendingTapTimer, options, resetDoubleTapTracking]);

  const onNumpadClick = useCallback((event: ReactMouseEvent<HTMLElement>) => {
    if (!options.canInteract()) {
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

    if (options.getAnnotationMode()) {
      options.applyNumberInput(value);
      return;
    }

    if (options.getFillModeEntry() === "double-tap") {
      handleDoubleTapEntry(value);
      return;
    }

    if (options.getFillModeValue() !== null) {
      return;
    }

    options.applyNumberInput(value);
  }, [handleDoubleTapEntry, options]);

  const onNumpadPointerDown = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    if (!options.canInteract() || options.getAnnotationMode() || options.getFillModeEntry() !== "long-press") {
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
      options.toggleFillModeForDigit(value);
      longPressTriggeredRef.current = true;
      clearLongPressTimer();
    }, 430);
  }, [clearLongPressTimer, options]);

  const onNumpadPointerRelease = useCallback(() => {
    clearLongPressTimer();
  }, [clearLongPressTimer]);

  useEffect(() => {
    return () => {
      clearLongPressTimer();
      clearPendingTapTimer();
    };
  }, [clearLongPressTimer, clearPendingTapTimer]);

  return {
    onNumpadClick,
    onNumpadPointerDown,
    onNumpadPointerRelease,
    clearLongPressTimer,
    resetDoubleTapTracking,
  };
}

type KeyboardControllerOptions = {
  canInteract: () => boolean;
  applyNumberInput: (value: number) => void;
  toggleAnnotationMode: () => void;
  undoMove: () => void;
  redoMove: () => void;
  hasActiveFillMode: () => boolean;
  clearFillMode: () => void;
  moveSelection: (deltaRow: number, deltaCol: number) => void;
};

export function useSudokuKeyboardController(options: KeyboardControllerOptions): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!options.canInteract()) {
        return;
      }

      if (event.key >= "1" && event.key <= "9") {
        options.applyNumberInput(Number(event.key));
        return;
      }

      if (!event.metaKey && !event.ctrlKey && event.key.toLowerCase() === "n") {
        event.preventDefault();
        options.toggleAnnotationMode();
        return;
      }

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) {
          options.redoMove();
        } else {
          options.undoMove();
        }
        return;
      }

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "y") {
        event.preventDefault();
        options.redoMove();
        return;
      }

      if (event.key === "Escape" && options.hasActiveFillMode()) {
        options.clearFillMode();
        return;
      }

      if (event.key === "Backspace" || event.key === "Delete" || event.key === "0") {
        options.applyNumberInput(0);
        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        options.moveSelection(-1, 0);
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        options.moveSelection(1, 0);
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        options.moveSelection(0, -1);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        options.moveSelection(0, 1);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [options]);
}
