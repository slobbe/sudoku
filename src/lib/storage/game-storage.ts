export const LEGACY_SAVED_GAME_KEY = "sudoku-pwa-current-game-v1";

export const SAVED_GAME_STORAGE_VERSION_KEY = "sudoku-game-storage-version-v2";
export const SAVED_GAME_CORE_KEY = "sudoku-game-core-v2";
export const SAVED_GAME_CONFIG_KEY = "sudoku-game-config-v2";
export const SAVED_GAME_PROGRESS_KEY = "sudoku-game-progress-v2";
export const SAVED_GAME_STATS_KEY = "sudoku-game-stats-v2";
export const SAVED_GAME_SESSIONS_KEY = "sudoku-game-sessions-v2";

const SAVED_GAME_STORAGE_VERSION = "2";

const CORE_FIELDS = ["mode", "puzzle", "solution", "board", "dailyDate", "dailySeed"] as const;
const CONFIG_FIELDS = [
  "difficulty",
  "configuredHintsPerGame",
  "configuredLivesPerGame",
  "showMistakes",
  "fillModeEntry",
  "theme",
] as const;
const PROGRESS_FIELDS = [
  "hintsPerGame",
  "livesPerGame",
  "hintsLeft",
  "livesLeft",
  "annotationMode",
  "notes",
  "currentGamePoints",
  "scoredCells",
  "won",
  "lost",
  "currentGameStarted",
] as const;
const STATS_FIELDS = ["stats"] as const;
const SESSIONS_FIELDS = ["standardSession", "dailySession"] as const;

const V2_PAYLOAD_KEYS = [
  SAVED_GAME_CORE_KEY,
  SAVED_GAME_CONFIG_KEY,
  SAVED_GAME_PROGRESS_KEY,
  SAVED_GAME_STATS_KEY,
  SAVED_GAME_SESSIONS_KEY,
] as const;

export type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

type SavedGamePayload = Record<string, unknown>;

type SavedGamePayloadParts = {
  core: SavedGamePayload;
  config: SavedGamePayload;
  progress: SavedGamePayload;
  stats: SavedGamePayload;
  sessions: SavedGamePayload;
};

function getLocalStorage(): StorageLike | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function parseJsonObject(raw: string | null): SavedGamePayload | null {
  if (!raw) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") {
      return null;
    }

    return { ...(parsed as SavedGamePayload) };
  } catch {
    return null;
  }
}

function pickFields(source: SavedGamePayload, fields: readonly string[]): SavedGamePayload {
  const next: SavedGamePayload = {};
  for (const field of fields) {
    if (!(field in source)) {
      continue;
    }

    next[field] = source[field];
  }

  return next;
}

function hasAnyOwnField(source: SavedGamePayload): boolean {
  return Object.keys(source).length > 0;
}

export function splitSavedGamePayload(payload: SavedGamePayload): SavedGamePayloadParts {
  return {
    core: pickFields(payload, CORE_FIELDS),
    config: pickFields(payload, CONFIG_FIELDS),
    progress: pickFields(payload, PROGRESS_FIELDS),
    stats: pickFields(payload, STATS_FIELDS),
    sessions: pickFields(payload, SESSIONS_FIELDS),
  };
}

export function mergeSavedGamePayloadParts(parts: SavedGamePayloadParts): SavedGamePayload {
  return {
    ...parts.core,
    ...parts.config,
    ...parts.progress,
    ...parts.stats,
    ...parts.sessions,
  };
}

export function clearSavedGameV2FromStorage(storage: StorageLike): void {
  for (const key of V2_PAYLOAD_KEYS) {
    storage.removeItem(key);
  }
  storage.removeItem(SAVED_GAME_STORAGE_VERSION_KEY);
}

export function writeSavedGamePayloadV2ToStorage(storage: StorageLike, payload: SavedGamePayload): boolean {
  const parts = splitSavedGamePayload(payload);
  const writes: Array<[string, SavedGamePayload]> = [
    [SAVED_GAME_CORE_KEY, parts.core],
    [SAVED_GAME_CONFIG_KEY, parts.config],
    [SAVED_GAME_PROGRESS_KEY, parts.progress],
    [SAVED_GAME_STATS_KEY, parts.stats],
    [SAVED_GAME_SESSIONS_KEY, parts.sessions],
  ];

  const writtenKeys: string[] = [];

  try {
    for (const [key, value] of writes) {
      storage.setItem(key, JSON.stringify(value));
      writtenKeys.push(key);
    }

    storage.setItem(SAVED_GAME_STORAGE_VERSION_KEY, SAVED_GAME_STORAGE_VERSION);
    writtenKeys.push(SAVED_GAME_STORAGE_VERSION_KEY);
    return true;
  } catch {
    for (const key of writtenKeys) {
      try {
        storage.removeItem(key);
      } catch {
        // Ignore cleanup failures during rollback.
      }
    }

    return false;
  }
}

