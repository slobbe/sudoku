import { createContext } from "react";
import type { NostrAppDataEncryption, NostrRelayPublishSummary } from "./app-data";
import type { NostrIdentity } from "./identity";

export type NostrAccountStatus = "loading" | "ready";

export type NostrActionStatus = "idle" | "syncing" | "synced" | "up_to_date" | "failed";
export type NostrProfileSyncStatus = NostrActionStatus;
export type NostrLocalKeyProtection = "none" | "encrypted" | "unencrypted";
export type NostrAccountActionReason = "success" | "no_backup" | "no_data" | "error" | "cancelled";

export type NostrAccountActionResult = {
  ok: boolean;
  reason?: NostrAccountActionReason;
  error?: string;
  message?: string;
  encryption?: NostrAppDataEncryption | null;
  relaySummary?: NostrRelayPublishSummary | null;
  updatedAt?: string | null;
};

export type NostrAccountContextValue = {
  status: NostrAccountStatus;
  identity: NostrIdentity | null;
  name: string | null;
  error: string | null;
  isLocalKeyLocked: boolean;
  localKeyProtection: NostrLocalKeyProtection;
  profileStatus: NostrActionStatus;
  profileMessage: string | null;
  backupStatus: NostrActionStatus;
  backupMessage: string | null;
  restoreStatus: NostrActionStatus;
  restoreMessage: string | null;
  lastBackupAt: string | null;
  lastRestoreAt: string | null;
  lastBackupEncryption: NostrAppDataEncryption | null;
  lastRestoreEncryption: NostrAppDataEncryption | null;
  lastBackupRelaySummary: NostrRelayPublishSummary | null;
  restoreRevision: number;
  hasNip07: boolean;
  connectNip07: () => Promise<NostrAccountActionResult>;
  importNsec: (nsec: string, passphrase?: string) => Promise<NostrAccountActionResult>;
  createLocalAccount: (name?: string, passphrase?: string) => Promise<NostrAccountActionResult>;
  unlockLocalAccount: (passphrase: string) => Promise<NostrAccountActionResult>;
  protectLocalKeyWithPassphrase: (passphrase: string) => Promise<NostrAccountActionResult>;
  updateLocalAccountName: (name: string) => Promise<NostrAccountActionResult>;
  refreshProfileFromRelays: () => Promise<NostrAccountActionResult>;
  backupGameDataToRelays: () => Promise<NostrAccountActionResult>;
  restoreGameDataFromRelays: () => Promise<NostrAccountActionResult>;
  getExportableNsec: () => string | null;
  logout: () => void;
};

export const NostrAccountContext = createContext<NostrAccountContextValue | null>(null);
