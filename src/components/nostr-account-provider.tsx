"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  clearNostrSession,
  connectNip07Account,
  createSessionLocalAccount,
  getSessionAccountName,
  getSessionLocalNsec,
  importNsecAccount,
  restoreNostrAccountFromSession,
  updateSessionAccountName,
} from "@/lib/nostr/account";
import {
  fetchLatestNostrProfile,
  normalizeNostrProfileName,
  publishNostrProfileNameIfChanged,
} from "@/lib/nostr/profile";
import {
  fetchLatestNostrAppData,
  publishNostrAppDataIfChanged,
} from "@/lib/nostr/app-data";
import {
  NostrAccountContext,
  type NostrAccountActionResult,
  type NostrProfileSyncStatus,
} from "@/lib/nostr/account-context";
import { hasNip07Support, type NostrIdentity } from "@/lib/nostr/identity";
import {
  loadSavedGamePayloadFromBrowser,
  saveSavedGamePayloadToBrowser,
} from "@/lib/storage/saved-game-repository";

type NostrAccountProviderProps = {
  children: ReactNode;
};

type ProfileSyncOptions = {
  showSyncingState?: boolean;
  isCancelled?: () => boolean;
};

const CANCELLATION_ERROR = "Operation cancelled.";

export function NostrAccountProvider({ children }: NostrAccountProviderProps) {
  const [status, setStatus] = useState<"loading" | "ready">("loading");
  const [identity, setIdentity] = useState<NostrIdentity | null>(null);
  const [name, setName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasNip07, setHasNip07] = useState(false);
  const [profileSyncStatus, setProfileSyncStatus] = useState<NostrProfileSyncStatus>("idle");
  const [profileSyncMessage, setProfileSyncMessage] = useState<string | null>(null);
  const [lastBackupAt, setLastBackupAt] = useState<string | null>(null);
  const [lastRestoreAt, setLastRestoreAt] = useState<string | null>(null);
  const nameRef = useRef<string | null>(null);

  useEffect(() => {
    nameRef.current = name;
  }, [name]);

  useEffect(() => {
    setHasNip07(hasNip07Support());
  }, []);

  const syncProfileFromRelays = useCallback(async (
    targetIdentity: NostrIdentity,
    options?: ProfileSyncOptions,
  ): Promise<NostrAccountActionResult> => {
    const isCancelled = options?.isCancelled;
    const showSyncingState = options?.showSyncingState !== false;
    if (isCancelled?.()) {
      return { ok: false, error: CANCELLATION_ERROR };
    }

    if (showSyncingState) {
      setProfileSyncStatus("syncing");
      setProfileSyncMessage("Refreshing profile from Nostr relays...");
    }

    try {
      const profile = await fetchLatestNostrProfile(targetIdentity.pubkey);
      if (isCancelled?.()) {
        return { ok: false, error: CANCELLATION_ERROR };
      }

      const relayName = profile.name;
      const previousName = nameRef.current;
      if (relayName && targetIdentity.source === "local") {
        try {
          updateSessionAccountName(relayName);
        } catch {
          // Ignore persistence failures and still use the in-memory name.
        }
      }

      if (relayName) {
        setName(relayName);
      }

      let message = "Profile already up to date on relays.";
      let nextStatus: NostrProfileSyncStatus = "up_to_date";
      if (!relayName) {
        message = "No profile name found on Nostr relays.";
      } else if (relayName !== previousName) {
        message = "Profile name refreshed from Nostr relays.";
        nextStatus = "synced";
      }

      setProfileSyncStatus(nextStatus);
      setProfileSyncMessage(message);
      setError(null);
      return { ok: true, message };
    } catch (caughtError) {
      if (isCancelled?.()) {
        return { ok: false, error: CANCELLATION_ERROR };
      }

      const detail = caughtError instanceof Error ? caughtError.message : "Could not read kind 0 profile metadata.";
      setProfileSyncStatus("failed");
      setProfileSyncMessage("Could not refresh profile from Nostr relays.");
      setError(detail);
      return {
        ok: false,
        error: detail,
        message: "Could not refresh profile from Nostr relays.",
      };
    }
  }, []);

  const publishProfileName = useCallback(async (
    targetIdentity: NostrIdentity,
    nextName: string | null,
  ): Promise<NostrAccountActionResult> => {
    setProfileSyncStatus("syncing");
    setProfileSyncMessage("Syncing profile name to Nostr relays...");

    try {
      const publishResult = await publishNostrProfileNameIfChanged(targetIdentity, nextName);
      const message = publishResult.published
        ? "Name synced to Nostr relays."
        : "Name already synced on Nostr relays.";
      setProfileSyncStatus(publishResult.published ? "synced" : "up_to_date");
      setProfileSyncMessage(message);
      setError(null);
      return { ok: true, message };
    } catch (caughtError) {
      const detail = caughtError instanceof Error
        ? caughtError.message
        : "Could not publish kind 0 profile metadata.";
      const message = targetIdentity.source === "local"
        ? "Name saved locally, but relay sync failed."
        : "Name updated, but relay sync failed.";
      setProfileSyncStatus("failed");
      setProfileSyncMessage(message);
      setError(detail);
      return { ok: true, message };
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    void restoreNostrAccountFromSession()
      .then((result) => {
        if (cancelled) {
          return;
        }

        setIdentity(result.identity);
        setName(result.name);
        setError(result.error);
        setProfileSyncStatus("idle");
        setProfileSyncMessage(null);
        setLastBackupAt(null);
        setLastRestoreAt(null);
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
      setName(null);
      setError(null);
      setProfileSyncStatus("idle");
      setProfileSyncMessage(null);
      setLastBackupAt(null);
      setLastRestoreAt(null);
      return { ok: true };
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "Could not connect NIP-07 account.";
      setError(message);
      setProfileSyncStatus("failed");
      setProfileSyncMessage("Could not connect NIP-07 identity.");
      return { ok: false, error: message };
    }
  }, []);

  const importNsec = useCallback(async (nsec: string): Promise<NostrAccountActionResult> => {
    try {
      const nextIdentity = importNsecAccount(nsec);
      const importedName = getSessionAccountName();
      setIdentity(nextIdentity);
      setName(importedName);
      setError(null);
      setLastBackupAt(null);
      setLastRestoreAt(null);

      const syncResult = await syncProfileFromRelays(nextIdentity);
      if (!syncResult.ok) {
        return {
          ok: true,
          message: "Imported key, but could not refresh profile from relays.",
        };
      }

      return {
        ok: true,
        message: syncResult.message ?? "Imported session key.",
      };
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "Could not import nsec account.";
      setError(message);
      setProfileSyncStatus("failed");
      setProfileSyncMessage("Could not import session key.");
      return { ok: false, error: message };
    }
  }, [syncProfileFromRelays]);

  const createLocalAccount = useCallback(async (accountName?: string): Promise<NostrAccountActionResult> => {
    try {
      const nextIdentity = createSessionLocalAccount(accountName);
      const sessionName = getSessionAccountName();

      setIdentity(nextIdentity);
      setName(sessionName);
      setError(null);
      setLastBackupAt(null);
      setLastRestoreAt(null);

      if (!normalizeNostrProfileName(sessionName)) {
        setProfileSyncStatus("idle");
        setProfileSyncMessage(null);
        return { ok: true };
      }

      return await publishProfileName(nextIdentity, sessionName);
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "Could not create local account.";
      setError(message);
      setProfileSyncStatus("failed");
      setProfileSyncMessage("Could not create local session key.");
      return { ok: false, error: message };
    }
  }, [publishProfileName]);

  const updateLocalAccountName = useCallback(async (nextName: string): Promise<NostrAccountActionResult> => {
    if (!identity) {
      const message = "No connected identity available.";
      setError(message);
      return { ok: false, error: message };
    }

    try {
      const normalizedNextName = normalizeNostrProfileName(nextName);
      const currentName = normalizeNostrProfileName(nameRef.current);
      if (normalizedNextName === currentName) {
        if (identity.source === "local") {
          updateSessionAccountName(nextName);
        }

        setName(normalizedNextName);
        setProfileSyncStatus("up_to_date");
        setProfileSyncMessage("Name already synced on Nostr relays.");
        setError(null);
        return {
          ok: true,
          message: "Name already synced on Nostr relays.",
        };
      }

      const normalizedName = identity.source === "local"
        ? updateSessionAccountName(nextName)
        : normalizedNextName;
      setName(normalizedName);
      return await publishProfileName(identity, normalizedName);
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "Could not update account name.";
      setError(message);
      setProfileSyncStatus("failed");
      setProfileSyncMessage("Could not update profile name.");
      return { ok: false, error: message };
    }
  }, [identity, publishProfileName]);

  const refreshProfileFromRelays = useCallback(async (): Promise<NostrAccountActionResult> => {
    if (!identity) {
      const message = "No connected identity available.";
      setError(message);
      return { ok: false, error: message };
    }

    return syncProfileFromRelays(identity);
  }, [identity, syncProfileFromRelays]);

  const backupGameDataToRelays = useCallback(async (): Promise<NostrAccountActionResult> => {
    if (!identity) {
      const message = "No connected identity available.";
      setError(message);
      return { ok: false, error: message };
    }

    const payload = await loadSavedGamePayloadFromBrowser();
    if (!payload) {
      const message = "No local game data to back up yet.";
      setProfileSyncStatus("up_to_date");
      setProfileSyncMessage(message);
      return { ok: false, error: message };
    }

    setProfileSyncStatus("syncing");
    setProfileSyncMessage("Backing up encrypted game data to Nostr relays...");

    try {
      const result = await publishNostrAppDataIfChanged(identity, payload);
      const message = result.published
        ? `Encrypted backup synced to relays (${result.encryption}).`
        : "Encrypted backup already up to date on relays.";
      if (result.updatedAt) {
        setLastBackupAt(result.updatedAt);
      }
      setProfileSyncStatus(result.published ? "synced" : "up_to_date");
      setProfileSyncMessage(message);
      setError(null);
      return { ok: true, message };
    } catch (caughtError) {
      const message = caughtError instanceof Error
        ? caughtError.message
        : "Could not back up encrypted game data to relays.";
      setProfileSyncStatus("failed");
      setProfileSyncMessage("Encrypted game backup failed.");
      setError(message);
      return { ok: false, error: message };
    }
  }, [identity]);

  const restoreGameDataFromRelays = useCallback(async (): Promise<NostrAccountActionResult> => {
    if (!identity) {
      const message = "No connected identity available.";
      setError(message);
      return { ok: false, error: message };
    }

    setProfileSyncStatus("syncing");
    setProfileSyncMessage("Restoring encrypted game data from Nostr relays...");

    try {
      const appData = await fetchLatestNostrAppData(identity);
      if (!appData.payload) {
        const message = "No encrypted backup found on relays.";
        setProfileSyncStatus("up_to_date");
        setProfileSyncMessage(message);
        return { ok: false, error: message };
      }

      if (!await saveSavedGamePayloadToBrowser(appData.payload)) {
        throw new Error("Could not restore backup into local storage.");
      }

      const message = appData.updatedAt
        ? `Encrypted backup restored from ${new Date(appData.updatedAt).toLocaleString()}.`
        : "Encrypted backup restored from relays.";
      if (appData.updatedAt) {
        setLastBackupAt(appData.updatedAt);
      }
      setLastRestoreAt(new Date().toISOString());
      setProfileSyncStatus("synced");
      setProfileSyncMessage(message);
      setError(null);
      return { ok: true, message };
    } catch (caughtError) {
      const message = caughtError instanceof Error
        ? caughtError.message
        : "Could not restore encrypted game data from relays.";
      setProfileSyncStatus("failed");
      setProfileSyncMessage("Encrypted game restore failed.");
      setError(message);
      return { ok: false, error: message };
    }
  }, [identity]);

  const logout = useCallback(() => {
    clearNostrSession();
    setIdentity(null);
    setName(null);
    setError(null);
    setProfileSyncStatus("idle");
    setProfileSyncMessage(null);
    setLastBackupAt(null);
    setLastRestoreAt(null);
  }, []);

  const getExportableNsec = useCallback(() => getSessionLocalNsec(), []);

  const contextValue = useMemo(
    () => ({
      status,
      identity,
      name,
      error,
      profileSyncStatus,
      profileSyncMessage,
      lastBackupAt,
      lastRestoreAt,
      hasNip07,
      connectNip07,
      importNsec,
      createLocalAccount,
      updateLocalAccountName,
      refreshProfileFromRelays,
      backupGameDataToRelays,
      restoreGameDataFromRelays,
      getExportableNsec,
      logout,
    }),
    [
      status,
      identity,
      name,
      error,
      profileSyncStatus,
      profileSyncMessage,
      lastBackupAt,
      lastRestoreAt,
      hasNip07,
      connectNip07,
      importNsec,
      createLocalAccount,
      updateLocalAccountName,
      refreshProfileFromRelays,
      backupGameDataToRelays,
      restoreGameDataFromRelays,
      getExportableNsec,
      logout,
    ],
  );

  return <NostrAccountContext.Provider value={contextValue}>{children}</NostrAccountContext.Provider>;
}
