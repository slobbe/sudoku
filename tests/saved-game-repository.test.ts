import { describe, expect, it } from "bun:test";
import {
  createSavedGameStorageRepository,
  resolveSavedGameStorageBackend,
} from "../src/lib/storage/saved-game-repository";
import {
  normalizeSavedGameStorageBackend,
  SAVED_GAME_STORAGE_BACKEND_INDEXEDDB,
  SAVED_GAME_STORAGE_BACKEND_LOCAL,
  type SavedGamePayload,
  type SavedGameStorageAdapter,
} from "../src/lib/storage/storage-adapter";

function createAdapter(
  backend: typeof SAVED_GAME_STORAGE_BACKEND_LOCAL | typeof SAVED_GAME_STORAGE_BACKEND_INDEXEDDB,
  payload: SavedGamePayload,
): SavedGameStorageAdapter {
  return {
    backend,
    async loadPayload() {
      return payload;
    },
    async savePayload() {
      return true;
    },
    async readConfigPayload() {
      return { theme: "slate" };
    },
    async readLegacyPayload() {
      return { legacy: true };
    },
  };
}

describe("saved game storage backend selection", () => {
  it("normalizes unknown backend to local-storage", () => {
    expect(normalizeSavedGameStorageBackend(undefined)).toBe(SAVED_GAME_STORAGE_BACKEND_LOCAL);
    expect(normalizeSavedGameStorageBackend("anything-else")).toBe(SAVED_GAME_STORAGE_BACKEND_LOCAL);
    expect(normalizeSavedGameStorageBackend(SAVED_GAME_STORAGE_BACKEND_INDEXEDDB)).toBe(SAVED_GAME_STORAGE_BACKEND_INDEXEDDB);
  });

  it("falls back to local-storage when indexeddb is not supported", () => {
    expect(resolveSavedGameStorageBackend(SAVED_GAME_STORAGE_BACKEND_INDEXEDDB, false)).toBe(SAVED_GAME_STORAGE_BACKEND_LOCAL);
  });

  it("selects indexeddb only when supported", () => {
    expect(resolveSavedGameStorageBackend(SAVED_GAME_STORAGE_BACKEND_INDEXEDDB, true)).toBe(SAVED_GAME_STORAGE_BACKEND_INDEXEDDB);
  });
});

describe("saved game storage repository", () => {
  it("uses local adapter by default", async () => {
    const localAdapter = createAdapter(SAVED_GAME_STORAGE_BACKEND_LOCAL, { source: "local" });
    const repository = createSavedGameStorageRepository({
      backend: SAVED_GAME_STORAGE_BACKEND_LOCAL,
      localAdapter,
      supportsIndexedDb: false,
    });

    expect(repository.backend).toBe(SAVED_GAME_STORAGE_BACKEND_LOCAL);
    await expect(repository.loadSavedGamePayloadFromBrowser()).resolves.toEqual({ source: "local" });
  });

  it("uses indexeddb adapter when explicitly requested and available", async () => {
    const localAdapter = createAdapter(SAVED_GAME_STORAGE_BACKEND_LOCAL, { source: "local" });
    const indexedDbAdapter = createAdapter(SAVED_GAME_STORAGE_BACKEND_INDEXEDDB, { source: "idb" });
    const repository = createSavedGameStorageRepository({
      backend: SAVED_GAME_STORAGE_BACKEND_INDEXEDDB,
      localAdapter,
      indexedDbAdapter,
      supportsIndexedDb: true,
    });

    expect(repository.backend).toBe(SAVED_GAME_STORAGE_BACKEND_INDEXEDDB);
    await expect(repository.loadSavedGamePayloadFromBrowser()).resolves.toEqual({ source: "idb" });
  });

  it("falls back to local adapter when indexeddb adapter is missing", async () => {
    const localAdapter = createAdapter(SAVED_GAME_STORAGE_BACKEND_LOCAL, { source: "local" });
    const repository = createSavedGameStorageRepository({
      backend: SAVED_GAME_STORAGE_BACKEND_INDEXEDDB,
      localAdapter,
      indexedDbAdapter: null,
      supportsIndexedDb: true,
    });

    expect(repository.backend).toBe(SAVED_GAME_STORAGE_BACKEND_LOCAL);
    await expect(repository.loadSavedGamePayloadFromBrowser()).resolves.toEqual({ source: "local" });
  });
});
