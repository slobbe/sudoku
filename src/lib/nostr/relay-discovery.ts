import type { Event, Filter } from "nostr-tools";
import { SimplePool, verifyEvent } from "nostr-tools";

const RELAY_LIST_KIND = 10002;
const RELAY_LIST_MAX_WAIT_MS = 3500;
const RELAY_LIST_CACHE_TTL_MS = 5 * 60 * 1000;
const RELAY_LIST_CACHE_KEY_PREFIX = "sudoku-nostr-relay-list-v1:";

export const DEFAULT_NOSTR_DISCOVERY_RELAYS = [
  "wss://relay.damus.io",
  "wss://nos.lol",
  "wss://relay.primal.net",
];

export type NostrRelayList = {
  readRelays: string[];
  writeRelays: string[];
};

export type NostrRelayListResult = NostrRelayList & {
  source: "network" | "cache" | "none";
};

type CachedRelayList = {
  expiresAt: number;
  readRelays: string[];
  writeRelays: string[];
};

function getSessionStorage(): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function getCacheKey(pubkey: string): string {
  return `${RELAY_LIST_CACHE_KEY_PREFIX}${pubkey}`;
}

function normalizeRelayUrl(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "ws:" && parsed.protocol !== "wss:") {
      return null;
    }

    parsed.hash = "";
    const normalized = parsed.toString();
    return normalized.endsWith("/") ? normalized.slice(0, -1) : normalized;
  } catch {
    return null;
  }
}

function resolveRelays(relays?: string[]): string[] {
  const source = relays && relays.length > 0 ? relays : DEFAULT_NOSTR_DISCOVERY_RELAYS;
  return Array.from(new Set(source.map((relay) => relay.trim()).filter((relay) => relay.length > 0)));
}

function toRelayList(readRelays: Set<string>, writeRelays: Set<string>): NostrRelayList {
  return {
    readRelays: Array.from(readRelays),
    writeRelays: Array.from(writeRelays),
  };
}

export function parseNostrRelayListTags(tags: string[][]): NostrRelayList {
  const readRelays = new Set<string>();
  const writeRelays = new Set<string>();

  for (const tag of tags) {
    if (!Array.isArray(tag) || tag.length < 2 || tag[0] !== "r") {
      continue;
    }

    const relayUrl = normalizeRelayUrl(tag[1]);
    if (!relayUrl) {
      continue;
    }

    const marker = tag[2];
    if (marker === "read") {
      readRelays.add(relayUrl);
      continue;
    }

    if (marker === "write") {
      writeRelays.add(relayUrl);
      continue;
    }

    readRelays.add(relayUrl);
    writeRelays.add(relayUrl);
  }

  return toRelayList(readRelays, writeRelays);
}

function readCachedRelayList(pubkey: string): NostrRelayListResult | null {
  const storage = getSessionStorage();
  if (!storage) {
    return null;
  }

  try {
    const raw = storage.getItem(getCacheKey(pubkey));
    if (!raw) {
      return null;
    }

    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return null;
    }

    const cache = parsed as Partial<CachedRelayList>;
    if (typeof cache.expiresAt !== "number" || cache.expiresAt <= Date.now()) {
      storage.removeItem(getCacheKey(pubkey));
      return null;
    }

    const readRelays = Array.isArray(cache.readRelays)
      ? cache.readRelays.map((relay) => normalizeRelayUrl(relay)).filter((relay): relay is string => relay !== null)
      : [];
    const writeRelays = Array.isArray(cache.writeRelays)
      ? cache.writeRelays.map((relay) => normalizeRelayUrl(relay)).filter((relay): relay is string => relay !== null)
      : [];

    return {
      readRelays: Array.from(new Set(readRelays)),
      writeRelays: Array.from(new Set(writeRelays)),
      source: "cache",
    };
  } catch {
    return null;
  }
}

function writeCachedRelayList(pubkey: string, relayList: NostrRelayList): void {
  const storage = getSessionStorage();
  if (!storage) {
    return;
  }

  const payload: CachedRelayList = {
    expiresAt: Date.now() + RELAY_LIST_CACHE_TTL_MS,
    readRelays: relayList.readRelays,
    writeRelays: relayList.writeRelays,
  };

  try {
    storage.setItem(getCacheKey(pubkey), JSON.stringify(payload));
  } catch {
    // Ignore cache failures and continue without storage.
  }
}

function buildRelayListFilter(pubkey: string): Filter {
  return {
    kinds: [RELAY_LIST_KIND],
    authors: [pubkey],
    limit: 1,
  };
}

function isValidRelayListEvent(event: Event, pubkey: string): boolean {
  return event.kind === RELAY_LIST_KIND && event.pubkey === pubkey && verifyEvent(event);
}

export function selectPreferredWriteRelays(relayList: NostrRelayList): string[] {
  if (relayList.writeRelays.length > 0) {
    return relayList.writeRelays;
  }

  return relayList.readRelays;
}

export async function fetchNostrRelayList(pubkey: string, relays?: string[]): Promise<NostrRelayListResult> {
  const cachedRelayList = readCachedRelayList(pubkey);
  if (cachedRelayList) {
    return cachedRelayList;
  }

  const resolvedRelays = resolveRelays(relays);
  if (resolvedRelays.length === 0) {
    return {
      readRelays: [],
      writeRelays: [],
      source: "none",
    };
  }

  const pool = new SimplePool();
  try {
    const event = await pool.get(resolvedRelays, buildRelayListFilter(pubkey), { maxWait: RELAY_LIST_MAX_WAIT_MS });
    if (!event || !isValidRelayListEvent(event, pubkey)) {
      return {
        readRelays: [],
        writeRelays: [],
        source: "none",
      };
    }

    const relayList = parseNostrRelayListTags(event.tags);
    if (relayList.readRelays.length === 0 && relayList.writeRelays.length === 0) {
      return {
        ...relayList,
        source: "none",
      };
    }

    writeCachedRelayList(pubkey, relayList);
    return {
      ...relayList,
      source: "network",
    };
  } catch {
    return {
      readRelays: [],
      writeRelays: [],
      source: "none",
    };
  } finally {
    pool.destroy();
  }
}
