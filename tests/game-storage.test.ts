import { describe, expect, it } from "bun:test";
import {
  LEGACY_SAVED_GAME_KEY,
  SAVED_GAME_CONFIG_KEY,
  SAVED_GAME_CORE_KEY,
  SAVED_GAME_PROGRESS_KEY,
  SAVED_GAME_SESSIONS_KEY,
  SAVED_GAME_STATS_KEY,
  SAVED_GAME_STORAGE_VERSION_KEY,
  loadSavedGamePayloadFromStorage,
  mergeSavedGamePayloadParts,
  readSavedGamePayloadV2FromStorage,
  saveSavedGamePayloadToStorage,
  splitSavedGamePayload,
} from "../src/lib/storage/game-storage";

type StoredMap = Map<string, string>;

class MemoryStorage {
  readonly store: StoredMap = new Map<string, string>();
  private readonly failOnSetKeys: Set<string>;

  constructor(failOnSetKeys: string[] = []) {
    this.failOnSetKeys = new Set(failOnSetKeys);
  }

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    if (this.failOnSetKeys.has(key)) {
      throw new Error(`setItem failed for key: ${key}`);
    }

    this.store.set(key, value);
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }
}

const samplePayload: Record<string, unknown> = {
  mode: "standard",
  difficulty: "medium",
  configuredHintsPerGame: 3,
  configuredLivesPerGame: 3,
  puzzle: [[0]],
  solution: [[1]],
  board: [[0]],
  hintsPerGame: 3,
  livesPerGame: 3,
  hintsLeft: 2,
  livesLeft: 3,
  annotationMode: false,
  notes: [[0]],
  currentGamePoints: 14,
  scoredCells: ["0-0", "1-2"],
  showMistakes: true,
  fillModeEntry: "double-tap",
  theme: "mist",
  stats: {
    gamesStarted: 1,
    gamesWon: 1,
    totalPoints: 84,
    pointsByDifficulty: { easy: 4, medium: 18, hard: 22, expert: 40 },
    daily: { gamesStarted: 0, gamesWon: 0, dailyPoints: 0 },
  },
  won: false,
  lost: false,
  currentGameStarted: true,
  dailyDate: null,
  dailySeed: null,
  standardSession: null,
  dailySession: null,
  extraField: "ignored",
};

describe("game storage split payload", () => {
  it("splits and merges payload into logical v2 keys", () => {
    const parts = splitSavedGamePayload(samplePayload);

    expect(parts.core).toEqual({
      mode: "standard",
      puzzle: [[0]],
      solution: [[1]],
      board: [[0]],
      dailyDate: null,
      dailySeed: null,
    });
    expect(parts.config).toEqual({
      difficulty: "medium",
      configuredHintsPerGame: 3,
      configuredLivesPerGame: 3,
      showMistakes: true,
      fillModeEntry: "double-tap",
      theme: "mist",
    });
    expect(parts.progress).toEqual(expect.objectContaining({
      currentGamePoints: 14,
      scoredCells: ["0-0", "1-2"],
    }));

    const merged = mergeSavedGamePayloadParts(parts);
    expect(merged.extraField).toBeUndefined();
    expect(merged.difficulty).toBe("medium");
    expect(merged.hintsLeft).toBe(2);
    expect(merged.currentGamePoints).toBe(14);
    expect(merged.scoredCells).toEqual(["0-0", "1-2"]);
    expect(merged.stats).toEqual(expect.objectContaining({
      gamesStarted: 1,
      totalPoints: 84,
    }));
    expect(merged.standardSession).toBeNull();
  });
});