export function readSavedGamePayloadV2FromStorage(storage: StorageLike): SavedGamePayload | null {
  let hasAny = false;

  if (storage.getItem(SAVED_GAME_STORAGE_VERSION_KEY) !== null) {
    hasAny = true;
  }

  const parsedParts: SavedGamePayloadParts = {
    core: {},
    config: {},
    progress: {},
    stats: {},
    sessions: {},
  };

  const entries: Array<[string, keyof SavedGamePayloadParts]> = [
    [SAVED_GAME_CORE_KEY, "core"],
    [SAVED_GAME_CONFIG_KEY, "config"],
    [SAVED_GAME_PROGRESS_KEY, "progress"],
    [SAVED_GAME_STATS_KEY, "stats"],
    [SAVED_GAME_SESSIONS_KEY, "sessions"],
  ];

  for (const [key, partName] of entries) {
    const raw = storage.getItem(key);
    if (raw === null) {
      continue;
    }

    hasAny = true;
    const parsed = parseJsonObject(raw);
    if (!parsed) {
      return null;
    }

    parsedParts[partName] = parsed;
  }

  if (!hasAny) {
    return null;
  }

  const merged = mergeSavedGamePayloadParts(parsedParts);
  return hasAnyOwnField(merged) ? merged : null;
}

export function readLegacySavedGamePayloadFromStorage(storage: StorageLike): SavedGamePayload | null {
  return parseJsonObject(storage.getItem(LEGACY_SAVED_GAME_KEY));
}

export function loadSavedGamePayloadFromStorage(storage: StorageLike): SavedGamePayload | null {
  const nextPayload = readSavedGamePayloadV2FromStorage(storage);
  if (nextPayload) {
    return nextPayload;
  }

  const legacyPayload = readLegacySavedGamePayloadFromStorage(storage);
  if (!legacyPayload) {
    return null;
  }

  const migrationSucceeded = writeSavedGamePayloadV2ToStorage(storage, legacyPayload);
  if (migrationSucceeded) {
    storage.removeItem(LEGACY_SAVED_GAME_KEY);
  }

  return legacyPayload;
}

export function saveSavedGamePayloadToStorage(storage: StorageLike, payload: SavedGamePayload): boolean {
  const saveSucceeded = writeSavedGamePayloadV2ToStorage(storage, payload);
  if (saveSucceeded) {
    storage.removeItem(LEGACY_SAVED_GAME_KEY);
  }

  return saveSucceeded;
}

export function clearSavedGamePayloadFromStorage(storage: StorageLike): boolean {
  try {
    clearSavedGameV2FromStorage(storage);
    storage.removeItem(LEGACY_SAVED_GAME_KEY);
    return true;
  } catch {
    return false;
  }
}

export function loadSavedGamePayloadFromBrowser(): SavedGamePayload | null {
  const storage = getLocalStorage();
  if (!storage) {
    return null;
  }

  try {
    return loadSavedGamePayloadFromStorage(storage);
  } catch {
    return null;
  }
}

export function saveSavedGamePayloadToBrowser(payload: SavedGamePayload): boolean {
  const storage = getLocalStorage();
  if (!storage) {
    return false;
  }

  try {
    return saveSavedGamePayloadToStorage(storage, payload);
  } catch {
    return false;
  }
}

export function clearSavedGamePayloadFromBrowser(): boolean {
  const storage = getLocalStorage();
  if (!storage) {
    return false;
  }

  try {
    return clearSavedGamePayloadFromStorage(storage);
  } catch {
    return false;
  }
}

export function readSavedGameConfigPayloadFromBrowser(): SavedGamePayload | null {
  const storage = getLocalStorage();
  if (!storage) {
    return null;
  }

  try {
    const fromV2 = parseJsonObject(storage.getItem(SAVED_GAME_CONFIG_KEY));
    if (fromV2) {
      return fromV2;
    }

    const legacy = readLegacySavedGamePayloadFromStorage(storage);
    if (!legacy) {
      return null;
    }

    return pickFields(legacy, CONFIG_FIELDS);
  } catch {
    return null;
  }
}

export function readLegacySavedGamePayloadFromBrowser(): SavedGamePayload | null {
  const storage = getLocalStorage();
  if (!storage) {
    return null;
  }

  try {
    return readLegacySavedGamePayloadFromStorage(storage);
  } catch {
    return null;
  }
}
