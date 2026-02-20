import { createLocalStorageSavedGameAdapter } from "./local-storage-adapter";
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
  const indexedDbAdapter = options.indexedDbAdapter ?? null;
  const supportsIndexedDb = options.supportsIndexedDb ?? supportsIndexedDbByDefault();
  const requestedBackend = options.backend ?? readConfiguredBackendFromEnv();
  const resolvedBackend = resolveSavedGameStorageBackend(requestedBackend, supportsIndexedDb);

  let backend: StorageBackend = SAVED_GAME_STORAGE_BACKEND_LOCAL;
  let adapter: SavedGameStorageAdapter = localAdapter;

  if (resolvedBackend === SAVED_GAME_STORAGE_BACKEND_INDEXEDDB && indexedDbAdapter) {
    backend = SAVED_GAME_STORAGE_BACKEND_INDEXEDDB;
    adapter = indexedDbAdapter;
  }

  return {
    backend,
    loadSavedGamePayloadFromBrowser() {
      return adapter.loadPayload();
    },
    saveSavedGamePayloadToBrowser(payload: SavedGamePayload) {
      return adapter.savePayload(payload);
    },
    readSavedGameConfigPayloadFromBrowser() {
      return adapter.readConfigPayload();
    },
    readLegacySavedGamePayloadFromBrowser() {
      return adapter.readLegacyPayload();
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
