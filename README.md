# Sudoku PWA

A simple, offline-capable Sudoku game built with vanilla JavaScript.

## Features

- Unique puzzle generation (exactly one solution)
- Three difficulties: Easy, Medium, Hard
- Hints (3 per game)
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
- Auto-save and restore of your current game
- Installable PWA with offline support and update checks

## Controls

- Select a cell, then enter `1-9`
- Clear a cell with `Backspace`, `Delete`, or `0`
- Move with arrow keys
- Undo: `Ctrl/Cmd + Z`
- Redo: `Ctrl/Cmd + Shift + Z` or `Ctrl/Cmd + Y`
- Use Hint to reveal one correct cell

## Data & Privacy

- Game progress and stats are stored locally in your browser (`localStorage`)
- No account or server backend is required

## Contributing

Developer setup, versioning notes, and project structure live in `CONTRIBUTING.md`.
