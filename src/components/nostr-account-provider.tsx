"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  clearNostrSession,
  connectNip07Account,
  createSessionLocalAccount,
  importNsecAccount,
  restoreNostrAccountFromSession,
} from "@/lib/nostr/account";
import {
  NostrAccountContext,
  type NostrAccountActionResult,
} from "@/lib/nostr/account-context";
import { hasNip07Support, type NostrIdentity } from "@/lib/nostr/identity";

type NostrAccountProviderProps = {
  children: ReactNode;
};

export function NostrAccountProvider({ children }: NostrAccountProviderProps) {
  const [status, setStatus] = useState<"loading" | "ready">("loading");
  const [identity, setIdentity] = useState<NostrIdentity | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasNip07, setHasNip07] = useState(false);

  useEffect(() => {
    setHasNip07(hasNip07Support());
  }, []);

  useEffect(() => {
    let cancelled = false;

    void restoreNostrAccountFromSession()
      .then((result) => {
        if (cancelled) {
          return;
        }

        setIdentity(result.identity);
        setError(result.error);
      })
      .finally(() => {
        if (cancelled) {
          return;
        }
        setStatus("ready");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const connectNip07 = useCallback(async (): Promise<NostrAccountActionResult> => {
    try {
      const nextIdentity = await connectNip07Account();
      setIdentity(nextIdentity);
      setError(null);
      return { ok: true };
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "Could not connect NIP-07 account.";
      setError(message);
      return { ok: false, error: message };
    }
  }, []);

  const importNsec = useCallback(async (nsec: string): Promise<NostrAccountActionResult> => {
    try {
      const nextIdentity = importNsecAccount(nsec);
      setIdentity(nextIdentity);
      setError(null);
      return { ok: true };
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "Could not import nsec account.";
      setError(message);
      return { ok: false, error: message };
    }
  }, []);

  const createLocalAccount = useCallback(async (): Promise<NostrAccountActionResult> => {
    try {
      const nextIdentity = createSessionLocalAccount();
      setIdentity(nextIdentity);
      setError(null);
      return { ok: true };
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "Could not create local account.";
      setError(message);
      return { ok: false, error: message };
    }
  }, []);

  const logout = useCallback(() => {
    clearNostrSession();
    setIdentity(null);
    setError(null);
  }, []);

  const contextValue = useMemo(
    () => ({
      status,
      identity,
      error,
      hasNip07,
      connectNip07,
      importNsec,
      createLocalAccount,
      logout,
    }),
    [status, identity, error, hasNip07, connectNip07, importNsec, createLocalAccount, logout],
  );

  return <NostrAccountContext.Provider value={contextValue}>{children}</NostrAccountContext.Provider>;
}