describe("game storage migration", () => {
  it("migrates legacy single-key payload to v2 keys and deletes legacy", () => {
    const storage = new MemoryStorage();
    storage.setItem(LEGACY_SAVED_GAME_KEY, JSON.stringify(samplePayload));

    const loaded = loadSavedGamePayloadFromStorage(storage);

    expect(loaded).toEqual(expect.objectContaining({
      difficulty: "medium",
      hintsLeft: 2,
      theme: "mist",
    }));
    expect(storage.getItem(LEGACY_SAVED_GAME_KEY)).toBeNull();
    expect(storage.getItem(SAVED_GAME_STORAGE_VERSION_KEY)).toBe("2");
    expect(storage.getItem(SAVED_GAME_CORE_KEY)).not.toBeNull();
    expect(storage.getItem(SAVED_GAME_CONFIG_KEY)).not.toBeNull();
    expect(storage.getItem(SAVED_GAME_PROGRESS_KEY)).not.toBeNull();
    expect(storage.getItem(SAVED_GAME_STATS_KEY)).not.toBeNull();
    expect(storage.getItem(SAVED_GAME_SESSIONS_KEY)).not.toBeNull();
  });

  it("keeps legacy key when migration write fails", () => {
    const storage = new MemoryStorage([SAVED_GAME_CONFIG_KEY]);
    storage.setItem(LEGACY_SAVED_GAME_KEY, JSON.stringify(samplePayload));

    const loaded = loadSavedGamePayloadFromStorage(storage);

    expect(loaded).toEqual(expect.objectContaining({ difficulty: "medium" }));
    expect(storage.getItem(LEGACY_SAVED_GAME_KEY)).not.toBeNull();
    expect(storage.getItem(SAVED_GAME_STORAGE_VERSION_KEY)).toBeNull();
    expect(storage.getItem(SAVED_GAME_CORE_KEY)).toBeNull();
    expect(storage.getItem(SAVED_GAME_CONFIG_KEY)).toBeNull();
  });

  it("falls back to legacy payload when v2 payload is malformed", () => {
    const storage = new MemoryStorage();
    storage.setItem(SAVED_GAME_CORE_KEY, "not-json");
    storage.setItem(LEGACY_SAVED_GAME_KEY, JSON.stringify(samplePayload));

    const loaded = loadSavedGamePayloadFromStorage(storage);

    expect(loaded).toEqual(expect.objectContaining({
      difficulty: "medium",
      currentGameStarted: true,
    }));
    expect(storage.getItem(LEGACY_SAVED_GAME_KEY)).toBeNull();
  });

  it("keeps compatibility with legacy payloads that do not include points fields", () => {
    const storage = new MemoryStorage();
    const legacyWithoutPoints = {
      ...samplePayload,
      currentGamePoints: undefined,
      scoredCells: undefined,
      stats: { gamesStarted: 1 },
    };
    storage.setItem(LEGACY_SAVED_GAME_KEY, JSON.stringify(legacyWithoutPoints));

    const loaded = loadSavedGamePayloadFromStorage(storage);

    expect(loaded).toEqual(expect.objectContaining({
      difficulty: "medium",
      stats: { gamesStarted: 1 },
    }));
    expect(loaded?.currentGamePoints).toBeUndefined();
    expect(loaded?.scoredCells).toBeUndefined();
  });
});

describe("game storage save", () => {
  it("saves payload into v2 keys and removes legacy key", () => {
    const storage = new MemoryStorage();
    storage.setItem(LEGACY_SAVED_GAME_KEY, JSON.stringify({ old: true }));

    const saved = saveSavedGamePayloadToStorage(storage, samplePayload);

    expect(saved).toBe(true);
    expect(storage.getItem(LEGACY_SAVED_GAME_KEY)).toBeNull();
    expect(storage.getItem(SAVED_GAME_STORAGE_VERSION_KEY)).toBe("2");
    expect(storage.getItem(SAVED_GAME_CONFIG_KEY)).not.toBeNull();
  });

  it("preserves points fields in v2 roundtrip", () => {
    const storage = new MemoryStorage();

    const saved = saveSavedGamePayloadToStorage(storage, samplePayload);
    const loaded = readSavedGamePayloadV2FromStorage(storage);

    expect(saved).toBe(true);
    expect(loaded).toEqual(expect.objectContaining({
      currentGamePoints: 14,
      scoredCells: ["0-0", "1-2"],
      stats: expect.objectContaining({
        totalPoints: 84,
        pointsByDifficulty: { easy: 4, medium: 18, hard: 22, expert: 40 },
      }),
    }));
  });
});
