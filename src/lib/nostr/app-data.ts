import type { Event, Filter } from "nostr-tools";
import { nip04, nip44, SimplePool, verifyEvent } from "nostr-tools";
import { getSessionLocalNsec } from "./account";
import type { NostrIdentity } from "./identity";
import { parseNsecToSecretKey } from "./identity";
import {
  DEFAULT_NOSTR_DISCOVERY_RELAYS,
  fetchNostrRelayList,
  selectPreferredWriteRelays,
} from "./relay-discovery";

const APP_DATA_KIND = 30078;
const APP_DATA_MAX_WAIT_MS = 3500;
const APP_DATA_SCHEMA = 1;

export const NOSTR_APP_DATA_D_TAG = "sudoku:appdata:v1";
export const NOSTR_APP_DATA_TAG = "sudoku";

export type NostrAppDataEncryption = "nip44" | "nip04";

export type NostrAppDataPayload = Record<string, unknown>;

export type NostrAppDataEnvelope = {
  schema: number;
  updatedAt: string;
  payload: NostrAppDataPayload;
};

export type NostrAppDataReadResult = {
  payload: NostrAppDataPayload | null;
  updatedAt: string | null;
  encryption: NostrAppDataEncryption | null;
};

export type NostrRelayPublishSummary = {
  attemptedRelays: number;
  successfulRelays: number;
  reachedAnyRelay: boolean;
};

export type NostrAppDataPublishResult = {
  published: boolean;
  encryption: NostrAppDataEncryption;
  updatedAt: string | null;
  relaySummary: NostrRelayPublishSummary | null;
};

type EncryptionContext = {
  encryption: NostrAppDataEncryption;
  encrypt: (plaintext: string) => Promise<string>;
  decrypt: (ciphertext: string) => Promise<string>;
};

function resolveRelays(relays?: string[]): string[] {
  const source = relays && relays.length > 0 ? relays : [];
  return Array.from(new Set(source.map((relay) => relay.trim()).filter((relay) => relay.length > 0)));
}

async function resolveAppDataRelays(pubkey: string, relays?: string[]): Promise<string[]> {
  const explicitRelays = resolveRelays(relays);
  if (explicitRelays.length > 0) {
    return explicitRelays;
  }

  const relayList = await fetchNostrRelayList(pubkey, DEFAULT_NOSTR_DISCOVERY_RELAYS);
  const discoveredRelays = selectPreferredWriteRelays(relayList);
  if (discoveredRelays.length > 0) {
    return discoveredRelays;
  }

  return DEFAULT_NOSTR_DISCOVERY_RELAYS;
}

function getTagValue(tags: string[][], tagName: string): string | null {
  for (const tag of tags) {
    if (tag[0] === tagName && typeof tag[1] === "string" && tag[1].length > 0) {
      return tag[1];
    }
  }

  return null;
}

function hasDTag(tags: string[][]): boolean {
  return tags.some((tag) => tag[0] === "d" && tag[1] === NOSTR_APP_DATA_D_TAG);
}

function buildAppDataFilter(pubkey: string): Filter {
  return {
    kinds: [APP_DATA_KIND],
    authors: [pubkey],
    "#d": [NOSTR_APP_DATA_D_TAG],
    limit: 1,
  };
}

function isValidAppDataEvent(event: Event, pubkey: string): boolean {
  return event.kind === APP_DATA_KIND && event.pubkey === pubkey && hasDTag(event.tags) && verifyEvent(event);
}

function getSupportedNip07EncryptionModes(): NostrAppDataEncryption[] {
  if (typeof window === "undefined" || !window.nostr) {
    return [];
  }

  const supported: NostrAppDataEncryption[] = [];
  if (window.nostr.nip44) {
    supported.push("nip44");
  }
  if (window.nostr.nip04) {
    supported.push("nip04");
  }

  return supported;
}

function getPreferredEncryptionModes(preferred?: NostrAppDataEncryption | null): NostrAppDataEncryption[] {
  if (preferred === "nip44") {
    return ["nip44", "nip04"];
  }

  if (preferred === "nip04") {
    return ["nip04", "nip44"];
  }

  return ["nip44", "nip04"];
}

