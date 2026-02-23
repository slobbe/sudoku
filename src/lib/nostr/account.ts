import type { NostrIdentity } from "./identity";
import {
  connectNip07Identity,
  createLocalIdentity,
  createRandomLocalIdentity,
  parseNsecToSecretKey,
} from "./identity";
import {
  decryptNsecWithPassphrase,
  encryptNsecWithPassphrase,
  isNostrKeyEncryptionEnvelope,
  type NostrKeyEncryptionEnvelope,
} from "./key-encryption";

const SESSION_ACCOUNT_MODE_KEY = "sudoku-nostr-account-mode-v1";
const SESSION_ACCOUNT_NSEC_KEY = "sudoku-nostr-account-nsec-v1";
const SESSION_ACCOUNT_NAME_KEY = "sudoku-nostr-account-name-v1";
const SESSION_UNLOCKED_NSEC_KEY = "sudoku-nostr-account-unlocked-nsec-v1";
const PERSISTED_ACCOUNT_KEY = "sudoku-nostr-account-v2";
const MAX_ACCOUNT_NAME_LENGTH = 64;

type StoredMode = "nip07" | "local";

export type NostrLocalKeyProtection = "none" | "encrypted" | "unencrypted";

type PersistedNip07AccountRecord = {
  schema: 2;
  mode: "nip07";
};

type PersistedLocalAccountRecord = {
  schema: 2;
  mode: "local";
  name: string | null;
  nsec?: string;
  encryptedNsec?: NostrKeyEncryptionEnvelope;
};

type PersistedAccountRecord = PersistedNip07AccountRecord | PersistedLocalAccountRecord;

export type NostrAccountRestoreResult = {
  identity: NostrIdentity | null;
  error: string | null;
  name: string | null;
  requiresPassphrase: boolean;
  localKeyProtection: NostrLocalKeyProtection;
};

export type NostrLocalAccountUnlockResult = {
  identity: NostrIdentity;
  name: string | null;
  localKeyProtection: NostrLocalKeyProtection;
};

let runtimeUnlockedLocalNsec: string | null = null;

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

function getLocalStorage(): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
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

function readLegacyLocalNsec(storage: Storage): string | null {
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

function clearLegacySessionKeys(storage: Storage | null): void {
  if (!storage) {
    return;
  }

  storage.removeItem(SESSION_ACCOUNT_MODE_KEY);
  storage.removeItem(SESSION_ACCOUNT_NSEC_KEY);
  storage.removeItem(SESSION_ACCOUNT_NAME_KEY);
}

function setRuntimeUnlockedLocalNsec(value: string | null): void {
  runtimeUnlockedLocalNsec = value;

  const sessionStorage = getSessionStorage();
  if (!sessionStorage) {
    return;
  }

  if (value) {
    sessionStorage.setItem(SESSION_UNLOCKED_NSEC_KEY, value);
    return;
  }

  sessionStorage.removeItem(SESSION_UNLOCKED_NSEC_KEY);
}

function readUnlockedLocalNsecFromSession(): string | null {
  if (runtimeUnlockedLocalNsec) {
    return runtimeUnlockedLocalNsec;
  }

  const sessionStorage = getSessionStorage();
  if (!sessionStorage) {
    return null;
  }

  const unlocked = sessionStorage.getItem(SESSION_UNLOCKED_NSEC_KEY);
  if (!unlocked) {
    return null;
  }

  const normalized = unlocked.trim();
  if (!parseNsecToSecretKey(normalized)) {
    sessionStorage.removeItem(SESSION_UNLOCKED_NSEC_KEY);
    return null;
  }

  runtimeUnlockedLocalNsec = normalized;
  return normalized;
}

function readPersistedAccountRecordFromStorage(storage: Storage): PersistedAccountRecord | null {
  const raw = storage.getItem(PERSISTED_ACCOUNT_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") {
      return null;
    }

    const candidate = parsed as {
      schema?: unknown;
      mode?: unknown;
      name?: unknown;
      nsec?: unknown;
      encryptedNsec?: unknown;
    };

    if (candidate.schema !== 2) {
      return null;
    }

    if (candidate.mode === "nip07") {
      return {
        schema: 2,
        mode: "nip07",
      };
    }

    if (candidate.mode !== "local") {
      return null;
    }

    const name = normalizeNostrAccountName(candidate.name);
    const normalizedNsec = typeof candidate.nsec === "string"
      ? candidate.nsec.trim()
      : null;
    const validNsec = normalizedNsec && parseNsecToSecretKey(normalizedNsec)
      ? normalizedNsec
      : null;
    const encryptedNsec = isNostrKeyEncryptionEnvelope(candidate.encryptedNsec)
      ? candidate.encryptedNsec
      : undefined;

    if (encryptedNsec) {
      return {
        schema: 2,
        mode: "local",
        name,
        encryptedNsec,
      };
    }

    if (validNsec) {
      return {
        schema: 2,
        mode: "local",
        name,
        nsec: validNsec,
      };
    }

    return null;
  } catch {
    return null;
  }
}

