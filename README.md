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
npm ci
npm run dev
```

Open `http://localhost:3000`.

## View Flow

- Home view: Continue Puzzle (when available), New Puzzle, Settings, Statistics
- Game view: Reset/Home top bar, Undo/Redo + Lives + Hint subbar, centered 1:1 board, numpad
- Settings and Statistics are full views (not modals)

## Scripts

- `npm run dev` - Start local dev server
- `npm run build` - Build production bundle
- `npm run start` - Run production server
- `npm run lint` - Run lint checks
- `npm test` - Run unit tests
- `npm run test:watch` - Run tests in watch mode

## Testing & Validation

Run these checks before opening a PR or cutting a release:

```bash
npm run lint
npm test
npm run build
```

Run a single test file:

```bash
npm test -- tests/sudoku.test.ts
```

Run a single test by name:

```bash
npm test -- tests/sudoku.test.ts -t "generates puzzles with exactly one solution"
```

Equivalent direct Vitest command:

```bash
npx vitest run tests/sudoku.test.ts -t "generates puzzles with exactly one solution"
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
- `package-lock.json` (`version`)
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
- `src/lib/sudoku.ts` - Puzzle generation/solver/validation logic
- `tests/sudoku.test.ts` - Engine tests
