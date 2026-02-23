import { createLocalStorageSavedGameAdapter } from "./local-storage-adapter";
import { createIndexedDbSavedGameAdapter } from "./indexeddb-adapter";
import {
  normalizeSavedGameStorageBackend,
  SAVED_GAME_STORAGE_BACKEND_INDEXEDDB,
  SAVED_GAME_STORAGE_BACKEND_LOCAL,
  type SavedGamePayload,
  type SavedGameStorageAdapter,
  type StorageBackend,
} from "./storage-adapter";

export type SavedGameStorageRepository = {
  backend: StorageBackend;
  resolvedBackend: StorageBackend;
  requestedBackend: StorageBackend | "auto";
  loadSavedGamePayloadFromBrowser(): Promise<SavedGamePayload | null>;
  saveSavedGamePayloadToBrowser(payload: SavedGamePayload): Promise<boolean>;
  readSavedGameConfigPayloadFromBrowser(): Promise<SavedGamePayload | null>;
  readLegacySavedGamePayloadFromBrowser(): Promise<SavedGamePayload | null>;
  readDiagnostics(): SavedGameStorageDiagnostics;
};

export type SavedGameStorageRepositoryOptions = {
  backend?: unknown;
  localAdapter?: SavedGameStorageAdapter;
  indexedDbAdapter?: SavedGameStorageAdapter | null;
  supportsIndexedDb?: boolean;
};

export type SavedGameStorageMigrationStatus = "not_started" | "migrated" | "fallback";
export type SavedGameStorageLastSaveResult = "idle" | "saved" | "fallback_saved" | "failed";

export type SavedGameStorageDiagnostics = {
  requestedBackend: StorageBackend | "auto";
  resolvedBackend: StorageBackend;
  activeBackend: StorageBackend;
  migrationStatus: SavedGameStorageMigrationStatus;
  lastSaveResult: SavedGameStorageLastSaveResult;
  lastSaveBackend: StorageBackend | null;
};

const defaultLocalStorageAdapter = createLocalStorageSavedGameAdapter();
const defaultIndexedDbAdapter = createIndexedDbSavedGameAdapter();

function readConfiguredBackendFromEnv(): unknown {
  if (typeof process === "undefined") {
    return undefined;
  }

  return process.env.NEXT_PUBLIC_SAVED_GAME_BACKEND;
}

function supportsIndexedDbByDefault(): boolean {
  return typeof indexedDB !== "undefined";
}

function resolveRequestedBackend(backend: unknown): StorageBackend | "auto" {
  if (backend === undefined || backend === null || backend === "") {
    return "auto";
  }

  return normalizeSavedGameStorageBackend(backend);
}

function resolveInitialMigrationStatus(
  requestedBackend: StorageBackend | "auto",
  activeBackend: StorageBackend,
): SavedGameStorageMigrationStatus {
  if (activeBackend === SAVED_GAME_STORAGE_BACKEND_INDEXEDDB) {
    return "not_started";
  }

  return requestedBackend === SAVED_GAME_STORAGE_BACKEND_LOCAL ? "not_started" : "fallback";
}

export function resolveSavedGameStorageBackend(
  backend: unknown,
  supportsIndexedDb: boolean,
): StorageBackend {
  if (backend === undefined || backend === null || backend === "") {
    return supportsIndexedDb
      ? SAVED_GAME_STORAGE_BACKEND_INDEXEDDB
      : SAVED_GAME_STORAGE_BACKEND_LOCAL;
  }

  const normalized = normalizeSavedGameStorageBackend(backend);
  if (normalized === SAVED_GAME_STORAGE_BACKEND_INDEXEDDB && supportsIndexedDb) {
    return SAVED_GAME_STORAGE_BACKEND_INDEXEDDB;
  }

  return SAVED_GAME_STORAGE_BACKEND_LOCAL;
}

