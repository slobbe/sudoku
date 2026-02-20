export const SAVED_GAME_STORAGE_BACKEND_LOCAL = "local-storage";
export const SAVED_GAME_STORAGE_BACKEND_INDEXEDDB = "indexeddb";

export type StorageBackend =
  | typeof SAVED_GAME_STORAGE_BACKEND_LOCAL
  | typeof SAVED_GAME_STORAGE_BACKEND_INDEXEDDB;

export type SavedGamePayload = Record<string, unknown>;

export interface SavedGameStorageAdapter {
  readonly backend: StorageBackend;
  loadPayload(): Promise<SavedGamePayload | null>;
  savePayload(payload: SavedGamePayload): Promise<boolean>;
  readConfigPayload(): Promise<SavedGamePayload | null>;
  readLegacyPayload(): Promise<SavedGamePayload | null>;
}

export function normalizeSavedGameStorageBackend(value: unknown): StorageBackend {
  return value === SAVED_GAME_STORAGE_BACKEND_INDEXEDDB
    ? SAVED_GAME_STORAGE_BACKEND_INDEXEDDB
    : SAVED_GAME_STORAGE_BACKEND_LOCAL;
}
