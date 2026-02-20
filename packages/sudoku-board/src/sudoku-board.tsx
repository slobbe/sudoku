"use client";

import type { ReactNode } from "react";
import { SUDOKU_DIGITS } from "./helpers";
import styles from "./sudoku-board.module.css";

export type SudokuBoardCell = {
  row: number;
  col: number;
};

export type SudokuBoardColorScheme = "auto" | "light" | "dark";

export type SudokuBooleanBoard = boolean[][];

export type SudokuNoteDigitsBoard = number[][][];

export type SudokuBoardProps = {
  values: number[][];
  givens?: SudokuBooleanBoard;
  notes?: SudokuNoteDigitsBoard;
  selectedCell?: SudokuBoardCell | null;
  highlightedDigit?: number | null;
  invalidCells?: SudokuBooleanBoard;
  showSelectionHighlights?: boolean;
  disabled?: boolean;
  onSelectCell?: (cell: SudokuBoardCell) => void;
  id?: string;
  className?: string;
  ariaLabel?: string;
  colorScheme?: SudokuBoardColorScheme;
};

function isSudokuDigit(value: number): value is (typeof SUDOKU_DIGITS)[number] {
  return Number.isInteger(value) && value >= 1 && value <= 9;
}

function normalizeNoteDigits(noteDigits: number[] | undefined): number[] {
  if (!noteDigits || noteDigits.length === 0) {
    return [];
  }

  return SUDOKU_DIGITS.filter((digit) => noteDigits.some((value) => value === digit));
}

function renderCellValue(value: number, noteDigits: number[], highlightedDigit: number | null): ReactNode {
  if (value !== 0) {
    return String(value);
  }
  if (noteDigits.length === 0) {
    return "";
  }

  return (
    <span className={styles.notes} aria-hidden="true">
      {SUDOKU_DIGITS.map((digit) => {
        const hasNote = noteDigits.includes(digit);
        const isHighlighted = hasNote && highlightedDigit === digit;
        const noteClassName = [styles.note];
        if (!hasNote) {
          noteClassName.push(styles.noteEmpty);
        }
        if (isHighlighted) {
          noteClassName.push(styles.noteHighlight);
        }

        return (
          <span
            key={`note-${digit}`}
            className={noteClassName.join(" ")}
          >
            {digit}
          </span>
        );
      })}
    </span>
  );
}

export function SudokuBoard({
  values,
  givens,
  notes,
  selectedCell = null,
  highlightedDigit = null,
  invalidCells,
  showSelectionHighlights = false,
  disabled = false,
  onSelectCell,
  id,
  className,
  ariaLabel = "Sudoku grid",
  colorScheme = "auto",
}: SudokuBoardProps) {
  const boardClassName = className ? `${styles.board} ${className}` : styles.board;

  return (
    <div
      id={id}
      className={boardClassName}
      role="grid"
      aria-label={ariaLabel}
      data-sudoku-color-scheme={colorScheme}
    >
      {Array.from({ length: 9 }, (_, squareIndex) => {
        const squareRow = Math.floor(squareIndex / 3);
        const squareCol = squareIndex % 3;
        const squareToneClass = (squareRow + squareCol) % 2 === 0 ? "tone-a" : "tone-b";
        const squareClassName = [styles.square, squareToneClass === "tone-a" ? styles.squareToneA : styles.squareToneB].join(" ");

        return (
          <div key={`square-${squareIndex}`} className={squareClassName} role="rowgroup">
            {Array.from({ length: 9 }, (_, cellIndex) => {
              const localRow = Math.floor(cellIndex / 3);
              const localCol = cellIndex % 3;
              const row = squareRow * 3 + localRow;
              const col = squareCol * 3 + localCol;

              const value = values[row]?.[col] ?? 0;
              const given = Boolean(givens?.[row]?.[col]);
              const noteDigits = value === 0 ? normalizeNoteDigits(notes?.[row]?.[col]) : [];
              const isInvalid = Boolean(invalidCells?.[row]?.[col]);

              const classes = [styles.cell];
              const isSelected = Boolean(
                showSelectionHighlights
                && selectedCell
                && selectedCell.row === row
                && selectedCell.col === col,
              );
              let isPeer = false;
              let isPeerBox = false;
              const isMatch = Boolean(highlightedDigit !== null && isSudokuDigit(highlightedDigit) && value === highlightedDigit);

              if (given) {
                classes.push(styles.given);
              }

              if (isSelected) {
                classes.push(styles.selected);
              } else if (showSelectionHighlights && selectedCell) {
                const sameRowOrCol = selectedCell.row === row || selectedCell.col === col;
                const sameBox =
                  Math.floor(selectedCell.row / 3) === Math.floor(row / 3)
                  && Math.floor(selectedCell.col / 3) === Math.floor(col / 3);

                if (sameRowOrCol) {
                  isPeer = true;
                  classes.push(styles.peer);
                } else if (sameBox) {
                  isPeerBox = true;
                  classes.push(styles.peerBox);
                }
              }

              if (isMatch) {
                classes.push(styles.match);
              }

              if (isInvalid) {
                classes.push(styles.invalid);
              }

              const labelParts = [`Row ${row + 1}, Column ${col + 1}`];
              if (value !== 0) {
                labelParts.push(`Value ${value}`);
              } else if (noteDigits.length > 0) {
                labelParts.push(`Notes ${noteDigits.join(" ")}`);
              }

              return (
                <button
                  key={`${row}-${col}`}
                  type="button"
                  className={classes.join(" ")}
                  data-sudoku-cell="true"
                  data-row={row}
                  data-col={col}
                  data-sudoku-given={given ? "true" : undefined}
                  data-sudoku-selected={isSelected ? "true" : undefined}
                  data-sudoku-peer={isPeer ? "true" : undefined}
                  data-sudoku-peer-box={isPeerBox ? "true" : undefined}
                  data-sudoku-match={isMatch ? "true" : undefined}
                  data-sudoku-invalid={isInvalid ? "true" : undefined}
                  role="gridcell"
                  aria-label={labelParts.join(", ")}
                  aria-selected={isSelected || undefined}
                  aria-readonly={given || undefined}
                  disabled={disabled}
                  onClick={() => {
                    onSelectCell?.({ row, col });
                  }}
                >
                  {renderCellValue(value, noteDigits, highlightedDigit)}
                </button>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