function readPersistedAccountRecord(): PersistedAccountRecord | null {
  const localStorage = getLocalStorage();
  if (localStorage) {
    const localRecord = readPersistedAccountRecordFromStorage(localStorage);
    if (localRecord) {
      return localRecord;
    }
  }

  const sessionStorage = getSessionStorage();
  if (sessionStorage) {
    return readPersistedAccountRecordFromStorage(sessionStorage);
  }

  return null;
}

function writePersistedAccountRecord(record: PersistedAccountRecord): boolean {
  const raw = JSON.stringify(record);
  const localStorage = getLocalStorage();
  if (localStorage) {
    try {
      localStorage.setItem(PERSISTED_ACCOUNT_KEY, raw);
      return true;
    } catch {
      // Fall through to session storage.
    }
  }

  const sessionStorage = getSessionStorage();
  if (!sessionStorage) {
    return false;
  }

  try {
    sessionStorage.setItem(PERSISTED_ACCOUNT_KEY, raw);
    return true;
  } catch {
    return false;
  }
}

function clearPersistedAccountRecord(): void {
  const localStorage = getLocalStorage();
  if (localStorage) {
    localStorage.removeItem(PERSISTED_ACCOUNT_KEY);
  }

  const sessionStorage = getSessionStorage();
  if (sessionStorage) {
    sessionStorage.removeItem(PERSISTED_ACCOUNT_KEY);
  }
}

function hasProvidedPassphrase(passphrase?: string): boolean {
  if (typeof passphrase !== "string") {
    return false;
  }

  return passphrase.trim().length > 0;
}

function mapRecordProtection(record: PersistedAccountRecord | null): NostrLocalKeyProtection {
  if (!record || record.mode !== "local") {
    return "none";
  }

  return record.encryptedNsec ? "encrypted" : "unencrypted";
}

function createIdentityFromNsec(nsec: string): NostrIdentity | null {
  const secretKey = parseNsecToSecretKey(nsec);
  if (!secretKey) {
    return null;
  }

  return createLocalIdentity(secretKey);
}

function migrateLegacySessionIfNeeded(): PersistedAccountRecord | null {
  const existing = readPersistedAccountRecord();
  if (existing) {
    return existing;
  }

  const sessionStorage = getSessionStorage();
  if (!sessionStorage) {
    return null;
  }

  const mode = readStoredMode(sessionStorage);
  if (!mode) {
    return null;
  }

  if (mode === "nip07") {
    const migrated: PersistedAccountRecord = {
      schema: 2,
      mode: "nip07",
    };
    if (writePersistedAccountRecord(migrated)) {
      clearLegacySessionKeys(sessionStorage);
      return migrated;
    }

    return null;
  }

  const nsec = readLegacyLocalNsec(sessionStorage);
  if (!nsec) {
    clearLegacySessionKeys(sessionStorage);
    return null;
  }

  const migrated: PersistedAccountRecord = {
    schema: 2,
    mode: "local",
    name: normalizeNostrAccountName(sessionStorage.getItem(SESSION_ACCOUNT_NAME_KEY)),
    nsec,
  };

  if (writePersistedAccountRecord(migrated)) {
    clearLegacySessionKeys(sessionStorage);
  }
  setRuntimeUnlockedLocalNsec(nsec);
  return migrated;
}

