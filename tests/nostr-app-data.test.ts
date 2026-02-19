import { describe, expect, it } from "bun:test";
import {
  NOSTR_APP_DATA_D_TAG,
  NOSTR_APP_DATA_TAG,
  createNostrAppDataEnvelope,
  isNostrAppDataPayloadChanged,
  parseNostrAppDataEnvelope,
} from "../src/lib/nostr/app-data";

describe("nostr app data helpers", () => {
  it("uses the expected NIP-78 tags", () => {
    expect(NOSTR_APP_DATA_D_TAG).toBe("sudoku:appdata:v1");
    expect(NOSTR_APP_DATA_TAG).toBe("sudoku");
  });

  it("creates parseable app-data envelopes", () => {
    const envelope = createNostrAppDataEnvelope({
      difficulty: "medium",
      hintsLeft: 2,
      stats: { gamesStarted: 1 },
    });

    const parsed = parseNostrAppDataEnvelope(JSON.stringify(envelope));

    expect(parsed).not.toBeNull();
    expect(parsed?.schema).toBe(1);
    expect(parsed?.payload).toEqual({
      difficulty: "medium",
      hintsLeft: 2,
      stats: { gamesStarted: 1 },
    });
    expect(typeof parsed?.updatedAt).toBe("string");
  });

  it("rejects malformed or incompatible envelopes", () => {
    expect(parseNostrAppDataEnvelope("not-json")).toBeNull();
    expect(parseNostrAppDataEnvelope(JSON.stringify({ schema: 2, updatedAt: "x", payload: {} }))).toBeNull();
    expect(parseNostrAppDataEnvelope(JSON.stringify({ schema: 1, updatedAt: 123, payload: {} }))).toBeNull();
    expect(parseNostrAppDataEnvelope(JSON.stringify({ schema: 1, updatedAt: "x", payload: [] }))).toBeNull();
  });

  it("detects changed payloads with stable object ordering", () => {
    const current = {
      config: { difficulty: "medium", showMistakes: true },
      stats: { started: 1, won: 1 },
    };
    const sameDifferentOrder = {
      stats: { won: 1, started: 1 },
      config: { showMistakes: true, difficulty: "medium" },
    };
    const changed = {
      config: { difficulty: "hard", showMistakes: true },
      stats: { started: 1, won: 1 },
    };

    expect(isNostrAppDataPayloadChanged(current, sameDifferentOrder)).toBe(false);
    expect(isNostrAppDataPayloadChanged(current, changed)).toBe(true);
    expect(isNostrAppDataPayloadChanged(null, current)).toBe(true);
  });
});