async function createNip07EncryptionContext(
  identity: NostrIdentity,
  preferred?: NostrAppDataEncryption | null,
): Promise<EncryptionContext> {
  if (typeof window === "undefined" || !window.nostr) {
    throw new Error("NIP-07 extension is unavailable.");
  }

  const supported = getSupportedNip07EncryptionModes();
  for (const mode of getPreferredEncryptionModes(preferred)) {
    if (!supported.includes(mode)) {
      continue;
    }

    if (mode === "nip44" && window.nostr.nip44) {
      return {
        encryption: "nip44",
        encrypt: async (plaintext) => window.nostr!.nip44!.encrypt(identity.pubkey, plaintext),
        decrypt: async (ciphertext) => window.nostr!.nip44!.decrypt(identity.pubkey, ciphertext),
      };
    }

    if (mode === "nip04" && window.nostr.nip04) {
      return {
        encryption: "nip04",
        encrypt: async (plaintext) => window.nostr!.nip04!.encrypt(identity.pubkey, plaintext),
        decrypt: async (ciphertext) => window.nostr!.nip04!.decrypt(identity.pubkey, ciphertext),
      };
    }
  }

  throw new Error("Encrypted Nostr backup requires NIP-44 or NIP-04 support in your extension.");
}

function createLocalEncryptionContext(
  identity: NostrIdentity,
  preferred?: NostrAppDataEncryption | null,
): EncryptionContext {
  const nsec = getSessionLocalNsec();
  if (!nsec) {
    throw new Error("Local nsec is unavailable for encrypted backup.");
  }

  const secretKey = parseNsecToSecretKey(nsec);
  if (!secretKey) {
    throw new Error("Local nsec is invalid for encrypted backup.");
  }

  for (const mode of getPreferredEncryptionModes(preferred)) {
    if (mode === "nip44") {
      const conversationKey = nip44.v2.utils.getConversationKey(secretKey, identity.pubkey);
      return {
        encryption: "nip44",
        encrypt: async (plaintext) => nip44.v2.encrypt(plaintext, conversationKey),
        decrypt: async (ciphertext) => nip44.v2.decrypt(ciphertext, conversationKey),
      };
    }

    if (mode === "nip04") {
      return {
        encryption: "nip04",
        encrypt: async (plaintext) => nip04.encrypt(secretKey, identity.pubkey, plaintext),
        decrypt: async (ciphertext) => nip04.decrypt(secretKey, identity.pubkey, ciphertext),
      };
    }
  }

  throw new Error("Encrypted Nostr backup requires NIP-44 or NIP-04 support.");
}

