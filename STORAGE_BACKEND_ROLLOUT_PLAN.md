# Storage Backend Rollout Plan

This document tracks the rollout path from localStorage-first persistence to an IndexedDB-first storage backend.

## Current State

- `app-v0.5.0` is tagged at commit `0511e31`.
- Post-release storage work is on `dev` with:
  - `cc00f8c` - adapter/repository foundation
  - `4d9c8ec` - IndexedDB adapter + dual-write behavior
- Backend selection flag:
  - `NEXT_PUBLIC_SAVED_GAME_BACKEND` unset (default): auto-select IndexedDB when supported
  - `NEXT_PUBLIC_SAVED_GAME_BACKEND=local-storage`: emergency rollback override
  - `NEXT_PUBLIC_SAVED_GAME_BACKEND=indexeddb`: force IndexedDB when supported

## Goal

- Keep storage resilient during migration.
- Use IndexedDB as the primary backend where supported.
- Preserve localStorage compatibility and rollback safety.

## Rollout Strategy

### Phase 1 (Done)

- Added storage adapter interface and repository layer.
- Converted app save/load call sites to async repository API.
- Added initial repository backend-selection tests.

### Phase 2 (Done)

- Added IndexedDB adapter implementation.
- Enabled IndexedDB as primary by default when supported.
- Implemented fallback + backfill:
  - load from IDB first
  - fallback to localStorage when needed
  - backfill IDB from localStorage payload
- Replaced steady-state dual-write with IDB-primary writes.
- Added temporary local fallback writes on IDB save failure.

## Next Steps (Feature Work)

1. Push latest `dev` commits to remote (`cc00f8c`, `4d9c8ec`).
2. Expand robustness checks:
   - explicit handling/tests for blocked/open/transaction edge cases in IndexedDB.
3. Create a manual QA checklist for both backend modes.
4. Keep local-storage override available for one release cycle.

## Manual QA Checklist

Run each scenario with:

- `NEXT_PUBLIC_SAVED_GAME_BACKEND` unset (default auto mode)
- `NEXT_PUBLIC_SAVED_GAME_BACKEND=local-storage` (forced rollback mode)

Scenarios:

- Start a new puzzle, make progress, refresh page, verify restore.
- Close/reopen browser tab, verify restore.
- Use hints/lives/notes, verify persistence after reload.
- Restore backup from Nostr and verify local save state.
- Switch themes and verify persisted theme on reload.
- Simulate offline mode and verify app still restores state.
- In auto mode, verify fallback behavior if IDB is unavailable or a write fails.

## Release Guidance

- Do not retag `app-v0.5.0`.
- Keep these changes on `dev` until confidence is high.
- For release, create a new app tag (e.g. `app-v0.5.1`) after bake and QA.
