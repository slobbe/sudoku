# Sudoku PWA

An offline-capable Sudoku puzzle app built with Next.js (App Router), React, and TypeScript.

## Features

- Unique puzzle generation (exactly one solution)
- Three difficulties: Easy, Medium, Hard
- Hints (3 per puzzle)
- Lives system (3 lives per puzzle)
- Undo/redo support
- Fill mode with configurable trigger:
  - Double tap (default)
  - Long press
- Optional immediate mistake highlighting (checked against the true solution)
- Eye-friendly themes:
  - Slate (default)
  - Dusk
  - Mist
  - Amber
- Stats tracking (overall, by difficulty, streaks)
- Auto-save and restore of your current puzzle
- Installable PWA with offline support and update checks

## Quick Start

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Scripts

- `npm run dev` - Start local dev server
- `npm run build` - Build production bundle
- `npm run start` - Run production server
- `npm run lint` - Run lint checks
- `npm test` - Run unit tests

## Data & Privacy

- Puzzle progress and stats are stored locally in your browser (`localStorage`)
- Existing save compatibility is preserved with key: `sudoku-pwa-current-game-v1`
- No account or server backend is required

## PWA Notes

- Manifest: `public/manifest.webmanifest`
- Service worker: `public/sw.js`
- Icons: `public/icons/`
- Update flow (check/apply) is available from Settings

When releasing a new version, keep app version values aligned in:

- `src/components/sudoku-app.tsx` (`APP_VERSION`)
- `public/sw.js` (`APP_VERSION`, used by cache naming)

## Project Structure

- `app/layout.tsx` - Metadata, manifest/icons wiring
- `app/page.tsx` - Main page entry
- `app/globals.css` - Global styling and themes
- `src/components/sudoku-app.tsx` - App UI and puzzle interactions
- `src/lib/sudoku.ts` - Puzzle generation/solver/validation logic
- `tests/sudoku.test.ts` - Engine tests
