import { createContext } from "react";
import type { NostrIdentity } from "./identity";

export type NostrAccountStatus = "loading" | "ready";

export type NostrAccountActionResult = {
  ok: boolean;
  error?: string;
};

export type NostrAccountContextValue = {
  status: NostrAccountStatus;
  identity: NostrIdentity | null;
  error: string | null;
  hasNip07: boolean;
  connectNip07: () => Promise<NostrAccountActionResult>;
  importNsec: (nsec: string) => Promise<NostrAccountActionResult>;
  createLocalAccount: () => Promise<NostrAccountActionResult>;
  logout: () => void;
};

export const NostrAccountContext = createContext<NostrAccountContextValue | null>(null);
