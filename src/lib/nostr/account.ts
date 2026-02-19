import type { NostrIdentity } from "./identity";
import {
  connectNip07Identity,
  createLocalIdentity,
  createRandomLocalIdentity,
  parseNsecToSecretKey,
} from "./identity";

const SESSION_ACCOUNT_MODE_KEY = "sudoku-nostr-account-mode-v1";
const SESSION_ACCOUNT_NSEC_KEY = "sudoku-nostr-account-nsec-v1";
const SESSION_ACCOUNT_NAME_KEY = "sudoku-nostr-account-name-v1";
const MAX_ACCOUNT_NAME_LENGTH = 64;

type StoredMode = "nip07" | "local";

export type NostrAccountRestoreResult = {
  identity: NostrIdentity | null;
  error: string | null;
  name: string | null;
};

export function normalizeNostrAccountName(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }

  return trimmed.slice(0, MAX_ACCOUNT_NAME_LENGTH);
}

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

function readStoredMode(storage: Storage): StoredMode | null {
  const value = storage.getItem(SESSION_ACCOUNT_MODE_KEY);
  if (value === "nip07" || value === "local") {
    return value;
  }

  return null;
}

function persistNip07Mode(storage: Storage): void {
  storage.setItem(SESSION_ACCOUNT_MODE_KEY, "nip07");
  storage.removeItem(SESSION_ACCOUNT_NSEC_KEY);
  storage.removeItem(SESSION_ACCOUNT_NAME_KEY);
}

function persistLocalNsec(storage: Storage, nsec: string, name?: string): void {
  storage.setItem(SESSION_ACCOUNT_MODE_KEY, "local");
  storage.setItem(SESSION_ACCOUNT_NSEC_KEY, nsec);

  const normalizedName = normalizeNostrAccountName(name);
  if (normalizedName) {
    storage.setItem(SESSION_ACCOUNT_NAME_KEY, normalizedName);
  } else {
    storage.removeItem(SESSION_ACCOUNT_NAME_KEY);
  }
}

export function clearNostrSession(): void {
  const storage = getSessionStorage();
  if (!storage) {
    return;
  }

  storage.removeItem(SESSION_ACCOUNT_MODE_KEY);
  storage.removeItem(SESSION_ACCOUNT_NSEC_KEY);
  storage.removeItem(SESSION_ACCOUNT_NAME_KEY);
}

export function getSessionLocalNsec(): string | null {
  const storage = getSessionStorage();
  if (!storage) {
    return null;
  }

  const mode = readStoredMode(storage);
  if (mode !== "local") {
    return null;
  }

  const storedNsec = storage.getItem(SESSION_ACCOUNT_NSEC_KEY);
  if (!storedNsec) {
    return null;
  }

  const normalized = storedNsec.trim();
  if (!parseNsecToSecretKey(normalized)) {
    return null;
  }

  return normalized;
}

export function getSessionAccountName(): string | null {
  const storage = getSessionStorage();
  if (!storage) {
    return null;
  }

  return normalizeNostrAccountName(storage.getItem(SESSION_ACCOUNT_NAME_KEY));
}

export function updateSessionAccountName(name: string): string | null {
  const storage = getSessionStorage();
  if (!storage) {
    throw new Error("Session storage is unavailable.");
  }

  const mode = readStoredMode(storage);
  if (mode !== "local") {
    throw new Error("Only local session accounts can set a name here.");
  }

  const normalizedName = normalizeNostrAccountName(name);
  if (normalizedName) {
    storage.setItem(SESSION_ACCOUNT_NAME_KEY, normalizedName);
  } else {
    storage.removeItem(SESSION_ACCOUNT_NAME_KEY);
  }

  return normalizedName;
}

export async function restoreNostrAccountFromSession(): Promise<NostrAccountRestoreResult> {
  const storage = getSessionStorage();
  if (!storage) {
    return {
      identity: null,
      error: "Session storage is unavailable.",
      name: null,
    };
  }

  const mode = readStoredMode(storage);
  if (!mode) {
    return {
      identity: null,
      error: null,
      name: null,
    };
  }

  if (mode === "nip07") {
    try {
      const identity = await connectNip07Identity();
      return {
        identity,
        error: null,
        name: null,
      };
    } catch {
      clearNostrSession();
      return {
        identity: null,
        error: "NIP-07 session could not be restored.",
        name: null,
      };
    }
  }

  const storedNsec = storage.getItem(SESSION_ACCOUNT_NSEC_KEY);
  if (!storedNsec) {
    clearNostrSession();
    return {
      identity: null,
      error: "Local session key not found.",
      name: null,
    };
  }

  const secretKey = parseNsecToSecretKey(storedNsec);
  if (!secretKey) {
    clearNostrSession();
    return {
      identity: null,
      error: "Stored local session key is invalid.",
      name: null,
    };
  }

  return {
    identity: createLocalIdentity(secretKey),
    error: null,
    name: normalizeNostrAccountName(storage.getItem(SESSION_ACCOUNT_NAME_KEY)),
  };
}

export async function connectNip07Account(): Promise<NostrIdentity> {
  const storage = getSessionStorage();
  if (!storage) {
    throw new Error("Session storage is unavailable.");
  }

  const identity = await connectNip07Identity();
  persistNip07Mode(storage);
  return identity;
}

export function importNsecAccount(nsec: string): NostrIdentity {
  const storage = getSessionStorage();
  if (!storage) {
    throw new Error("Session storage is unavailable.");
  }

  const secretKey = parseNsecToSecretKey(nsec);
  if (!secretKey) {
    throw new Error("Invalid nsec. Please paste a valid private key.");
  }

  const normalizedNsec = nsec.trim();
  const identity = createLocalIdentity(secretKey);
  persistLocalNsec(storage, normalizedNsec);
  return identity;
}

export function createSessionLocalAccount(name?: string): NostrIdentity {
  const storage = getSessionStorage();
  if (!storage) {
    throw new Error("Session storage is unavailable.");
  }

  const { identity, nsec } = createRandomLocalIdentity();
  persistLocalNsec(storage, nsec, name);
  return identity;
}
