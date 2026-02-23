"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  clearNostrSession,
  connectNip07Account,
  createLocalAccount as createPersistedLocalAccount,
  getSessionAccountName,
  getSessionLocalNsec,
  importNsecAccount,
  protectStoredLocalKeyWithPassphrase,
  restoreNostrAccountFromSession,
  unlockStoredLocalAccount,
  updateSessionAccountName,
} from "@/lib/nostr/account";
import {
  NostrAccountContext,
  type NostrAccountActionResult,
  type NostrActionStatus,
  type NostrLocalKeyProtection,
} from "@/lib/nostr/account-context";
import {
  fetchLatestNostrAppData,
  publishNostrAppDataIfChanged,
  type NostrAppDataEncryption,
  type NostrRelayPublishSummary,
} from "@/lib/nostr/app-data";
import { hasNip07Support, type NostrIdentity } from "@/lib/nostr/identity";
import { emitNostrRestoreCompletedEvent } from "@/lib/nostr/restore-event";
import { NOSTR_NO_BACKUP_FOUND_MESSAGE } from "@/lib/nostr/status-copy";
import {
  fetchLatestNostrProfile,
  normalizeNostrProfileName,
  publishNostrProfileNameIfChanged,
} from "@/lib/nostr/profile";
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
  const [isLocalKeyLocked, setIsLocalKeyLocked] = useState(false);
  const [localKeyProtection, setLocalKeyProtection] = useState<NostrLocalKeyProtection>("none");
  const [hasNip07, setHasNip07] = useState(false);

  const [profileStatus, setProfileStatus] = useState<NostrActionStatus>("idle");
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [backupStatus, setBackupStatus] = useState<NostrActionStatus>("idle");
  const [backupMessage, setBackupMessage] = useState<string | null>(null);
  const [restoreStatus, setRestoreStatus] = useState<NostrActionStatus>("idle");
  const [restoreMessage, setRestoreMessage] = useState<string | null>(null);

  const [lastBackupAt, setLastBackupAt] = useState<string | null>(null);
  const [lastRestoreAt, setLastRestoreAt] = useState<string | null>(null);
  const [lastBackupEncryption, setLastBackupEncryption] = useState<NostrAppDataEncryption | null>(null);
  const [lastRestoreEncryption, setLastRestoreEncryption] = useState<NostrAppDataEncryption | null>(null);
  const [lastBackupRelaySummary, setLastBackupRelaySummary] = useState<NostrRelayPublishSummary | null>(null);
  const [restoreRevision, setRestoreRevision] = useState(0);

  const nameRef = useRef<string | null>(null);

  useEffect(() => {
    nameRef.current = name;
  }, [name]);

  useEffect(() => {
    setHasNip07(hasNip07Support());
  }, []);

  const resetActionChannels = useCallback(() => {
    setProfileStatus("idle");
    setProfileMessage(null);
    setBackupStatus("idle");
    setBackupMessage(null);
    setRestoreStatus("idle");
    setRestoreMessage(null);
  }, []);

  const resetBackupRestoreMetadata = useCallback(() => {
    setLastBackupAt(null);
    setLastRestoreAt(null);
    setLastBackupEncryption(null);
    setLastRestoreEncryption(null);
    setLastBackupRelaySummary(null);
    setRestoreRevision(0);
  }, []);

  const syncProfileFromRelays = useCallback(async (
    targetIdentity: NostrIdentity,
    options?: ProfileSyncOptions,
  ): Promise<NostrAccountActionResult> => {
    const isCancelled = options?.isCancelled;
    const showSyncingState = options?.showSyncingState !== false;
    if (isCancelled?.()) {
      return { ok: false, reason: "cancelled", error: CANCELLATION_ERROR };
    }

    if (showSyncingState) {
      setProfileStatus("syncing");
      setProfileMessage("Refreshing profile from Nostr relays...");
    }

    try {
      const profile = await fetchLatestNostrProfile(targetIdentity.pubkey);
      if (isCancelled?.()) {
        return { ok: false, reason: "cancelled", error: CANCELLATION_ERROR };
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
      let nextStatus: NostrActionStatus = "up_to_date";
      if (!relayName) {
        message = "No profile name found on Nostr relays.";
      } else if (relayName !== previousName) {
        message = "Profile name refreshed from Nostr relays.";
        nextStatus = "synced";
      }

      setProfileStatus(nextStatus);
      setProfileMessage(message);
      setError(null);
      return { ok: true, reason: "success", message };
    } catch (caughtError) {
      if (isCancelled?.()) {
        return { ok: false, reason: "cancelled", error: CANCELLATION_ERROR };
      }

      const detail = caughtError instanceof Error ? caughtError.message : "Could not read kind 0 profile metadata.";
      setProfileStatus("failed");
      setProfileMessage("Could not refresh profile from Nostr relays.");
      setError(detail);
      return {
        ok: false,
        reason: "error",
        error: detail,
        message: "Could not refresh profile from Nostr relays.",
      };
    }
  }, []);

  const publishProfileName = useCallback(async (
    targetIdentity: NostrIdentity,
    nextName: string | null,
  ): Promise<NostrAccountActionResult> => {
    setProfileStatus("syncing");
    setProfileMessage("Syncing profile name to Nostr relays...");

    try {
      const publishResult = await publishNostrProfileNameIfChanged(targetIdentity, nextName);
      const message = publishResult.published
        ? "Name synced to Nostr relays."
        : "Name already synced on Nostr relays.";
      setProfileStatus(publishResult.published ? "synced" : "up_to_date");
      setProfileMessage(message);
      setError(null);
      return { ok: true, reason: "success", message };
    } catch (caughtError) {
      const detail = caughtError instanceof Error
        ? caughtError.message
        : "Could not publish kind 0 profile metadata.";
      const message = targetIdentity.source === "local"
        ? "Name saved locally, but relay sync failed."
        : "Name updated, but relay sync failed.";
      setProfileStatus("failed");
      setProfileMessage(message);
      setError(detail);
      return { ok: true, reason: "error", message };
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
        setIsLocalKeyLocked(result.requiresPassphrase);
        setLocalKeyProtection(result.localKeyProtection);
        resetActionChannels();
        resetBackupRestoreMetadata();
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
  }, [resetActionChannels, resetBackupRestoreMetadata]);

  const connectNip07 = useCallback(async (): Promise<NostrAccountActionResult> => {
    try {
      const nextIdentity = await connectNip07Account();
      setIdentity(nextIdentity);
      setName(null);
      setError(null);
      setIsLocalKeyLocked(false);
      setLocalKeyProtection("none");
      resetActionChannels();
      resetBackupRestoreMetadata();
      return { ok: true, reason: "success" };
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "Could not connect NIP-07 account.";
      setError(message);
      setProfileStatus("failed");
      setProfileMessage("Could not connect NIP-07 identity.");
      return { ok: false, reason: "error", error: message };
    }
  }, [resetActionChannels, resetBackupRestoreMetadata]);

  const importNsec = useCallback(async (nsec: string, passphrase?: string): Promise<NostrAccountActionResult> => {
    try {
      const nextIdentity = await importNsecAccount(nsec, passphrase);
      const importedName = getSessionAccountName();
      setIdentity(nextIdentity);
      setName(importedName);
      setError(null);
      setIsLocalKeyLocked(false);
      setLocalKeyProtection(passphrase && passphrase.trim().length > 0 ? "encrypted" : "unencrypted");
      setBackupStatus("idle");
      setBackupMessage(null);
      setRestoreStatus("idle");
      setRestoreMessage(null);
      resetBackupRestoreMetadata();

      const syncResult = await syncProfileFromRelays(nextIdentity);
      if (!syncResult.ok) {
        return {
          ok: true,
          reason: "error",
          message: "Imported local key, but could not refresh profile from relays.",
        };
      }

      return {
        ok: true,
        reason: "success",
        message: syncResult.message ?? "Imported local key.",
      };
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "Could not import nsec account.";
      setError(message);
      setProfileStatus("failed");
      setProfileMessage("Could not import local key.");
      return { ok: false, reason: "error", error: message };
    }
  }, [resetBackupRestoreMetadata, syncProfileFromRelays]);

  const createLocalAccount = useCallback(async (
    accountName?: string,
    passphrase?: string,
  ): Promise<NostrAccountActionResult> => {
    try {
      const nextIdentity = await createPersistedLocalAccount(accountName, passphrase);
      const sessionName = getSessionAccountName();

      setIdentity(nextIdentity);
      setName(sessionName);
      setError(null);
      setIsLocalKeyLocked(false);
      setLocalKeyProtection(passphrase && passphrase.trim().length > 0 ? "encrypted" : "unencrypted");
      setBackupStatus("idle");
      setBackupMessage(null);
      setRestoreStatus("idle");
      setRestoreMessage(null);
      resetBackupRestoreMetadata();

      if (!normalizeNostrProfileName(sessionName)) {
        setProfileStatus("idle");
        setProfileMessage(null);
        return { ok: true, reason: "success" };
      }

      return await publishProfileName(nextIdentity, sessionName);
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "Could not create local account.";
      setError(message);
      setProfileStatus("failed");
      setProfileMessage("Could not create local key.");
      return { ok: false, reason: "error", error: message };
    }
  }, [publishProfileName, resetBackupRestoreMetadata]);

  const unlockLocalAccount = useCallback(async (passphrase: string): Promise<NostrAccountActionResult> => {
    try {
      const result = await unlockStoredLocalAccount(passphrase);
      setIdentity(result.identity);
      setName(result.name);
      setError(null);
      setIsLocalKeyLocked(false);
      setLocalKeyProtection(result.localKeyProtection);
      setProfileStatus("idle");
      setProfileMessage("Local key unlocked.");
      return {
        ok: true,
        reason: "success",
        message: "Local key unlocked.",
      };
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "Could not unlock local key.";
      setError(message);
      setProfileStatus("failed");
      setProfileMessage("Could not unlock local key.");
      return {
        ok: false,
        reason: "error",
        error: message,
      };
    }
  }, []);

  const protectLocalKeyWithPassphrase = useCallback(async (passphrase: string): Promise<NostrAccountActionResult> => {
    if (!identity || identity.source !== "local") {
      const message = "No local key is available to protect.";
      setError(message);
      return { ok: false, reason: "error", error: message };
    }

    if (localKeyProtection === "encrypted") {
      return {
        ok: true,
        reason: "success",
        message: "Local key is already protected.",
      };
    }

    try {
      const result = await protectStoredLocalKeyWithPassphrase(passphrase);
      setIdentity(result.identity);
      setName(result.name);
      setError(null);
      setIsLocalKeyLocked(false);
      setLocalKeyProtection("encrypted");
      setProfileStatus("idle");
      setProfileMessage("Local key now requires a passphrase after browser restart.");
      return {
        ok: true,
        reason: "success",
        message: "Local key is now encrypted at rest.",
      };
    } catch (caughtError) {
      const message = caughtError instanceof Error
        ? caughtError.message
        : "Could not protect local key with passphrase.";
      setError(message);
      setProfileStatus("failed");
      setProfileMessage("Could not enable passphrase protection.");
      return {
        ok: false,
        reason: "error",
        error: message,
      };
    }
  }, [identity, localKeyProtection]);

  const updateLocalAccountName = useCallback(async (nextName: string): Promise<NostrAccountActionResult> => {
    if (!identity) {
      const message = "No connected identity available.";
      setError(message);
      return { ok: false, reason: "error", error: message };
    }

    try {
      const normalizedNextName = normalizeNostrProfileName(nextName);
      const currentName = normalizeNostrProfileName(nameRef.current);
      if (normalizedNextName === currentName) {
        if (identity.source === "local") {
          updateSessionAccountName(nextName);
        }

        setName(normalizedNextName);
        setProfileStatus("up_to_date");
        setProfileMessage("Name already synced on Nostr relays.");
        setError(null);
        return {
          ok: true,
          reason: "success",
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
      setProfileStatus("failed");
      setProfileMessage("Could not update profile name.");
      return { ok: false, reason: "error", error: message };
    }
  }, [identity, publishProfileName]);

  const refreshProfileFromRelays = useCallback(async (): Promise<NostrAccountActionResult> => {
    if (!identity) {
      const message = "No connected identity available.";
      setError(message);
      return { ok: false, reason: "error", error: message };
    }

    return syncProfileFromRelays(identity);
  }, [identity, syncProfileFromRelays]);

  const backupGameDataToRelays = useCallback(async (): Promise<NostrAccountActionResult> => {
    if (!identity) {
      const message = "No connected identity available.";
      setError(message);
      return { ok: false, reason: "error", error: message };
    }

    const payload = await loadSavedGamePayloadFromBrowser();
    if (!payload) {
      const message = "No local game data to back up yet.";
      setBackupStatus("up_to_date");
      setBackupMessage(message);
      return { ok: false, reason: "no_data", error: message, message };
    }

    setBackupStatus("syncing");
    setBackupMessage("Backing up encrypted game data to Nostr relays...");

    try {
      const result = await publishNostrAppDataIfChanged(identity, payload);
      const relaySummaryText = result.relaySummary
        ? `${result.relaySummary.successfulRelays}/${result.relaySummary.attemptedRelays} relays reached`
        : null;
      const message = result.published
        ? `Encrypted backup synced using ${result.encryption}${relaySummaryText ? ` (${relaySummaryText})` : ""}.`
        : "Encrypted backup already up to date on relays.";

      if (result.updatedAt) {
        setLastBackupAt(result.updatedAt);
      }
      setLastBackupEncryption(result.encryption);
      setLastBackupRelaySummary(result.relaySummary);
      setBackupStatus(result.published ? "synced" : "up_to_date");
      setBackupMessage(message);
      setError(null);

      return {
        ok: true,
        reason: "success",
        message,
        encryption: result.encryption,
        relaySummary: result.relaySummary,
        updatedAt: result.updatedAt,
      };
    } catch (caughtError) {
      const message = caughtError instanceof Error
        ? caughtError.message
        : "Could not back up encrypted game data to relays.";
      setBackupStatus("failed");
      setBackupMessage("Encrypted game backup failed.");
      setError(message);
      return { ok: false, reason: "error", error: message };
    }
  }, [identity]);

  const restoreGameDataFromRelays = useCallback(async (): Promise<NostrAccountActionResult> => {
    if (!identity) {
      const message = "No connected identity available.";
      setError(message);
      return { ok: false, reason: "error", error: message };
    }

    setRestoreStatus("syncing");
    setRestoreMessage("Restoring encrypted game data from Nostr relays...");

    try {
      const appData = await fetchLatestNostrAppData(identity);
      if (!appData.payload) {
        const message = NOSTR_NO_BACKUP_FOUND_MESSAGE;
        setRestoreStatus("up_to_date");
        setRestoreMessage(message);
        return { ok: false, reason: "no_backup", error: message, message };
      }

      if (!await saveSavedGamePayloadToBrowser(appData.payload)) {
        throw new Error("Could not restore backup into browser storage.");
      }

      const restoredAt = new Date().toISOString();
      const message = appData.updatedAt
        ? `Encrypted backup (${appData.encryption ?? "unknown"}) restored from ${new Date(appData.updatedAt).toLocaleString()}.`
        : "Encrypted backup restored from relays.";
      if (appData.updatedAt) {
        setLastBackupAt(appData.updatedAt);
      }
      setLastRestoreAt(restoredAt);
      setLastRestoreEncryption(appData.encryption);
      setRestoreStatus("synced");
      setRestoreMessage(message);
      setError(null);
      setRestoreRevision((current) => current + 1);
      emitNostrRestoreCompletedEvent(restoredAt);

      return {
        ok: true,
        reason: "success",
        message,
        encryption: appData.encryption,
        updatedAt: appData.updatedAt,
      };
    } catch (caughtError) {
      const message = caughtError instanceof Error
        ? caughtError.message
        : "Could not restore encrypted game data from relays.";
      setRestoreStatus("failed");
      setRestoreMessage("Encrypted game restore failed.");
      setError(message);
      return { ok: false, reason: "error", error: message };
    }
  }, [identity]);

  const logout = useCallback(() => {
    clearNostrSession();
    setIdentity(null);
    setName(null);
    setError(null);
    setIsLocalKeyLocked(false);
    setLocalKeyProtection("none");
    resetActionChannels();
    resetBackupRestoreMetadata();
  }, [resetActionChannels, resetBackupRestoreMetadata]);

  const getExportableNsec = useCallback(() => getSessionLocalNsec(), []);

  const contextValue = useMemo(
    () => ({
      status,
      identity,
      name,
      error,
      isLocalKeyLocked,
      localKeyProtection,
      profileStatus,
      profileMessage,
      backupStatus,
      backupMessage,
      restoreStatus,
      restoreMessage,
      lastBackupAt,
      lastRestoreAt,
      lastBackupEncryption,
      lastRestoreEncryption,
      lastBackupRelaySummary,
      restoreRevision,
      hasNip07,
      connectNip07,
      importNsec,
      createLocalAccount,
      unlockLocalAccount,
      protectLocalKeyWithPassphrase,
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
      isLocalKeyLocked,
      localKeyProtection,
      profileStatus,
      profileMessage,
      backupStatus,
      backupMessage,
      restoreStatus,
      restoreMessage,
      lastBackupAt,
      lastRestoreAt,
      lastBackupEncryption,
      lastRestoreEncryption,
      lastBackupRelaySummary,
      restoreRevision,
      hasNip07,
      connectNip07,
      importNsec,
      createLocalAccount,
      unlockLocalAccount,
      protectLocalKeyWithPassphrase,
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
