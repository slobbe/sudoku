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
  loadSavedGamePayloadFromBrowser(): Promise<SavedGamePayload | null>;
  saveSavedGamePayloadToBrowser(payload: SavedGamePayload): Promise<boolean>;
  readSavedGameConfigPayloadFromBrowser(): Promise<SavedGamePayload | null>;
  readLegacySavedGamePayloadFromBrowser(): Promise<SavedGamePayload | null>;
};

export type SavedGameStorageRepositoryOptions = {
  backend?: unknown;
  localAdapter?: SavedGameStorageAdapter;
  indexedDbAdapter?: SavedGameStorageAdapter | null;
  supportsIndexedDb?: boolean;
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

export function resolveSavedGameStorageBackend(
  backend: unknown,
  supportsIndexedDb: boolean,
): StorageBackend {
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
  const requestedBackend = options.backend ?? readConfiguredBackendFromEnv();
  const resolvedBackend = resolveSavedGameStorageBackend(requestedBackend, supportsIndexedDb);

  const useIndexedDb = resolvedBackend === SAVED_GAME_STORAGE_BACKEND_INDEXEDDB && Boolean(indexedDbAdapter);

  const backend: StorageBackend = useIndexedDb
    ? SAVED_GAME_STORAGE_BACKEND_INDEXEDDB
    : SAVED_GAME_STORAGE_BACKEND_LOCAL;

  const primaryAdapter: SavedGameStorageAdapter = useIndexedDb
    ? (indexedDbAdapter as SavedGameStorageAdapter)
    : localAdapter;

  const secondaryAdapter = useIndexedDb ? localAdapter : null;

  async function loadPayloadWithFallback(): Promise<SavedGamePayload | null> {
    try {
      const primaryPayload = await primaryAdapter.loadPayload();
      if (primaryPayload) {
        return primaryPayload;
      }
    } catch {
      // Continue with fallback adapter.
    }

    if (!secondaryAdapter) {
      return null;
    }

    const fallbackPayload = await secondaryAdapter.loadPayload();
    if (!fallbackPayload) {
      return null;
    }

    try {
      await primaryAdapter.savePayload(fallbackPayload);
    } catch {
      // Ignore backfill failures and continue returning fallback payload.
    }

    return fallbackPayload;
  }

  async function savePayloadWithDualWrite(payload: SavedGamePayload): Promise<boolean> {
    if (!secondaryAdapter) {
      return primaryAdapter.savePayload(payload);
    }

    const [primaryResult, fallbackResult] = await Promise.allSettled([
      primaryAdapter.savePayload(payload),
      secondaryAdapter.savePayload(payload),
    ]);

    const primarySaved = primaryResult.status === "fulfilled" && primaryResult.value;
    const fallbackSaved = fallbackResult.status === "fulfilled" && fallbackResult.value;
    return primarySaved || fallbackSaved;
  }

  async function readConfigWithFallback(): Promise<SavedGamePayload | null> {
    try {
      const primaryConfig = await primaryAdapter.readConfigPayload();
      if (primaryConfig) {
        return primaryConfig;
      }
    } catch {
      // Continue with fallback adapter.
    }

    if (!secondaryAdapter) {
      return null;
    }

    return secondaryAdapter.readConfigPayload();
  }

  async function readLegacyWithFallback(): Promise<SavedGamePayload | null> {
    if (secondaryAdapter) {
      return secondaryAdapter.readLegacyPayload();
    }

    return primaryAdapter.readLegacyPayload();
  }

  return {
    backend,
    loadSavedGamePayloadFromBrowser() {
      return loadPayloadWithFallback();
    },
    saveSavedGamePayloadToBrowser(payload: SavedGamePayload) {
      return savePayloadWithDualWrite(payload);
    },
    readSavedGameConfigPayloadFromBrowser() {
      return readConfigWithFallback();
    },
    readLegacySavedGamePayloadFromBrowser() {
      return readLegacyWithFallback();
    },
  };
}

export async function loadSavedGamePayloadFromBrowser(): Promise<SavedGamePayload | null> {
  return createSavedGameStorageRepository().loadSavedGamePayloadFromBrowser();
}

export async function saveSavedGamePayloadToBrowser(payload: SavedGamePayload): Promise<boolean> {
  return createSavedGameStorageRepository().saveSavedGamePayloadToBrowser(payload);
}

export async function readSavedGameConfigPayloadFromBrowser(): Promise<SavedGamePayload | null> {
  return createSavedGameStorageRepository().readSavedGameConfigPayloadFromBrowser();
}

export async function readLegacySavedGamePayloadFromBrowser(): Promise<SavedGamePayload | null> {
  return createSavedGameStorageRepository().readLegacySavedGamePayloadFromBrowser();
}
