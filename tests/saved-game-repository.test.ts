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

type AdapterOptions = {
  payload?: SavedGamePayload | null;
  configPayload?: SavedGamePayload | null;
  legacyPayload?: SavedGamePayload | null;
  saveResult?: boolean;
  throwOnLoad?: boolean;
  throwOnSave?: boolean;
};

function createAdapter(
  backend: typeof SAVED_GAME_STORAGE_BACKEND_LOCAL | typeof SAVED_GAME_STORAGE_BACKEND_INDEXEDDB,
  options: AdapterOptions = {},
): { adapter: SavedGameStorageAdapter; calls: { load: number; save: number; readConfig: number; readLegacy: number } } {
  const calls = {
    load: 0,
    save: 0,
    readConfig: 0,
    readLegacy: 0,
  };

  const {
    payload = { source: backend },
    configPayload = { theme: "slate" },
    legacyPayload = { legacy: true },
    saveResult = true,
    throwOnLoad = false,
    throwOnSave = false,
  } = options;

  const adapter: SavedGameStorageAdapter = {
    backend,
    async loadPayload() {
      calls.load += 1;
      if (throwOnLoad) {
        throw new Error("load failed");
      }

      return payload;
    },
    async savePayload() {
      calls.save += 1;
      if (throwOnSave) {
        throw new Error("save failed");
      }

      return saveResult;
    },
    async readConfigPayload() {
      calls.readConfig += 1;
      return configPayload;
    },
    async readLegacyPayload() {
      calls.readLegacy += 1;
      return legacyPayload;
    },
  };

  return { adapter, calls };
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
    const { adapter: localAdapter } = createAdapter(SAVED_GAME_STORAGE_BACKEND_LOCAL, { payload: { source: "local" } });
    const repository = createSavedGameStorageRepository({
      backend: SAVED_GAME_STORAGE_BACKEND_LOCAL,
      localAdapter,
      supportsIndexedDb: false,
    });

    expect(repository.backend).toBe(SAVED_GAME_STORAGE_BACKEND_LOCAL);
    await expect(repository.loadSavedGamePayloadFromBrowser()).resolves.toEqual({ source: "local" });
  });

  it("uses indexeddb adapter when explicitly requested and available", async () => {
    const { adapter: localAdapter } = createAdapter(SAVED_GAME_STORAGE_BACKEND_LOCAL, { payload: { source: "local" } });
    const { adapter: indexedDbAdapter } = createAdapter(SAVED_GAME_STORAGE_BACKEND_INDEXEDDB, { payload: { source: "idb" } });
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
    const { adapter: localAdapter } = createAdapter(SAVED_GAME_STORAGE_BACKEND_LOCAL, { payload: { source: "local" } });
    const repository = createSavedGameStorageRepository({
      backend: SAVED_GAME_STORAGE_BACKEND_INDEXEDDB,
      localAdapter,
      indexedDbAdapter: null,
      supportsIndexedDb: true,
    });

    expect(repository.backend).toBe(SAVED_GAME_STORAGE_BACKEND_LOCAL);
    await expect(repository.loadSavedGamePayloadFromBrowser()).resolves.toEqual({ source: "local" });
  });

  it("backfills indexeddb from local when indexeddb payload is missing", async () => {
    const { adapter: localAdapter, calls: localCalls } = createAdapter(SAVED_GAME_STORAGE_BACKEND_LOCAL, { payload: { source: "local" } });
    const { adapter: indexedDbAdapter, calls: indexedDbCalls } = createAdapter(
      SAVED_GAME_STORAGE_BACKEND_INDEXEDDB,
      { payload: null },
    );
    const repository = createSavedGameStorageRepository({
      backend: SAVED_GAME_STORAGE_BACKEND_INDEXEDDB,
      localAdapter,
      indexedDbAdapter,
      supportsIndexedDb: true,
    });

    await expect(repository.loadSavedGamePayloadFromBrowser()).resolves.toEqual({ source: "local" });
    expect(indexedDbCalls.load).toBe(1);
    expect(localCalls.load).toBe(1);
    expect(indexedDbCalls.save).toBe(1);
  });

  it("falls back to local when indexeddb load throws", async () => {
    const { adapter: localAdapter } = createAdapter(SAVED_GAME_STORAGE_BACKEND_LOCAL, { payload: { source: "local" } });
    const { adapter: indexedDbAdapter } = createAdapter(SAVED_GAME_STORAGE_BACKEND_INDEXEDDB, {
      throwOnLoad: true,
      payload: null,
    });
    const repository = createSavedGameStorageRepository({
      backend: SAVED_GAME_STORAGE_BACKEND_INDEXEDDB,
      localAdapter,
      indexedDbAdapter,
      supportsIndexedDb: true,
    });

    await expect(repository.loadSavedGamePayloadFromBrowser()).resolves.toEqual({ source: "local" });
  });

  it("uses dual-write success when local save works and indexeddb save fails", async () => {
    const { adapter: localAdapter, calls: localCalls } = createAdapter(SAVED_GAME_STORAGE_BACKEND_LOCAL, { saveResult: true });
    const { adapter: indexedDbAdapter, calls: indexedDbCalls } = createAdapter(
      SAVED_GAME_STORAGE_BACKEND_INDEXEDDB,
      { saveResult: false },
    );
    const repository = createSavedGameStorageRepository({
      backend: SAVED_GAME_STORAGE_BACKEND_INDEXEDDB,
      localAdapter,
      indexedDbAdapter,
      supportsIndexedDb: true,
    });

    await expect(repository.saveSavedGamePayloadToBrowser({ value: 1 })).resolves.toBe(true);
    expect(indexedDbCalls.save).toBe(1);
    expect(localCalls.save).toBe(1);
  });

  it("uses dual-write success when indexeddb save works and local save fails", async () => {
    const { adapter: localAdapter, calls: localCalls } = createAdapter(SAVED_GAME_STORAGE_BACKEND_LOCAL, { saveResult: false });
    const { adapter: indexedDbAdapter, calls: indexedDbCalls } = createAdapter(
      SAVED_GAME_STORAGE_BACKEND_INDEXEDDB,
      { saveResult: true },
    );
    const repository = createSavedGameStorageRepository({
      backend: SAVED_GAME_STORAGE_BACKEND_INDEXEDDB,
      localAdapter,
      indexedDbAdapter,
      supportsIndexedDb: true,
    });

    await expect(repository.saveSavedGamePayloadToBrowser({ value: 1 })).resolves.toBe(true);
    expect(indexedDbCalls.save).toBe(1);
    expect(localCalls.save).toBe(1);
  });

  it("fails save only when both indexeddb and local writes fail", async () => {
    const { adapter: localAdapter } = createAdapter(SAVED_GAME_STORAGE_BACKEND_LOCAL, { saveResult: false });
    const { adapter: indexedDbAdapter } = createAdapter(SAVED_GAME_STORAGE_BACKEND_INDEXEDDB, { saveResult: false });
    const repository = createSavedGameStorageRepository({
      backend: SAVED_GAME_STORAGE_BACKEND_INDEXEDDB,
      localAdapter,
      indexedDbAdapter,
      supportsIndexedDb: true,
    });

    await expect(repository.saveSavedGamePayloadToBrowser({ value: 1 })).resolves.toBe(false);
  });
});
