# Sudoku PWA

An offline-capable Sudoku puzzle app built with Next.js (App Router), React, and TypeScript.

## Features

- Unique puzzle generation (exactly one solution)
- Three difficulties: Easy, Medium, Hard
- Configurable hints per puzzle
- Configurable lives per puzzle
- Undo/redo support
- Fill mode with configurable trigger:
  - Double tap (default)
  - Long press
- Annotation mode for penciling candidate numbers in empty cells
- Immediate mistake highlighting (checked against the true solution)
- Eye-friendly themes:
  - Slate (default)
  - Dusk
  - Mist
  - Amber
- Stats tracking (overall, by difficulty, streaks)
- Auto-save and restore of your current puzzle
- Installable PWA with offline support and automatic update detection
- Home, Settings, and Statistics as dedicated views

## Quick Start

```bash
bun install --frozen-lockfile
bun run dev
```

Open `http://localhost:3000`.

## View Flow

- Home view: Continue Puzzle (when available), New Puzzle, Settings, Statistics
- Game view: Reset/Home top bar, Undo/Redo + Lives + Hint subbar, centered 1:1 board, numpad
- Settings and Statistics are full views (not modals)

## Scripts

- `bun run dev` - Start local dev server
- `bun run build` - Build production bundle
- `bun run start` - Run production server
- `bun run lint` - Run lint checks
- `bun run test` - Run unit tests
- `bun run test:watch` - Run tests in watch mode

## Testing & Validation

Run these checks before opening a PR or cutting a release:

```bash
bun run lint
bun run test
bun run build
```

Run a single test file:

```bash
bun test tests/sudoku.test.ts
```

Run a single test by name:

```bash
bun test tests/sudoku.test.ts -t "generates puzzles with exactly one solution"
```

Watch mode:

```bash
bun run test:watch
```

## Data & Privacy

- Puzzle progress and stats are stored locally in your browser (`localStorage`)
- Existing save compatibility is preserved with key: `sudoku-pwa-current-game-v1`
- No account or server backend is required

## PWA Notes

- Manifest: `public/manifest.webmanifest`
- Service worker: `public/sw.js`
- Icons: `public/icons/`
- Update status is shown in Settings
- Service worker is intentionally disabled in development

When releasing a new version, keep app version values aligned in:

- `package.json` (`version`)
- `bun.lock` (lockfile)
- `src/components/sudoku-app.tsx` (`APP_VERSION`)
- `public/sw.js` (`APP_VERSION`, used by cache naming)

## GitHub Pages Deployment

This project is configured for static export and GitHub Pages deployment.

- Next.js static export is enabled in `next.config.ts` (`output: "export"`)
- GitHub Actions workflow: `.github/workflows/deploy-pages.yml`
- Build output folder: `out/`

Steps:

1. Push changes to `main`.
2. In GitHub repository settings, set Pages source to `GitHub Actions`.
3. Wait for `Deploy to GitHub Pages` workflow to finish.

The workflow automatically sets `NEXT_PUBLIC_BASE_PATH`:

- User site repo (`<user>.github.io`): empty base path
- Project repo (`<repo>`): `/<repo>`

## Project Structure

- `app/layout.tsx` - Metadata, manifest/icons wiring
- `app/page.tsx` - Main page entry
- `app/globals.css` - Global styling and themes
- `src/components/sudoku-app.tsx` - App UI and puzzle interactions
- `src/lib/sudoku.ts` - Compatibility re-export to engine package
- `tests/sudoku.test.ts` - Engine tests
- `packages/sudoku-board/` - Reusable board workspace package (`@slobbe/sudoku-board`)
- `packages/sudoku-engine/` - Reusable puzzle engine workspace package (`@slobbe/sudoku-engine`)

## Board Package (Workspace)

The Sudoku board UI is extracted to a reusable workspace package:

- Package name: `@slobbe/sudoku-board`
- Component export: `SudokuBoard`
- Styles are bundled with the component (no separate CSS import)
- Color scheme prop: `colorScheme?: "auto" | "light" | "dark"` (`"auto"` by default)

The package ships with neutral defaults in both light and dark mode:

- `auto`: follows `prefers-color-scheme`
- `light`: forces neutral light palette
- `dark`: forces neutral dark palette

The board is themed through CSS variables on the `className` you pass to `SudokuBoard`, for example:

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

## Engine Package (Workspace)

Puzzle generation and validation logic is extracted to a reusable workspace package:

- Package name: `@slobbe/sudoku-engine`
- Core exports: `generatePuzzle`, `solveBoard`, `countSolutions`, `boardComplete`, `isValidPlacement`, `clone`
- Types: `Board`, `Difficulty`, `PuzzleCandidate`
