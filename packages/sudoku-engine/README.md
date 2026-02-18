# @slobbe/sudoku-engine

Framework-agnostic Sudoku generator, solver, and validation utilities.

## Install

```bash
npm install @slobbe/sudoku-engine
```

## Quick Start

```ts
import { generatePuzzle, solveBoard } from "@slobbe/sudoku-engine";

const candidate = generatePuzzle("medium");
const solved = solveBoard(candidate.puzzle);
```

## Deterministic Generation

```ts
import { dateSeed, generatePuzzle } from "@slobbe/sudoku-engine";

const daily = generatePuzzle("medium", { seed: `daily:v1:${dateSeed()}` });
```

- `dateSeed()` defaults to local date mode.
- For UTC-based seeds, use `dateSeed(new Date(), "utc")`.

## API Overview

Core functions:

- `generatePuzzle(difficulty?, options?)`
- `generateSolvedBoard(rng?)`
- `solveBoard(inputBoard)`
- `countSolutions(inputBoard, limit?)`
- `boardComplete(board)`
- `isValidPlacement(board, row, col, value)`
- `clone(board)`

Deterministic helpers:

- `createSeededRng(seed)`
- `dateSeed(date?, mode?)`

Types:

- `Board`
- `Difficulty`
- `PuzzleCandidate`
- `DateSeedMode`
- `PuzzleGenerationOptions`
