import type { EventTemplate, VerifiedEvent } from "nostr-tools";
import { finalizeEvent, generateSecretKey, getPublicKey, nip19 } from "nostr-tools";
import type { WindowNostr } from "nostr-tools/nip07";

export type NostrIdentitySource = "nip07" | "local";

export type NostrIdentity = {
  pubkey: string;
  npub: string;
  source: NostrIdentitySource;
  signEvent: (event: EventTemplate) => Promise<VerifiedEvent>;
};

declare global {
  interface Window {
    nostr?: WindowNostr;
  }
}

export function hasNip07Support(): boolean {
  return typeof window !== "undefined" && !!window.nostr;
}

export function createLocalIdentity(secretKey: Uint8Array): NostrIdentity {
  const pubkey = getPublicKey(secretKey);
  return {
    pubkey,
    npub: nip19.npubEncode(pubkey),
    source: "local",
    signEvent: async (eventTemplate: EventTemplate) => finalizeEvent(eventTemplate, secretKey),
  };
}

export async function connectNip07Identity(): Promise<NostrIdentity> {
  if (!hasNip07Support() || !window.nostr) {
    throw new Error("NIP-07 extension not available.");
  }

  const pubkey = await window.nostr.getPublicKey();
  if (typeof pubkey !== "string" || pubkey.length === 0) {
    throw new Error("NIP-07 extension returned an invalid pubkey.");
  }

  return {
    pubkey,
    npub: nip19.npubEncode(pubkey),
    source: "nip07",
    signEvent: async (eventTemplate: EventTemplate) => window.nostr!.signEvent(eventTemplate),
  };
}

export function createRandomLocalIdentity(): { identity: NostrIdentity; nsec: string } {
  const secretKey = generateSecretKey();
  return {
    identity: createLocalIdentity(secretKey),
    nsec: nip19.nsecEncode(secretKey),
  };
}

export function parseNsecToSecretKey(nsec: string): Uint8Array | null {
  const trimmed = nsec.trim();
  if (trimmed.length === 0) {
    return null;
  }

  try {
    const decoded = nip19.decode(trimmed);
    if (decoded.type !== "nsec" || decoded.data.length !== 32) {
      return null;
    }

    return decoded.data;
  } catch {
    return null;
  }
}
