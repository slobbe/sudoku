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
  clearResult?: boolean;
  throwOnLoad?: boolean;
  throwOnSave?: boolean;
  throwOnClear?: boolean;
};

function createAdapter(
  backend: typeof SAVED_GAME_STORAGE_BACKEND_LOCAL | typeof SAVED_GAME_STORAGE_BACKEND_INDEXEDDB,
  options: AdapterOptions = {},
): { adapter: SavedGameStorageAdapter; calls: { load: number; save: number; clear: number; readConfig: number; readLegacy: number } } {
  const calls = {
    load: 0,
    save: 0,
    clear: 0,
    readConfig: 0,
    readLegacy: 0,
  };

  const {
    payload = { source: backend },
    configPayload = { theme: "slate" },
    legacyPayload = { legacy: true },
    saveResult = true,
    clearResult = true,
    throwOnLoad = false,
    throwOnSave = false,
    throwOnClear = false,
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
    async clearPayload() {
      calls.clear += 1;
      if (throwOnClear) {
        throw new Error("clear failed");
      }

      return clearResult;
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

  it("defaults to indexeddb when backend is not configured and supported", () => {
    expect(resolveSavedGameStorageBackend(undefined, true)).toBe(SAVED_GAME_STORAGE_BACKEND_INDEXEDDB);
  });

  it("defaults to local-storage when backend is not configured and indexeddb is unsupported", () => {
    expect(resolveSavedGameStorageBackend(undefined, false)).toBe(SAVED_GAME_STORAGE_BACKEND_LOCAL);
  });

  it("falls back to local-storage when indexeddb is not supported", () => {
    expect(resolveSavedGameStorageBackend(SAVED_GAME_STORAGE_BACKEND_INDEXEDDB, false)).toBe(SAVED_GAME_STORAGE_BACKEND_LOCAL);
  });

  it("selects indexeddb only when supported", () => {
    expect(resolveSavedGameStorageBackend(SAVED_GAME_STORAGE_BACKEND_INDEXEDDB, true)).toBe(SAVED_GAME_STORAGE_BACKEND_INDEXEDDB);
  });
});

describe("saved game storage repository", () => {
  it("uses indexeddb by default when supported", async () => {
    const { adapter: localAdapter } = createAdapter(SAVED_GAME_STORAGE_BACKEND_LOCAL, { payload: { source: "local" } });
    const { adapter: indexedDbAdapter } = createAdapter(SAVED_GAME_STORAGE_BACKEND_INDEXEDDB, { payload: { source: "idb" } });
    const repository = createSavedGameStorageRepository({
      localAdapter,
      indexedDbAdapter,
      supportsIndexedDb: true,
    });

    expect(repository.requestedBackend).toBe("auto");
    expect(repository.resolvedBackend).toBe(SAVED_GAME_STORAGE_BACKEND_INDEXEDDB);
    expect(repository.backend).toBe(SAVED_GAME_STORAGE_BACKEND_INDEXEDDB);
    await expect(repository.loadSavedGamePayloadFromBrowser()).resolves.toEqual({ source: "idb" });
    expect(repository.readDiagnostics().migrationStatus).toBe("migrated");
  });

  it("keeps explicit local-storage override for rollback", async () => {
    const { adapter: localAdapter } = createAdapter(SAVED_GAME_STORAGE_BACKEND_LOCAL, { payload: { source: "local" } });
    const { adapter: indexedDbAdapter } = createAdapter(SAVED_GAME_STORAGE_BACKEND_INDEXEDDB, { payload: { source: "idb" } });
    const repository = createSavedGameStorageRepository({
      backend: SAVED_GAME_STORAGE_BACKEND_LOCAL,
      localAdapter,
      indexedDbAdapter,
      supportsIndexedDb: true,
    });

    expect(repository.requestedBackend).toBe(SAVED_GAME_STORAGE_BACKEND_LOCAL);
    expect(repository.resolvedBackend).toBe(SAVED_GAME_STORAGE_BACKEND_LOCAL);
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
      backend: undefined,
      localAdapter,
      indexedDbAdapter: null,
      supportsIndexedDb: true,
    });

    expect(repository.requestedBackend).toBe("auto");
    expect(repository.resolvedBackend).toBe(SAVED_GAME_STORAGE_BACKEND_INDEXEDDB);
    expect(repository.backend).toBe(SAVED_GAME_STORAGE_BACKEND_LOCAL);
    expect(repository.readDiagnostics().migrationStatus).toBe("fallback");
    await expect(repository.loadSavedGamePayloadFromBrowser()).resolves.toEqual({ source: "local" });
  });

  it("backfills indexeddb from local once and keeps later loads idempotent", async () => {
    const { adapter: localAdapter, calls: localCalls } = createAdapter(SAVED_GAME_STORAGE_BACKEND_LOCAL, { payload: { source: "local" } });
    let indexedDbPayload: SavedGamePayload | null = null;
    const indexedDbCalls = { load: 0, save: 0, clear: 0, readConfig: 0, readLegacy: 0 };
    const indexedDbAdapter: SavedGameStorageAdapter = {
      backend: SAVED_GAME_STORAGE_BACKEND_INDEXEDDB,
      async loadPayload() {
        indexedDbCalls.load += 1;
        return indexedDbPayload;
      },
      async savePayload(payload) {
        indexedDbCalls.save += 1;
        indexedDbPayload = payload;
        return true;
      },
      async clearPayload() {
        indexedDbCalls.clear += 1;
        indexedDbPayload = null;
        return true;
      },
      async readConfigPayload() {
        indexedDbCalls.readConfig += 1;
        return null;
      },
      async readLegacyPayload() {
        indexedDbCalls.readLegacy += 1;
        return null;
      },
    };

    const repository = createSavedGameStorageRepository({
      backend: SAVED_GAME_STORAGE_BACKEND_INDEXEDDB,
      localAdapter,
      indexedDbAdapter,
      supportsIndexedDb: true,
    });

    await expect(repository.loadSavedGamePayloadFromBrowser()).resolves.toEqual({ source: "local" });
    await expect(repository.loadSavedGamePayloadFromBrowser()).resolves.toEqual({ source: "local" });
    expect(indexedDbCalls.load).toBe(2);
    expect(localCalls.load).toBe(1);
    expect(indexedDbCalls.save).toBe(1);
    expect(repository.readDiagnostics().migrationStatus).toBe("migrated");
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
    expect(repository.readDiagnostics().migrationStatus).toBe("fallback");
  });

  it("does not dual-write when indexeddb save succeeds", async () => {
    const { adapter: localAdapter, calls: localCalls } = createAdapter(SAVED_GAME_STORAGE_BACKEND_LOCAL, { saveResult: true });
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
    expect(localCalls.save).toBe(0);
    expect(repository.readDiagnostics().lastSaveResult).toBe("saved");
  });

  it("uses temporary local fallback when indexeddb save fails", async () => {
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
    expect(repository.readDiagnostics().lastSaveResult).toBe("fallback_saved");
    expect(repository.readDiagnostics().migrationStatus).toBe("fallback");
  });

  it("fails save only when both indexeddb and local fallback writes fail", async () => {
    const { adapter: localAdapter, calls: localCalls } = createAdapter(SAVED_GAME_STORAGE_BACKEND_LOCAL, { saveResult: false });
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

    await expect(repository.saveSavedGamePayloadToBrowser({ value: 1 })).resolves.toBe(false);
    expect(indexedDbCalls.save).toBe(1);
    expect(localCalls.save).toBe(1);
    expect(repository.readDiagnostics().lastSaveResult).toBe("failed");
  });

  it("clears both primary and fallback storage when indexeddb is active", async () => {
    const { adapter: localAdapter, calls: localCalls } = createAdapter(SAVED_GAME_STORAGE_BACKEND_LOCAL, { clearResult: true });
    const { adapter: indexedDbAdapter, calls: indexedDbCalls } = createAdapter(
      SAVED_GAME_STORAGE_BACKEND_INDEXEDDB,
      { clearResult: true },
    );
    const repository = createSavedGameStorageRepository({
      backend: SAVED_GAME_STORAGE_BACKEND_INDEXEDDB,
      localAdapter,
      indexedDbAdapter,
      supportsIndexedDb: true,
    });

    await expect(repository.clearSavedGamePayloadFromBrowser()).resolves.toBe(true);
    expect(indexedDbCalls.clear).toBe(1);
    expect(localCalls.clear).toBe(1);
  });
});
