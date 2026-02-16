# @slobbe/sudoku-board

Reusable React Sudoku board component with neutral defaults, optional light/dark color schemes, and CSS-variable theming.

## Install

```bash
npm install @slobbe/sudoku-board
```

Peer dependencies:

- `react` (`^18.2.0 || ^19.0.0`)
- `react-dom` (`^18.2.0 || ^19.0.0`)

## Quick Start

```tsx
import { SudokuBoard } from "@slobbe/sudoku-board";

const values = Array.from({ length: 9 }, () => Array<number>(9).fill(0));

export function Example() {
  return (
    <SudokuBoard
      values={values}
      onSelectCell={({ row, col }) => {
        console.log("selected", row, col);
      }}
    />
  );
}
```

## Component API

`SudokuBoard` is a controlled UI component. It does not own puzzle logic.

- `values: number[][]` - required 9x9 board values (`0..9`, where `0` is empty).
- `givens?: boolean[][]` - optional 9x9 flags for fixed cells.
- `notes?: number[][][]` - optional 9x9 arrays of note digits per cell.
- `selectedCell?: { row: number; col: number } | null` - selected cell.
- `highlightedDigit?: number | null` - highlights cells with this value and matching notes.
- `invalidCells?: boolean[][]` - optional 9x9 flags for invalid entries.
- `showSelectionHighlights?: boolean` - selected/peer/box highlighting toggle.
- `disabled?: boolean` - disables cell interaction.
- `onSelectCell?: (cell: { row: number; col: number }) => void` - cell click callback.
- `colorScheme?: "auto" | "light" | "dark"` - neutral palette mode (`"auto"` default).
- `className?: string`, `id?: string`, `ariaLabel?: string`.

## Helper Exports

To simplify integration, the package exports utility helpers:

- `SUDOKU_DIGITS`
- `cellKey(row, col)`
- `createBooleanBoard(initial?)`
- `digitsToNoteMask(digits)`
- `noteMaskToDigits(mask)`
- `hasNoteDigit(mask, digit)`
- `toggleNoteDigit(mask, digit)`
- `noteMaskBoardToDigitsBoard(noteMaskBoard)`
- `givensSetToBooleanBoard(set)`

These are useful when migrating from bitmask/set-based state to board props.

## Theming

Pass a class to `className` and set `--sudoku-*` variables there.

```css
.myBoardTheme {
  --sudoku-cell-bg: #101820;
  --sudoku-cell-bg-alt: #142230;
  --sudoku-cell-ink: #f4f7fb;
  --sudoku-given-bg: #1b2c3a;
  --sudoku-active-bg: #24435b;
  --sudoku-match-ring: #68b8ff;
}
```

Common variables:

- `--sudoku-cell-bg`, `--sudoku-cell-bg-alt`, `--sudoku-cell-ink`
- `--sudoku-given-bg`, `--sudoku-given-ink`
- `--sudoku-active-bg`, `--sudoku-active-ring`
- `--sudoku-peer-bg`, `--sudoku-peer-ring`
- `--sudoku-peer-box-bg`, `--sudoku-peer-box-ring`
- `--sudoku-match-bg`, `--sudoku-match-ink`, `--sudoku-match-ring`
- `--sudoku-invalid-ink`, `--sudoku-focus-ring`
- `--sudoku-note-font-size`, `--sudoku-note-highlight-scale`

## Accessibility

- Board root has `role="grid"`.
- Cells have `role="gridcell"` and announce row/column and value/notes.
- Selected and readonly states are announced with ARIA attributes.