function readCurrentAccountRecord(): PersistedAccountRecord | null {
  return migrateLegacySessionIfNeeded();
}

function getStorageUnavailableError(): string {
  return "Browser storage is unavailable.";
}

export function clearNostrSession(): void {
  clearLegacySessionKeys(getSessionStorage());
  clearPersistedAccountRecord();
  setRuntimeUnlockedLocalNsec(null);
}

export function getSessionLocalNsec(): string | null {
  const unlocked = readUnlockedLocalNsecFromSession();
  if (unlocked) {
    return unlocked;
  }

  const record = readCurrentAccountRecord();
  if (!record || record.mode !== "local" || !record.nsec) {
    return null;
  }

  setRuntimeUnlockedLocalNsec(record.nsec);
  return record.nsec;
}

export function getSessionAccountName(): string | null {
  const record = readCurrentAccountRecord();
  if (record?.mode === "local") {
    return record.name;
  }

  const sessionStorage = getSessionStorage();
  if (!sessionStorage) {
    return null;
  }

  return normalizeNostrAccountName(sessionStorage.getItem(SESSION_ACCOUNT_NAME_KEY));
}

export function readStoredLocalKeyProtection(): NostrLocalKeyProtection {
  return mapRecordProtection(readCurrentAccountRecord());
}

export function updateSessionAccountName(name: string): string | null {
  const normalizedName = normalizeNostrAccountName(name);
  const record = readCurrentAccountRecord();
  if (record?.mode === "local") {
    const nextRecord: PersistedLocalAccountRecord = {
      ...record,
      name: normalizedName,
    };
    if (!writePersistedAccountRecord(nextRecord)) {
      throw new Error(getStorageUnavailableError());
    }

    return normalizedName;
  }

  const sessionStorage = getSessionStorage();
  if (!sessionStorage || readStoredMode(sessionStorage) !== "local") {
    throw new Error("Only local session accounts can set a name here.");
  }

  if (normalizedName) {
    sessionStorage.setItem(SESSION_ACCOUNT_NAME_KEY, normalizedName);
  } else {
    sessionStorage.removeItem(SESSION_ACCOUNT_NAME_KEY);
  }

  return normalizedName;
}

export async function restoreNostrAccountFromSession(): Promise<NostrAccountRestoreResult> {
  const record = readCurrentAccountRecord();
  if (!record) {
    const localStorage = getLocalStorage();
    const sessionStorage = getSessionStorage();
    if (!localStorage && !sessionStorage) {
      return {
        identity: null,
        error: getStorageUnavailableError(),
        name: null,
        requiresPassphrase: false,
        localKeyProtection: "none",
      };
    }

    return {
      identity: null,
      error: null,
      name: null,
      requiresPassphrase: false,
      localKeyProtection: "none",
    };
  }

  if (record.mode === "nip07") {
    try {
      const identity = await connectNip07Identity();
      setRuntimeUnlockedLocalNsec(null);
      return {
        identity,
        error: null,
        name: null,
        requiresPassphrase: false,
        localKeyProtection: "none",
      };
    } catch {
      clearNostrSession();
      return {
        identity: null,
        error: "NIP-07 session could not be restored.",
        name: null,
        requiresPassphrase: false,
        localKeyProtection: "none",
      };
    }
  }

  if (record.nsec) {
    const identity = createIdentityFromNsec(record.nsec);
    if (!identity) {
      clearNostrSession();
      return {
        identity: null,
        error: "Stored local key is invalid.",
        name: record.name,
        requiresPassphrase: false,
        localKeyProtection: "unencrypted",
      };
    }

    setRuntimeUnlockedLocalNsec(record.nsec);
    return {
      identity,
      error: null,
      name: record.name,
      requiresPassphrase: false,
      localKeyProtection: "unencrypted",
    };
  }

  const unlockedNsec = readUnlockedLocalNsecFromSession();
  if (unlockedNsec) {
    const identity = createIdentityFromNsec(unlockedNsec);
    if (identity) {
      return {
        identity,
        error: null,
        name: record.name,
        requiresPassphrase: false,
        localKeyProtection: "encrypted",
      };
    }

    setRuntimeUnlockedLocalNsec(null);
  }

  return {
    identity: null,
    error: null,
    name: record.name,
    requiresPassphrase: true,
    localKeyProtection: "encrypted",
  };
}

