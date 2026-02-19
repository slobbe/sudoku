import { describe, expect, it } from "bun:test";
import {
  getNostrProfileName,
  mergeNostrProfileName,
  normalizeNostrProfileName,
  parseNostrProfileMetadata,
} from "../src/lib/nostr";

describe("nostr profile helpers", () => {
  it("parses object metadata and extracts normalized name", () => {
    const profile = parseNostrProfileMetadata('{"name":"legacy","display_name":"  Alice  ","about":"Sudoku"}');

    expect(profile).not.toBeNull();
    expect(getNostrProfileName(profile)).toBe("Alice");
  });

  it("rejects non-object metadata payloads", () => {
    expect(parseNostrProfileMetadata("[]")).toBeNull();
    expect(parseNostrProfileMetadata('"text"')).toBeNull();
    expect(parseNostrProfileMetadata("not-json")).toBeNull();
  });

  it("normalizes and truncates long names", () => {
    const longName = `  ${"a".repeat(100)}  `;

    expect(normalizeNostrProfileName(longName)).toBe("a".repeat(64));
    expect(normalizeNostrProfileName("   ")).toBeNull();
  });

  it("does not mark profile changed when normalized name is unchanged", () => {
    const merged = mergeNostrProfileName({ name: "alice", display_name: "alice", about: "player" }, "  alice  ");

    expect(merged.changed).toBe(false);
    expect(merged.name).toBe("alice");
    expect(merged.profile).toEqual({ name: "alice", display_name: "alice", about: "player" });
  });

  it("updates only name while preserving other metadata fields", () => {
    const merged = mergeNostrProfileName({ name: "alice", display_name: "alice", about: "player" }, "bob");

    expect(merged.changed).toBe(true);
    expect(merged.name).toBe("bob");
    expect(merged.profile).toEqual({ name: "bob", display_name: "bob", about: "player" });
  });

  it("removes name when saving an empty value", () => {
    const merged = mergeNostrProfileName(
      { name: "alice", display_name: "alice", picture: "https://example.com/a.png" },
      "   ",
    );

    expect(merged.changed).toBe(true);
    expect(merged.name).toBeNull();
    expect(merged.profile).toEqual({ picture: "https://example.com/a.png" });
  });
});
