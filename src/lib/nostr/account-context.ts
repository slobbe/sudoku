import { createContext } from "react";
import type { NostrIdentity } from "./identity";

export type NostrAccountStatus = "loading" | "ready";

export type NostrProfileSyncStatus = "idle" | "syncing" | "synced" | "up_to_date" | "failed";

export type NostrAccountActionResult = {
  ok: boolean;
  error?: string;
  message?: string;
};

export type NostrAccountContextValue = {
  status: NostrAccountStatus;
  identity: NostrIdentity | null;
  name: string | null;
  error: string | null;
  profileSyncStatus: NostrProfileSyncStatus;
  profileSyncMessage: string | null;
  hasNip07: boolean;
  connectNip07: () => Promise<NostrAccountActionResult>;
  importNsec: (nsec: string) => Promise<NostrAccountActionResult>;
  createLocalAccount: (name?: string) => Promise<NostrAccountActionResult>;
  updateLocalAccountName: (name: string) => Promise<NostrAccountActionResult>;
  refreshProfileFromRelays: () => Promise<NostrAccountActionResult>;
  getExportableNsec: () => string | null;
  logout: () => void;
};

export const NostrAccountContext = createContext<NostrAccountContextValue | null>(null);
