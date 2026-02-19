import type { Event, Filter } from "nostr-tools";
import { SimplePool, verifyEvent } from "nostr-tools";
import type { NostrIdentity } from "./identity";
import {
  DEFAULT_NOSTR_DISCOVERY_RELAYS,
  fetchNostrRelayList,
  selectPreferredWriteRelays,
} from "./relay-discovery";

const PROFILE_KIND = 0;
const PROFILE_MAX_WAIT_MS = 3500;
const PROFILE_NAME_MAX_LENGTH = 64;

export const DEFAULT_NOSTR_PROFILE_RELAYS = [
  ...DEFAULT_NOSTR_DISCOVERY_RELAYS,
];

export type NostrProfileMetadata = Record<string, unknown>;

export type NostrProfileReadResult = {
  profile: NostrProfileMetadata | null;
  name: string | null;
};

export type NostrProfilePublishResult = {
  published: boolean;
  name: string | null;
};

function resolveRelays(relays?: string[]): string[] {
  const source = relays && relays.length > 0 ? relays : [];
  return Array.from(new Set(source.map((relay) => relay.trim()).filter((relay) => relay.length > 0)));
}

async function resolveProfileRelays(pubkey: string, relays?: string[]): Promise<string[]> {
  const explicitRelays = resolveRelays(relays);
  if (explicitRelays.length > 0) {
    return explicitRelays;
  }

  const relayList = await fetchNostrRelayList(pubkey, DEFAULT_NOSTR_PROFILE_RELAYS);
  const discoveredRelays = selectPreferredWriteRelays(relayList);
  if (discoveredRelays.length > 0) {
    return discoveredRelays;
  }

  return DEFAULT_NOSTR_PROFILE_RELAYS;
}

export function normalizeNostrProfileName(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }

  return trimmed.slice(0, PROFILE_NAME_MAX_LENGTH);
}

export function parseNostrProfileMetadata(content: string): NostrProfileMetadata | null {
  try {
    const parsed: unknown = JSON.parse(content);
    if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") {
      return null;
    }

    return { ...(parsed as NostrProfileMetadata) };
  } catch {
    return null;
  }
}

export function getNostrProfileName(profile: NostrProfileMetadata | null): string | null {
  if (!profile) {
    return null;
  }

  const displayName = normalizeNostrProfileName(profile.display_name);
  if (displayName) {
    return displayName;
  }

  return normalizeNostrProfileName(profile.name);
}

export function mergeNostrProfileName(
  profile: NostrProfileMetadata | null,
  nextName: string | null,
): { profile: NostrProfileMetadata; changed: boolean; name: string | null } {
  const normalizedName = normalizeNostrProfileName(nextName);
  const currentName = getNostrProfileName(profile);

  if (normalizedName === currentName) {
    return {
      profile: profile ? { ...profile } : {},
      changed: false,
      name: normalizedName,
    };
  }

  const nextProfile = profile ? { ...profile } : {};
  if (normalizedName) {
    nextProfile.name = normalizedName;
    nextProfile.display_name = normalizedName;
  } else {
    delete nextProfile.name;
    delete nextProfile.display_name;
  }

  return {
    profile: nextProfile,
    changed: true,
    name: normalizedName,
  };
}

function buildProfileFilter(pubkey: string): Filter {
  return {
    kinds: [PROFILE_KIND],
    authors: [pubkey],
    limit: 1,
  };
}

function isValidProfileEvent(event: Event, pubkey: string): boolean {
  return event.kind === PROFILE_KIND && event.pubkey === pubkey && verifyEvent(event);
}

export async function fetchLatestNostrProfile(pubkey: string, relays?: string[]): Promise<NostrProfileReadResult> {
  const resolvedRelays = await resolveProfileRelays(pubkey, relays);
  if (resolvedRelays.length === 0) {
    return {
      profile: null,
      name: null,
    };
  }

  const pool = new SimplePool();
  try {
    const event = await pool.get(resolvedRelays, buildProfileFilter(pubkey), { maxWait: PROFILE_MAX_WAIT_MS });
    if (!event || !isValidProfileEvent(event, pubkey)) {
      return {
        profile: null,
        name: null,
      };
    }

    const profile = parseNostrProfileMetadata(event.content);
    return {
      profile,
      name: getNostrProfileName(profile),
    };
  } finally {
    pool.destroy();
  }
}

export async function publishNostrProfileNameIfChanged(
  identity: NostrIdentity,
  name: string | null,
  relays?: string[],
): Promise<NostrProfilePublishResult> {
  const resolvedRelays = await resolveProfileRelays(identity.pubkey, relays);
  if (resolvedRelays.length === 0) {
    return {
      published: false,
      name: normalizeNostrProfileName(name),
    };
  }

  const latestProfile = await fetchLatestNostrProfile(identity.pubkey, resolvedRelays);
  const mergedProfile = mergeNostrProfileName(latestProfile.profile, name);
  if (!mergedProfile.changed) {
    return {
      published: false,
      name: mergedProfile.name,
    };
  }

  const signedEvent = await identity.signEvent({
    kind: PROFILE_KIND,
    tags: [],
    content: JSON.stringify(mergedProfile.profile),
    created_at: Math.floor(Date.now() / 1000),
  });

  const pool = new SimplePool();
  try {
    const publishResults = await Promise.allSettled(pool.publish(resolvedRelays, signedEvent));
    const hasSuccess = publishResults.some((result) => result.status === "fulfilled");
    if (!hasSuccess) {
      throw new Error("Could not publish kind 0 profile metadata to any relay.");
    }

    return {
      published: true,
      name: mergedProfile.name,
    };
  } finally {
    pool.destroy();
  }
}
