# Sudoku PWA

A local-first Sudoku progressive web app built with Next.js (App Router), React, and TypeScript.

## Features

- Unique puzzle generation
- Four technique-scored difficulties: Easy, Medium, Hard, Expert
- Daily Sudoku mode with deterministic date-based puzzles
- Background puzzle generation with cache-backed prewarming
- Configurable hints and lives
- Undo/redo and annotation (notes) mode
- Mistake highlighting against the solution
- Deterministic points scoring with per-difficulty and daily totals
- Stats tracking (overall, by difficulty, puzzle streak, daily streak, points)
- Auto-save and restore of your current game
- Optional Nostr profile and encrypted backup/restore flows
- Optional passphrase protection for locally stored Nostr keys
- Installable PWA

## Play Online

The hosted PWA is available at [slobbe.github.io/sudoku](https://slobbe.github.io/sudoku/).

## Scripts

- `bun run dev` - Start local dev server
- `bun run build` - Build production bundle
- `bun run start` - Run production server
- `bun run lint` - Run lint checks
- `bun run test` - Run unit tests

## Pages / Sitemap

- `/`
- `/play`
- `/daily`
- `/daily/:date` (example: `/daily/2026-02-26`)
- `/solver`
- `/analyzer`
- `/how-to-play`
- `/settings`
- `/statistics`
- `/profile`
- `/leaderboard`
- `/about`
- `/privacy`
- `/contact`

## Data & Privacy

- Puzzle progress and stats are stored locally in your browser (IndexedDB-first)
- Existing `localStorage` saves are migrated safely into IndexedDB when available
- If IndexedDB is unavailable or fails, saves temporarily fall back to local storage
- No account or server backend is required

## Nostr Backup and Profile (Optional)

- Nostr relay traffic only occurs on explicit user actions (no passive startup sync)
- Backup payloads are encrypted (`nip44` preferred, `nip04` fallback)
- Restore uses a confirmation step before local browser data is overwritten
- Successful restore rehydrates the in-memory app state immediately
- Local Nostr keys can be stored encrypted with an optional passphrase

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
