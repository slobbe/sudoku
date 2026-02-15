import type { ReactNode } from "react";
import styles from "./sudoku-board.module.css";

export type SudokuBoardSelection = {
  row: number;
  col: number;
};

export type SudokuBoardColorScheme = "auto" | "light" | "dark";

export type SudokuBoardProps = {
  board: number[][];
  notes?: number[][];
  givens?: ReadonlySet<string>;
  selected?: SudokuBoardSelection | null;
  highlightedValue?: number | null;
  showSelectionHighlights?: boolean;
  showMistakes?: boolean;
  solution?: number[][] | null;
  onCellSelect?: (row: number, col: number) => void;
  id?: string;
  className?: string;
  ariaLabel?: string;
  colorScheme?: SudokuBoardColorScheme;
};

const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

function keyOf(row: number, col: number): string {
  return `${row}-${col}`;
}

function noteBit(value: number): number {
  return 1 << (value - 1);
}

function noteMaskHasValue(mask: number, value: number): boolean {
  return (mask & noteBit(value)) !== 0;
}

function noteMaskDigits(mask: number): number[] {
  const values: number[] = [];
  for (const digit of DIGITS) {
    if (noteMaskHasValue(mask, digit)) {
      values.push(digit);
    }
  }
  return values;
}

function renderCellValue(value: number, noteMask: number, highlightedValue: number | null): ReactNode {
  if (value !== 0) {
    return String(value);
  }
  if (noteMask === 0) {
    return "";
  }

  return (
    <span className={styles.notes} aria-hidden="true">
      {DIGITS.map((digit) => {
        const hasNote = noteMaskHasValue(noteMask, digit);
        const isHighlighted = hasNote && highlightedValue === digit;
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
  board,
  notes,
  givens,
  selected = null,
  highlightedValue = null,
  showSelectionHighlights = false,
  showMistakes = false,
  solution,
  onCellSelect,
  id,
  className,
  ariaLabel = "Sudoku grid",
  colorScheme = "auto",
}: SudokuBoardProps) {
  const givenSet = givens ?? new Set<string>();
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

              const value = board[row]?.[col] ?? 0;
              const given = givenSet.has(keyOf(row, col));
              const noteMask = value === 0 ? (notes?.[row]?.[col] ?? 0) : 0;
              const noteDigits = noteMask === 0 ? [] : noteMaskDigits(noteMask);

              const classes = [styles.cell];
              const isSelected = Boolean(showSelectionHighlights && selected && selected.row === row && selected.col === col);

              if (given) {
                classes.push(styles.given);
              }

              if (isSelected) {
                classes.push(styles.selected);
              } else if (showSelectionHighlights && selected) {
                const sameRowOrCol = selected.row === row || selected.col === col;
                const sameBox =
                  Math.floor(selected.row / 3) === Math.floor(row / 3)
                  && Math.floor(selected.col / 3) === Math.floor(col / 3);

                if (sameRowOrCol) {
                  classes.push(styles.peer);
                } else if (sameBox) {
                  classes.push(styles.peerBox);
                }
              }

              if (highlightedValue !== null && value === highlightedValue) {
                classes.push(styles.match);
              }

              if (showMistakes && value !== 0 && !given && solution && value !== (solution[row]?.[col] ?? 0)) {
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
                  role="gridcell"
                  aria-label={labelParts.join(", ")}
                  aria-selected={isSelected || undefined}
                  aria-readonly={given || undefined}
                  onClick={() => {
                    onCellSelect?.(row, col);
                  }}
                >
                  {renderCellValue(value, noteMask, highlightedValue)}
                </button>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
