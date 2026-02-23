import {
  SAVED_GAME_STORAGE_BACKEND_INDEXEDDB,
  type SavedGamePayload,
  type SavedGameStorageAdapter,
} from "./storage-adapter";

const DB_NAME = "sudoku-app";
const DB_VERSION = 1;
const STORE_NAME = "saved-game";
const RECORD_KEY = "v2";

const CONFIG_FIELDS = [
  "difficulty",
  "configuredHintsPerGame",
  "configuredLivesPerGame",
  "showMistakes",
  "fillModeEntry",
  "theme",
] as const;

function getIndexedDbFactory(): IDBFactory | null {
  if (typeof indexedDB === "undefined") {
    return null;
  }

  return indexedDB;
}

function isObjectRecord(value: unknown): value is SavedGamePayload {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function pickConfigFields(payload: SavedGamePayload): SavedGamePayload | null {
  const config: SavedGamePayload = {};
  for (const field of CONFIG_FIELDS) {
    if (field in payload) {
      config[field] = payload[field];
    }
  }

  return Object.keys(config).length > 0 ? config : null;
}

function waitForRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed."));
  });
}

function waitForTransaction(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(transaction.error ?? new Error("IndexedDB transaction aborted."));
    transaction.onerror = () => reject(transaction.error ?? new Error("IndexedDB transaction failed."));
  });
}

function openDatabase(factory: IDBFactory): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = factory.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open IndexedDB."));
    request.onblocked = () => reject(new Error("IndexedDB open request was blocked."));
  });
}

export function createIndexedDbSavedGameAdapter(): SavedGameStorageAdapter {
  return {
    backend: SAVED_GAME_STORAGE_BACKEND_INDEXEDDB,
    async loadPayload() {
      const factory = getIndexedDbFactory();
      if (!factory) {
        return null;
      }

      try {
        const database = await openDatabase(factory);
        const transaction = database.transaction(STORE_NAME, "readonly");
        const store = transaction.objectStore(STORE_NAME);
        const record = await waitForRequest(store.get(RECORD_KEY));
        await waitForTransaction(transaction);
        database.close();
        return isObjectRecord(record) ? record : null;
      } catch {
        return null;
      }
    },
    async savePayload(payload: SavedGamePayload) {
      const factory = getIndexedDbFactory();
      if (!factory) {
        return false;
      }

      try {
        const database = await openDatabase(factory);
        const transaction = database.transaction(STORE_NAME, "readwrite");
        const store = transaction.objectStore(STORE_NAME);
        await waitForRequest(store.put(payload, RECORD_KEY));
        await waitForTransaction(transaction);
        database.close();
        return true;
      } catch {
        return false;
      }
    },
    async readConfigPayload() {
      const payload = await this.loadPayload();
      if (!payload) {
        return null;
      }

      return pickConfigFields(payload);
    },
    async readLegacyPayload() {
      return null;
    },
  };
}