export function createSavedGameStorageRepository(
  options: SavedGameStorageRepositoryOptions = {},
): SavedGameStorageRepository {
  const localAdapter = options.localAdapter ?? defaultLocalStorageAdapter;
  const indexedDbAdapter = options.indexedDbAdapter === undefined
    ? defaultIndexedDbAdapter
    : options.indexedDbAdapter;
  const supportsIndexedDb = options.supportsIndexedDb ?? supportsIndexedDbByDefault();
  const requestedBackendValue = options.backend ?? readConfiguredBackendFromEnv();
  const requestedBackend = resolveRequestedBackend(requestedBackendValue);
  const resolvedBackend = resolveSavedGameStorageBackend(requestedBackendValue, supportsIndexedDb);

  const useIndexedDb = resolvedBackend === SAVED_GAME_STORAGE_BACKEND_INDEXEDDB && Boolean(indexedDbAdapter);

  const backend: StorageBackend = useIndexedDb
    ? SAVED_GAME_STORAGE_BACKEND_INDEXEDDB
    : SAVED_GAME_STORAGE_BACKEND_LOCAL;

  const primaryAdapter: SavedGameStorageAdapter = useIndexedDb
    ? (indexedDbAdapter as SavedGameStorageAdapter)
    : localAdapter;

  const secondaryAdapter = useIndexedDb ? localAdapter : null;

  let migrationStatus = resolveInitialMigrationStatus(requestedBackend, backend);
  let lastSaveResult: SavedGameStorageLastSaveResult = "idle";
  let lastSaveBackend: StorageBackend | null = null;

  function readDiagnostics(): SavedGameStorageDiagnostics {
    return {
      requestedBackend,
      resolvedBackend,
      activeBackend: backend,
      migrationStatus,
      lastSaveResult,
      lastSaveBackend,
    };
  }

  async function loadPayloadWithFallback(): Promise<SavedGamePayload | null> {
    if (!secondaryAdapter) {
      try {
        return await primaryAdapter.loadPayload();
      } catch {
        return null;
      }
    }

    let primaryLoadFailed = false;

    try {
      const primaryPayload = await primaryAdapter.loadPayload();
      if (primaryPayload) {
        migrationStatus = "migrated";
        return primaryPayload;
      }
    } catch {
      primaryLoadFailed = true;
      migrationStatus = "fallback";
    }

    let fallbackPayload: SavedGamePayload | null = null;
    try {
      fallbackPayload = await secondaryAdapter.loadPayload();
    } catch {
      migrationStatus = "fallback";
      return null;
    }

    if (!fallbackPayload) {
      if (migrationStatus !== "fallback") {
        migrationStatus = "not_started";
      }
      return null;
    }

    try {
      const backfillSaved = await primaryAdapter.savePayload(fallbackPayload);
      migrationStatus = backfillSaved && !primaryLoadFailed ? "migrated" : "fallback";
    } catch {
      migrationStatus = "fallback";
    }

    return fallbackPayload;
  }

  async function savePayloadWithPrimaryWrite(payload: SavedGamePayload): Promise<boolean> {
    try {
      const primarySaved = await primaryAdapter.savePayload(payload);
      if (primarySaved) {
        lastSaveResult = "saved";
        lastSaveBackend = primaryAdapter.backend;
        if (backend === SAVED_GAME_STORAGE_BACKEND_INDEXEDDB) {
          migrationStatus = "migrated";
        }
        return true;
      }
    } catch {
      // Continue with fallback adapter when available.
    }

    if (!secondaryAdapter) {
      lastSaveResult = "failed";
      lastSaveBackend = primaryAdapter.backend;
      if (backend === SAVED_GAME_STORAGE_BACKEND_INDEXEDDB) {
        migrationStatus = "fallback";
      }
      return false;
    }

    try {
      const fallbackSaved = await secondaryAdapter.savePayload(payload);
      if (fallbackSaved) {
        lastSaveResult = "fallback_saved";
        lastSaveBackend = secondaryAdapter.backend;
        migrationStatus = "fallback";
        return true;
      }
    } catch {
      // Treat as failed below.
    }

    lastSaveResult = "failed";
    lastSaveBackend = secondaryAdapter.backend;
    migrationStatus = "fallback";
    return false;
  }

  async function readConfigWithFallback(): Promise<SavedGamePayload | null> {
    try {
      const primaryConfig = await primaryAdapter.readConfigPayload();
      if (primaryConfig) {
        return primaryConfig;
      }
    } catch {
      migrationStatus = "fallback";
    }

    if (!secondaryAdapter) {
      return null;
    }

    try {
      return await secondaryAdapter.readConfigPayload();
    } catch {
      migrationStatus = "fallback";
      return null;
    }
  }

  async function readLegacyWithFallback(): Promise<SavedGamePayload | null> {
    if (secondaryAdapter) {
      return secondaryAdapter.readLegacyPayload();
    }

    return primaryAdapter.readLegacyPayload();
  }

  return {
    backend,
    resolvedBackend,
    requestedBackend,
    loadSavedGamePayloadFromBrowser() {
      return loadPayloadWithFallback();
    },
    saveSavedGamePayloadToBrowser(payload: SavedGamePayload) {
      return savePayloadWithPrimaryWrite(payload);
    },
    readSavedGameConfigPayloadFromBrowser() {
      return readConfigWithFallback();
    },
    readLegacySavedGamePayloadFromBrowser() {
      return readLegacyWithFallback();
    },
    readDiagnostics,
  };
}

let browserSavedGameStorageRepository: SavedGameStorageRepository | null = null;

function getBrowserSavedGameStorageRepository(): SavedGameStorageRepository {
  if (!browserSavedGameStorageRepository) {
    browserSavedGameStorageRepository = createSavedGameStorageRepository();
  }

  return browserSavedGameStorageRepository;
}

export async function loadSavedGamePayloadFromBrowser(): Promise<SavedGamePayload | null> {
  return getBrowserSavedGameStorageRepository().loadSavedGamePayloadFromBrowser();
}

export async function saveSavedGamePayloadToBrowser(payload: SavedGamePayload): Promise<boolean> {
  return getBrowserSavedGameStorageRepository().saveSavedGamePayloadToBrowser(payload);
}

export async function readSavedGameConfigPayloadFromBrowser(): Promise<SavedGamePayload | null> {
  return getBrowserSavedGameStorageRepository().readSavedGameConfigPayloadFromBrowser();
}

export async function readLegacySavedGamePayloadFromBrowser(): Promise<SavedGamePayload | null> {
  return getBrowserSavedGameStorageRepository().readLegacySavedGamePayloadFromBrowser();
}

export function readSavedGameStorageDiagnosticsFromBrowser(): SavedGameStorageDiagnostics {
  return getBrowserSavedGameStorageRepository().readDiagnostics();
}
