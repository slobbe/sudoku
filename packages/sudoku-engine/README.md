# @slobbe/sudoku-engine

Framework-agnostic Sudoku generator, solver, and validation utilities.

Difficulty labels are technique-scored (`easy`, `medium`, `hard`, `expert`) instead of clue-count-only.
Current scoring techniques: naked/hidden singles, locked candidates, naked/hidden pairs, X-Wing, and Swordfish.
Generation is clue-range sampled independently from requested difficulty; only technique score decides the final label.

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
- `generatePuzzleCandidate(difficultyHint?, options?)`
- `generateSolvedBoard(rng?)`
- `solveBoard(inputBoard)`
- `countSolutions(inputBoard, limit?)`
- `boardComplete(board)`
- `isValidPlacement(board, row, col, value)`
- `clone(board)`
- `ratePuzzleDifficulty(inputBoard)`

Deterministic helpers:

- `createSeededRng(seed)`
- `dateSeed(date?, mode?)`

Types:

- `Board`
- `Difficulty`
- `PuzzleCandidate`
- `DateSeedMode`
- `PuzzleGenerationOptions`

## Tuning

Run `bun run benchmark:difficulty` from `packages/sudoku-engine` to sample score and label distributions by hint.
