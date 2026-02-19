# Sudoku PWA

A Sudoku app built with Next.js (App Router), React, and TypeScript.

## Features

- Unique puzzle generation
- Three difficulties: Easy, Medium, Hard
- Daily Sudoku mode with deterministic date-based puzzles
- Configurable hints and lives
- Undo/redo and annotation (notes) mode
- Mistake highlighting against the solution
- Stats tracking (overall, by difficulty, puzzle streak, daily streak)
- Auto-save and restore of your current game
- Installable PWA

## Play Online

The hosted PWA is available at [slobbe.github.io/sudoku](https://slobbe.github.io/sudoku/).

## Scripts

- `bun run dev` - Start local dev server
- `bun run build` - Build production bundle
- `bun run start` - Run production server
- `bun run lint` - Run lint checks
- `bun run test` - Run unit tests

## Data & Privacy

- Puzzle progress and stats are stored locally in your browser (`localStorage`)
- Existing save compatibility is preserved with key `sudoku-pwa-current-game-v1`
- No account or server backend is required

## Packages

This monorepo also contains reusable workspace packages:

- `@slobbe/sudoku-board` - [`packages/sudoku-board/README.md`](/packages/sudoku-board/README.md)
- `@slobbe/sudoku-engine` - [`packages/sudoku-engine/README.md`](/packages/sudoku-engine/README.md)

## Project Structure

- `app/` - Next.js App Router entry/layout and global styles
- `src/components/sudoku-app.tsx` - Main application UI and state flow
- `src/lib/sudoku.ts` - Compatibility re-export to engine package
- `packages/sudoku-board/` - Reusable board package
- `packages/sudoku-engine/` - Reusable engine package

## Contributing

Contributor workflows, validation expectations, deployment, and release procedures are documented in [`CONTRIBUTING.md`](/CONTRIBUTING.md).
