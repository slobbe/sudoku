import {
  clearSavedGamePayloadFromBrowser,
  loadSavedGamePayloadFromBrowser,
  readLegacySavedGamePayloadFromBrowser,
  readSavedGameConfigPayloadFromBrowser,
  saveSavedGamePayloadToBrowser,
} from "./game-storage";
import {
  SAVED_GAME_STORAGE_BACKEND_LOCAL,
  type SavedGamePayload,
  type SavedGameStorageAdapter,
} from "./storage-adapter";

export function createLocalStorageSavedGameAdapter(): SavedGameStorageAdapter {
  return {
    backend: SAVED_GAME_STORAGE_BACKEND_LOCAL,
    async loadPayload() {
      return loadSavedGamePayloadFromBrowser();
    },
    async savePayload(payload: SavedGamePayload) {
      return saveSavedGamePayloadToBrowser(payload);
    },
    async clearPayload() {
      return clearSavedGamePayloadFromBrowser();
    },
    async readConfigPayload() {
      return readSavedGameConfigPayloadFromBrowser();
    },
    async readLegacyPayload() {
      return readLegacySavedGamePayloadFromBrowser();
    },
  };
}