export async function unlockStoredLocalAccount(passphrase: string): Promise<NostrLocalAccountUnlockResult> {
  const record = readCurrentAccountRecord();
  if (!record || record.mode !== "local" || !record.encryptedNsec) {
    throw new Error("No encrypted local key is available to unlock.");
  }

  const nsec = await decryptNsecWithPassphrase(record.encryptedNsec, passphrase);
  if (!nsec) {
    throw new Error("Passphrase is incorrect or key data is invalid.");
  }

  const identity = createIdentityFromNsec(nsec);
  if (!identity) {
    throw new Error("Stored encrypted local key is invalid.");
  }

  setRuntimeUnlockedLocalNsec(nsec);
  return {
    identity,
    name: record.name,
    localKeyProtection: "encrypted",
  };
}

export async function connectNip07Account(): Promise<NostrIdentity> {
  const identity = await connectNip07Identity();
  const persisted = writePersistedAccountRecord({
    schema: 2,
    mode: "nip07",
  });
  if (!persisted) {
    throw new Error(getStorageUnavailableError());
  }

  clearLegacySessionKeys(getSessionStorage());
  setRuntimeUnlockedLocalNsec(null);
  return identity;
}

export async function importNsecAccount(nsec: string, passphrase?: string): Promise<NostrIdentity> {
  const secretKey = parseNsecToSecretKey(nsec);
  if (!secretKey) {
    throw new Error("Invalid nsec. Please paste a valid private key.");
  }

  const normalizedNsec = nsec.trim();
  const normalizedName = null;
  let nextRecord: PersistedLocalAccountRecord;
  if (hasProvidedPassphrase(passphrase)) {
    const encryptedNsec = await encryptNsecWithPassphrase(normalizedNsec, passphrase as string);
    nextRecord = {
      schema: 2,
      mode: "local",
      name: normalizedName,
      encryptedNsec,
    };
  } else {
    nextRecord = {
      schema: 2,
      mode: "local",
      name: normalizedName,
      nsec: normalizedNsec,
    };
  }

  if (!writePersistedAccountRecord(nextRecord)) {
    throw new Error(getStorageUnavailableError());
  }

  clearLegacySessionKeys(getSessionStorage());
  setRuntimeUnlockedLocalNsec(normalizedNsec);
  return createLocalIdentity(secretKey);
}

export async function createSessionLocalAccount(name?: string, passphrase?: string): Promise<NostrIdentity> {
  const { identity, nsec } = createRandomLocalIdentity();
  const normalizedName = normalizeNostrAccountName(name);
  let nextRecord: PersistedLocalAccountRecord;
  if (hasProvidedPassphrase(passphrase)) {
    const encryptedNsec = await encryptNsecWithPassphrase(nsec, passphrase as string);
    nextRecord = {
      schema: 2,
      mode: "local",
      name: normalizedName,
      encryptedNsec,
    };
  } else {
    nextRecord = {
      schema: 2,
      mode: "local",
      name: normalizedName,
      nsec,
    };
  }

  if (!writePersistedAccountRecord(nextRecord)) {
    throw new Error(getStorageUnavailableError());
  }

  clearLegacySessionKeys(getSessionStorage());
  setRuntimeUnlockedLocalNsec(nsec);
  return identity;
}
