# Contributing

Thanks for contributing to Sudoku PWA.

## Monorepo Layout

- App: Next.js Sudoku PWA at the repository root
- Board package: `@slobbe/sudoku-board` in `packages/sudoku-board`
- Engine package: `@slobbe/sudoku-engine` in `packages/sudoku-engine`

For package usage and API docs, see:

- `packages/sudoku-board/README.md`
- `packages/sudoku-engine/README.md`

## Local Setup

```bash
bun install --frozen-lockfile
```

Common commands:

- `bun run dev`
- `bun run lint`
- `bun run test`
- `bun run build`

## Validation Expectations

After code changes, run:

```bash
bun run lint
bun run test
```

Also run `bun run build` when changing app UI, routing, PWA behavior, or runtime imports.

When changing package source or exports, run:

```bash
bun run build:packages
```

Useful test patterns:

```bash
# Single test file
bun test tests/sudoku.test.ts

# Test by name
bun test tests/sudoku.test.ts -t "generates puzzles with exactly one solution"

# Watch mode
bun run test:watch
```

## Deployment (GitHub Pages)

The app is statically exported and deployed via GitHub Actions.

- Workflow: `.github/workflows/deploy-pages.yml`
- Trigger: push to `main` (or manual dispatch)
- Output folder: `out/`

The workflow computes `NEXT_PUBLIC_BASE_PATH` automatically for user-site vs project-site repos.

## Release Procedures

### App Release Checklist

Before shipping an app update, keep these values aligned:

- `package.json` `version`
- `bun.lock`
- `src/components/sudoku-app.tsx` `APP_VERSION`
- `public/sw.js` `APP_VERSION`

Then push to `main` to trigger the Pages deploy workflow.

### NPM Package Publishing

Package publishing is tag-driven via `.github/workflows/publish-packages.yml`.

Tag formats:

- `sudoku-board-v<version>` publishes `@slobbe/sudoku-board`
- `sudoku-engine-v<version>` publishes `@slobbe/sudoku-engine`

Flow:

1. Bump version in the target package `package.json`.
2. Commit and push to `main`.
3. Create and push the matching tag.

```bash
# Example: board 0.1.1
git tag sudoku-board-v0.1.1
git push origin sudoku-board-v0.1.1

# Example: engine 0.1.1
git tag sudoku-engine-v0.1.1
git push origin sudoku-engine-v0.1.1
```

Required repository secret:

- `NPM_TOKEN` with publish rights for the `@slobbe` scope
