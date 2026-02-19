import { describe, expect, it } from "bun:test";
import {
  parseNostrRelayListTags,
  selectPreferredWriteRelays,
} from "../src/lib/nostr/relay-discovery";

describe("nostr relay discovery helpers", () => {
  it("parses read and write relay markers from kind 10002 tags", () => {
    const relayList = parseNostrRelayListTags([
      ["r", "wss://relay-a.example", "read"],
      ["r", "wss://relay-b.example", "write"],
      ["r", "wss://relay-c.example"],
    ]);

    expect(relayList.readRelays).toEqual([
      "wss://relay-a.example",
      "wss://relay-c.example",
    ]);
    expect(relayList.writeRelays).toEqual([
      "wss://relay-b.example",
      "wss://relay-c.example",
    ]);
  });

  it("ignores malformed relay tags and invalid URLs", () => {
    const relayList = parseNostrRelayListTags([
      ["e", "ignored"],
      ["r", "not-a-url"],
      ["r", "https://not-websocket.example"],
      ["r", "wss://valid.example", "write"],
      ["r"],
    ]);

    expect(relayList.readRelays).toEqual([]);
    expect(relayList.writeRelays).toEqual(["wss://valid.example"]);
  });

  it("prefers write relays and falls back to read relays", () => {
    const writePreferred = selectPreferredWriteRelays({
      readRelays: ["wss://read.example"],
      writeRelays: ["wss://write.example"],
    });
    const readFallback = selectPreferredWriteRelays({
      readRelays: ["wss://read.example"],
      writeRelays: [],
    });

    expect(writePreferred).toEqual(["wss://write.example"]);
    expect(readFallback).toEqual(["wss://read.example"]);
  });
});