async function createEncryptionContext(
  identity: NostrIdentity,
  preferred?: NostrAppDataEncryption | null,
): Promise<EncryptionContext> {
  if (identity.source === "nip07") {
    return createNip07EncryptionContext(identity, preferred);
  }

  return createLocalEncryptionContext(identity, preferred);
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringify(entry)).join(",")}]`;
  }

  const entries = Object.entries(value as Record<string, unknown>)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, entryValue]) => `${JSON.stringify(key)}:${stableStringify(entryValue)}`);

  return `{${entries.join(",")}}`;
}

export function isNostrAppDataPayloadChanged(
  currentPayload: NostrAppDataPayload | null,
  nextPayload: NostrAppDataPayload,
): boolean {
  if (!currentPayload) {
    return true;
  }

  return stableStringify(currentPayload) !== stableStringify(nextPayload);
}

export function createNostrAppDataEnvelope(payload: NostrAppDataPayload): NostrAppDataEnvelope {
  return {
    schema: APP_DATA_SCHEMA,
    updatedAt: new Date().toISOString(),
    payload,
  };
}

export function summarizeRelayPublishResults(
  results: PromiseSettledResult<unknown>[],
): NostrRelayPublishSummary {
  const attemptedRelays = results.length;
  const successfulRelays = results.filter((result) => result.status === "fulfilled").length;
  return {
    attemptedRelays,
    successfulRelays,
    reachedAnyRelay: successfulRelays > 0,
  };
}

export function parseNostrAppDataEnvelope(content: string): NostrAppDataEnvelope | null {
  try {
    const parsed: unknown = JSON.parse(content);
    if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") {
      return null;
    }

    const candidate = parsed as {
      schema?: unknown;
      updatedAt?: unknown;
      payload?: unknown;
    };

    if (candidate.schema !== APP_DATA_SCHEMA || typeof candidate.updatedAt !== "string") {
      return null;
    }

    if (!candidate.payload || Array.isArray(candidate.payload) || typeof candidate.payload !== "object") {
      return null;
    }

    return {
      schema: APP_DATA_SCHEMA,
      updatedAt: candidate.updatedAt,
      payload: { ...(candidate.payload as NostrAppDataPayload) },
    };
  } catch {
    return null;
  }
}

function parseEncryptionTag(tags: string[][]): NostrAppDataEncryption | null {
  const value = getTagValue(tags, "enc");
  return value === "nip44" || value === "nip04" ? value : null;
}

export async function fetchLatestNostrAppData(
  identity: NostrIdentity,
  relays?: string[],
): Promise<NostrAppDataReadResult> {
  const resolvedRelays = await resolveAppDataRelays(identity.pubkey, relays);
  if (resolvedRelays.length === 0) {
    return {
      payload: null,
      updatedAt: null,
      encryption: null,
    };
  }

  const pool = new SimplePool();
  try {
    const event = await pool.get(resolvedRelays, buildAppDataFilter(identity.pubkey), { maxWait: APP_DATA_MAX_WAIT_MS });
    if (!event || !isValidAppDataEvent(event, identity.pubkey)) {
      return {
        payload: null,
        updatedAt: null,
        encryption: null,
      };
    }

    const context = await createEncryptionContext(identity, parseEncryptionTag(event.tags));
    const plaintext = await context.decrypt(event.content);
    const envelope = parseNostrAppDataEnvelope(plaintext);
    if (!envelope) {
      throw new Error("Could not parse encrypted Nostr app backup payload.");
    }

    return {
      payload: envelope.payload,
      updatedAt: envelope.updatedAt,
      encryption: context.encryption,
    };
  } finally {
    pool.destroy();
  }
}

export async function publishNostrAppDataIfChanged(
  identity: NostrIdentity,
  payload: NostrAppDataPayload,
  relays?: string[],
): Promise<NostrAppDataPublishResult> {
  const resolvedRelays = await resolveAppDataRelays(identity.pubkey, relays);
  if (resolvedRelays.length === 0) {
    throw new Error("No Nostr relays available for encrypted backup.");
  }

  let latestPayload: NostrAppDataPayload | null = null;
  let latestUpdatedAt: string | null = null;
  try {
    const latest = await fetchLatestNostrAppData(identity, resolvedRelays);
    latestPayload = latest.payload;
    latestUpdatedAt = latest.updatedAt;
  } catch {
    latestPayload = null;
    latestUpdatedAt = null;
  }

  const context = await createEncryptionContext(identity);
  if (!isNostrAppDataPayloadChanged(latestPayload, payload)) {
    return {
      published: false,
      encryption: context.encryption,
      updatedAt: latestUpdatedAt,
      relaySummary: null,
    };
  }

  const envelope = createNostrAppDataEnvelope(payload);
  const encryptedContent = await context.encrypt(JSON.stringify(envelope));

  const signedEvent = await identity.signEvent({
    kind: APP_DATA_KIND,
    tags: [
      ["d", NOSTR_APP_DATA_D_TAG],
      ["app", NOSTR_APP_DATA_TAG],
      ["enc", context.encryption],
      ["schema", String(APP_DATA_SCHEMA)],
    ],
    content: encryptedContent,
    created_at: Math.floor(Date.now() / 1000),
  });

  const pool = new SimplePool();
  try {
    const publishResults = await Promise.allSettled(pool.publish(resolvedRelays, signedEvent));
    const relaySummary = summarizeRelayPublishResults(publishResults);
    if (!relaySummary.reachedAnyRelay) {
      throw new Error("Could not publish encrypted app backup to any relay.");
    }

    return {
      published: true,
      encryption: context.encryption,
      updatedAt: envelope.updatedAt,
      relaySummary,
    };
  } finally {
    pool.destroy();
  }
}
