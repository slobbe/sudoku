"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Pencil } from "lucide-react";
import { AccountSidebar } from "@/components/account-sidebar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useNostrAccount } from "@/lib/nostr";
import {
  buildNostrTroubleshootingHint,
  formatNostrActionStatusText,
  isNostrNoBackupState,
} from "@/lib/nostr/status-copy";
import { applyThemeToDocument, readThemeFromSavedGame } from "@/lib/theme";

function sanitizeNextPath(nextPath: string | null): string {
  if (!nextPath || !nextPath.startsWith("/") || nextPath.startsWith("//")) {
    return "/";
  }

  return nextPath;
}

function formatTimestamp(value: string | null): string {
  if (!value) {
    return "Never";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return date.toLocaleString();
}

function formatEncryptionLabel(encryption: "nip44" | "nip04" | null): string {
  if (!encryption) {
    return "Unknown";
  }

  return encryption.toUpperCase();
}

export function NostrProfilePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
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
  } = useNostrAccount();

  const [nsecInput, setNsecInput] = useState("");
  const [importPassphrase, setImportPassphrase] = useState("");
  const [newAccountName, setNewAccountName] = useState("");
  const [newAccountPassphrase, setNewAccountPassphrase] = useState("");
  const [unlockPassphrase, setUnlockPassphrase] = useState("");
  const [protectPassphrase, setProtectPassphrase] = useState("");
  const [editableAccountName, setEditableAccountName] = useState("");
  const [isEditingName, setIsEditingName] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [showSecretKey, setShowSecretKey] = useState(false);
  const [isRestoreConfirmOpen, setIsRestoreConfirmOpen] = useState(false);
  const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false);
  const [showLocalAuthTools, setShowLocalAuthTools] = useState(false);
  const [localKeyTab, setLocalKeyTab] = useState<"import" | "generate">("import");
  const [activeAuthAction, setActiveAuthAction] = useState<
    "none" | "connect" | "import" | "create" | "unlock" | "protect"
  >("none");

  useEffect(() => {
    let isCancelled = false;

    void readThemeFromSavedGame().then((savedTheme) => {
      if (isCancelled) {
        return;
      }

      applyThemeToDocument(savedTheme);
    });

    return () => {
      isCancelled = true;
    };
  }, []);

  const rawNextPath = searchParams.get("next");
  const nextPath = useMemo(() => sanitizeNextPath(rawNextPath), [rawNextPath]);
  const hasRequestedNextPath = useMemo(
    () => Boolean(rawNextPath && rawNextPath.startsWith("/") && !rawNextPath.startsWith("//")),
    [rawNextPath],
  );
  const exportableNsec = useMemo(
    () => (identity?.source === "local" ? getExportableNsec() : null),
    [getExportableNsec, identity],
  );
  const profileStatusText = useMemo(
    () => formatNostrActionStatusText(profileStatus, profileMessage, {
      syncing: "Syncing profile with relays...",
      synced: "Profile synced to relays.",
      upToDate: "Profile is up to date.",
      failed: "Profile sync failed.",
    }),
    [profileMessage, profileStatus],
  );
  const backupStatusText = useMemo(
    () => formatNostrActionStatusText(backupStatus, backupMessage, {
      syncing: "Backing up encrypted game data to relays...",
      synced: "Encrypted backup synced.",
      upToDate: "Encrypted backup is already up to date.",
      failed: "Encrypted backup failed.",
    }),
    [backupMessage, backupStatus],
  );
  const restoreStatusText = useMemo(
    () => formatNostrActionStatusText(restoreStatus, restoreMessage, {
      syncing: "Restoring encrypted game data from relays...",
      synced: "Encrypted backup restored.",
      upToDate: "No new restore updates.",
      failed: "Encrypted restore failed.",
    }),
    [restoreMessage, restoreStatus],
  );

  const isBackupRestoreBusy = backupStatus === "syncing" || restoreStatus === "syncing";
  const isProfileFailure = profileStatus === "failed";
  const isBackupFailure = backupStatus === "failed";
  const isRestoreFailure = restoreStatus === "failed";
  const hasNoBackupOnRelays = isNostrNoBackupState(restoreStatus, restoreMessage);
  const shouldShowRecoveryOptions = Boolean(error)
    || isProfileFailure
    || isBackupFailure
    || isRestoreFailure
    || hasNoBackupOnRelays;
  const shouldShowReconnectExtension = identity?.source === "nip07"
    && (isProfileFailure || isBackupFailure || isRestoreFailure);

  const profileDisplayName = useMemo(() => {
    const trimmed = name?.trim() ?? "";
    return trimmed.length > 0 ? trimmed : "Sudoku Player";
  }, [name]);
  const profileInitial = profileDisplayName.slice(0, 1).toUpperCase();
  const hasPendingNameChange = useMemo(
    () => editableAccountName.trim() !== (name ?? "").trim(),
    [editableAccountName, name],
  );

  const troubleshootingHint = useMemo(() => buildNostrTroubleshootingHint({
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
    formatTimestamp,
    formatEncryptionLabel,
  }), [
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
  ]);

  useEffect(() => {
    setShowSecretKey(false);
  }, [identity?.source]);

  useEffect(() => {
    setEditableAccountName(name ?? "");
    setIsEditingName(false);
  }, [identity?.pubkey, identity?.source, name]);

  useEffect(() => {
    if (restoreRevision > 0) {
      setIsRestoreConfirmOpen(false);
    }
  }, [restoreRevision]);

  useEffect(() => {
    if (status !== "ready" || identity) {
      return;
    }

    if (isLocalKeyLocked || hasRequestedNextPath) {
      setIsAuthDialogOpen(true);
    }
  }, [hasRequestedNextPath, identity, isLocalKeyLocked, status]);

  useEffect(() => {
    if (identity) {
      setIsAuthDialogOpen(false);
    }
  }, [identity]);

  useEffect(() => {
    if (!isAuthDialogOpen) {
      setShowLocalAuthTools(false);
      return;
    }

    setShowLocalAuthTools(false);
  }, [isAuthDialogOpen, isLocalKeyLocked]);

  const completeAuth = useCallback((message: string) => {
    setActionMessage(message);
    setIsAuthDialogOpen(false);
    if (hasRequestedNextPath && nextPath !== "/profile") {
      router.replace(nextPath);
    }
  }, [hasRequestedNextPath, nextPath, router]);

  const handleNip07Connect = useCallback(async () => {
    setActiveAuthAction("connect");
    try {
      const result = await connectNip07();
      if (!result.ok) {
        setActionMessage(result.error ?? "Could not connect NIP-07 account.");
        return;
      }

      completeAuth("Connected with NIP-07 extension.");
    } finally {
      setActiveAuthAction("none");
    }
  }, [completeAuth, connectNip07]);

  const handleReconnectExtension = useCallback(async () => {
    setActiveAuthAction("connect");
    try {
      const result = await connectNip07();
      if (!result.ok) {
        setActionMessage(result.error ?? "Could not reconnect NIP-07 extension.");
        return;
      }

      setActionMessage("Reconnected NIP-07 extension.");
    } finally {
      setActiveAuthAction("none");
    }
  }, [connectNip07]);

  const handleImportNsec = useCallback(async () => {
    setActiveAuthAction("import");
    try {
      const result = await importNsec(nsecInput, importPassphrase);
      if (!result.ok) {
        setActionMessage(result.error ?? "Could not import nsec.");
        return;
      }

      setNsecInput("");
      setImportPassphrase("");
      completeAuth("Imported local key.");
    } finally {
      setActiveAuthAction("none");
    }
  }, [completeAuth, importNsec, importPassphrase, nsecInput]);

  const handleCreateAccount = useCallback(async () => {
    setActiveAuthAction("create");
    try {
      const result = await createLocalAccount(newAccountName, newAccountPassphrase);
      if (!result.ok) {
        setActionMessage(result.error ?? "Could not create local account.");
        return;
      }

      setNewAccountName("");
      setNewAccountPassphrase("");
      completeAuth("Created local key.");
    } finally {
      setActiveAuthAction("none");
    }
  }, [completeAuth, createLocalAccount, newAccountName, newAccountPassphrase]);

  const handleUnlockLocalAccount = useCallback(async () => {
    setActiveAuthAction("unlock");
    try {
      const result = await unlockLocalAccount(unlockPassphrase);
      if (!result.ok) {
        setActionMessage(result.error ?? "Could not unlock local key.");
        return;
      }

      setUnlockPassphrase("");
      completeAuth(result.message ?? "Local key unlocked.");
    } finally {
      setActiveAuthAction("none");
    }
  }, [completeAuth, unlockLocalAccount, unlockPassphrase]);

  const handleProtectLocalKey = useCallback(async () => {
    setActiveAuthAction("protect");
    try {
      const result = await protectLocalKeyWithPassphrase(protectPassphrase);
      if (!result.ok) {
        setActionMessage(result.error ?? "Could not enable passphrase protection.");
        return;
      }

      setProtectPassphrase("");
      setActionMessage(result.message ?? "Local key is now encrypted at rest.");
    } finally {
      setActiveAuthAction("none");
    }
  }, [protectLocalKeyWithPassphrase, protectPassphrase]);

  const handleRefreshProfile = useCallback(async () => {
    const result = await refreshProfileFromRelays();
    if (!result.ok) {
      setActionMessage(result.error ?? "Could not refresh profile from relays.");
      return;
    }

    if (result.message) {
      setActionMessage(result.message);
    }
  }, [refreshProfileFromRelays]);

  const handleSaveAccountName = useCallback(async (): Promise<boolean> => {
    const result = await updateLocalAccountName(editableAccountName);
    if (!result.ok) {
      setActionMessage(result.error ?? "Could not update name.");
      return false;
    }

    setActionMessage(result.message ?? (editableAccountName.trim().length > 0 ? "Name updated." : "Name cleared."));
    return true;
  }, [editableAccountName, updateLocalAccountName]);

  const handleBackupGameData = useCallback(async () => {
    const result = await backupGameDataToRelays();
    if (!result.ok) {
      setActionMessage(result.message ?? result.error ?? "Could not back up encrypted game data.");
      return;
    }

    setActionMessage(result.message ?? "Encrypted game backup completed.");
  }, [backupGameDataToRelays]);

  const handleConfirmRestoreGameData = useCallback(async () => {
    const result = await restoreGameDataFromRelays();
    if (!result.ok) {
      setActionMessage(result.message ?? result.error ?? "Could not restore encrypted game data.");
      return;
    }

    setActionMessage(result.message ?? "Encrypted game backup restored.");
  }, [restoreGameDataFromRelays]);

  const handleCopyNsec = useCallback(async () => {
    if (!exportableNsec) {
      setActionMessage("No local nsec available to copy.");
      return;
    }

    try {
      await navigator.clipboard.writeText(exportableNsec);
      setActionMessage("Secret key copied. Store it somewhere safe.");
    } catch {
      setActionMessage("Could not copy secret key. Copy it manually.");
    }
  }, [exportableNsec]);

  const handleDownloadNsec = useCallback(() => {
    if (!exportableNsec) {
      setActionMessage("No local nsec available to download.");
      return;
    }

    try {
      const blob = new Blob([`${exportableNsec}\n`], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "sudoku-nostr-nsec.txt";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setActionMessage("Secret key downloaded. Keep it private.");
    } catch {
      setActionMessage("Could not download secret key.");
    }
  }, [exportableNsec]);

  const handleCopyTroubleshootingHint = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(troubleshootingHint);
      setActionMessage("Troubleshooting hint copied.");
    } catch {
      setActionMessage("Could not copy troubleshooting hint. Copy details manually from this page.");
    }
  }, [troubleshootingHint]);

  const showBusyUi = activeAuthAction !== "none" || isBackupRestoreBusy;

  return (
    <main className="app app-panel" aria-label="Nostr profile settings">
      <div className="account-layout">
        <AccountSidebar />

        <section className="panel-view profile-view account-content">
          <div className="settings-header">
            <h2>Profile</h2>
            {identity ? (
              <button type="button" disabled={showBusyUi} onClick={logout}>
                Log Out
              </button>
            ) : null}
          </div>

          {status === "loading" ? (
            <p className="profile-status" aria-live="polite">Restoring account session...</p>
          ) : null}

          {error ? <p className="profile-error">{error}</p> : null}
          {actionMessage ? <p className="profile-status">{actionMessage}</p> : null}

          {identity ? (
            <>
              <section className="profile-card profile-hero-card" aria-label="Profile overview">
                <div className="profile-hero">
                  <div className="profile-avatar" aria-hidden="true">{profileInitial}</div>
                  <div className="profile-identity">
                    <p className="profile-meta-label">
                      {identity.source === "nip07" ? "Connected with browser extension" : "Connected with local key"}
                    </p>

                    {isEditingName ? (
                      <div className="profile-name-editor">
                        <input
                          id="profile-current-name-input"
                          type="text"
                          value={editableAccountName}
                          onChange={(event) => {
                            setEditableAccountName(event.target.value);
                          }}
                          placeholder="sudoku-player"
                          autoComplete="nickname"
                          spellCheck={false}
                          maxLength={64}
                        />
                        <div className="profile-actions">
                          <button
                            type="button"
                            disabled={profileStatus === "syncing" || showBusyUi || !hasPendingNameChange}
                            onClick={() => {
                              void (async () => {
                                const saved = await handleSaveAccountName();
                                if (saved) {
                                  setIsEditingName(false);
                                }
                              })();
                            }}
                          >
                            {profileStatus === "syncing" ? "Saving..." : "Save"}
                          </button>
                          <button
                            type="button"
                            disabled={profileStatus === "syncing" || showBusyUi}
                            onClick={() => {
                              setEditableAccountName(name ?? "");
                              setIsEditingName(false);
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="profile-name-row">
                        <h2 className="profile-display-name">{profileDisplayName}</h2>
                        <button
                          type="button"
                          className="profile-name-edit-button"
                          aria-label="Edit display name"
                          title="Edit display name"
                          disabled={profileStatus === "syncing" || showBusyUi}
                          onClick={() => {
                            setEditableAccountName(name ?? "");
                            setIsEditingName(true);
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                          <span className="sr-only">Edit display name</span>
                        </button>
                      </div>
                    )}

                    <p className="profile-npub-row">
                      <span className="profile-mono">{identity.npub}</span>
                    </p>
                  </div>
                </div>

                {profileStatusText ? (
                  <p className="profile-status" aria-live="polite">{profileStatusText}</p>
                ) : null}
              </section>

              <section className="profile-card" aria-label="Game backup">
                <h2>Game Backup</h2>
                <p className="profile-helper">
                  Save game progress, settings, and stats as encrypted app data on relays.
                </p>

                <div className="profile-actions">
                  <button
                    type="button"
                    disabled={showBusyUi}
                    onClick={() => {
                      void handleBackupGameData();
                    }}
                  >
                    {backupStatus === "syncing" ? "Backing Up..." : "Back Up"}
                  </button>
                  <button
                    type="button"
                    disabled={showBusyUi}
                    onClick={() => {
                      setIsRestoreConfirmOpen(true);
                    }}
                  >
                    {restoreStatus === "syncing" ? "Restoring..." : "Restore"}
                  </button>
                </div>

                {isRestoreConfirmOpen ? (
                  <div className="profile-restore-confirm" role="group" aria-label="Confirm restore from Nostr">
                    <p className="profile-warning">Restore replaces your current browser data.</p>
                    <ul className="profile-info-list">
                      <li>Current puzzle progress and notes</li>
                      <li>Settings (difficulty, hints, lives, theme)</li>
                      <li>Statistics and points history</li>
                    </ul>
                    <div className="profile-actions">
                      <button
                        type="button"
                        disabled={isBackupRestoreBusy}
                        onClick={() => {
                          void handleConfirmRestoreGameData();
                        }}
                      >
                        {restoreStatus === "syncing" ? "Restoring..." : "Confirm Restore"}
                      </button>
                      <button
                        type="button"
                        disabled={isBackupRestoreBusy}
                        onClick={() => {
                          setIsRestoreConfirmOpen(false);
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : null}

                <div className="profile-status-stack">
                  {backupStatusText ? <p className="profile-status" aria-live="polite">{backupStatusText}</p> : null}
                  {restoreStatusText ? <p className="profile-status" aria-live="polite">{restoreStatusText}</p> : null}
                </div>

                <details className="profile-disclosure">
                  <summary>Details</summary>
                  <div className="profile-disclosure-content">
                    <p className="profile-helper">Last backup: {formatTimestamp(lastBackupAt)}</p>
                    <p className="profile-helper">Last restore: {formatTimestamp(lastRestoreAt)}</p>
                    <p className="profile-helper">Backup encryption: {formatEncryptionLabel(lastBackupEncryption)}</p>
                    <p className="profile-helper">Restore encryption: {formatEncryptionLabel(lastRestoreEncryption)}</p>
                    <p className="profile-helper">
                      Backup relay reach: {lastBackupRelaySummary
                        ? `${lastBackupRelaySummary.successfulRelays}/${lastBackupRelaySummary.attemptedRelays}`
                        : "Unknown"}
                    </p>
                  </div>
                </details>
              </section>

              <section className="profile-card" aria-label="Advanced tools">
                <details className="profile-disclosure" open={shouldShowRecoveryOptions}>
                  <summary>Advanced</summary>
                  <div className="profile-disclosure-content">
                    <h3>Relay tools</h3>
                    <div className="profile-actions">
                      <button
                        type="button"
                        disabled={profileStatus === "syncing" || showBusyUi}
                        onClick={() => {
                          void handleRefreshProfile();
                        }}
                      >
                        {profileStatus === "syncing" ? "Refreshing..." : "Refresh from Relays"}
                      </button>
                      {shouldShowReconnectExtension ? (
                        <button
                          type="button"
                          disabled={showBusyUi}
                          onClick={() => {
                            void handleReconnectExtension();
                          }}
                        >
                          Reconnect Extension
                        </button>
                      ) : null}
                    </div>

                    {identity.source === "local" ? (
                      <>
                        <h3>Local key controls</h3>
                        {localKeyProtection === "encrypted" ? (
                          <p className="profile-secret-warning">Your local key is encrypted at rest.</p>
                        ) : (
                          <p className="profile-secret-warning profile-warning">Your local key is unencrypted in browser storage.</p>
                        )}

                        {localKeyProtection === "unencrypted" ? (
                          <>
                            <label htmlFor="profile-protect-passphrase-input">Add passphrase protection</label>
                            <input
                              id="profile-protect-passphrase-input"
                              type="password"
                              value={protectPassphrase}
                              onChange={(event) => {
                                setProtectPassphrase(event.target.value);
                              }}
                              placeholder="New passphrase"
                              autoComplete="new-password"
                              spellCheck={false}
                            />
                            <button
                              type="button"
                              disabled={showBusyUi || protectPassphrase.trim().length === 0}
                              onClick={() => {
                                void handleProtectLocalKey();
                              }}
                            >
                              {activeAuthAction === "protect" ? "Protecting..." : "Protect Local Key"}
                            </button>
                          </>
                        ) : null}

                        <p className="profile-secret-warning">Back up your private key now. Anyone with it can control your profile.</p>

                        {showSecretKey && exportableNsec ? (
                          <p className="profile-mono profile-secret-key">{exportableNsec}</p>
                        ) : null}

                        <div className="profile-actions">
                          <button
                            type="button"
                            disabled={showBusyUi}
                            onClick={() => {
                              setShowSecretKey((current) => !current);
                            }}
                          >
                            {showSecretKey ? "Hide Secret Key" : "Reveal Secret Key"}
                          </button>
                          <button
                            type="button"
                            disabled={showBusyUi}
                            onClick={() => {
                              void handleCopyNsec();
                            }}
                          >
                            Copy Secret Key
                          </button>
                          <button type="button" disabled={showBusyUi} onClick={handleDownloadNsec}>
                            Download Secret Key
                          </button>
                        </div>
                      </>
                    ) : null}

                    {shouldShowRecoveryOptions ? (
                      <>
                        <h3>Recovery</h3>
                        <div className="profile-actions">
                          {isBackupFailure || hasNoBackupOnRelays ? (
                            <button
                              type="button"
                              disabled={showBusyUi}
                              onClick={() => {
                                void handleBackupGameData();
                              }}
                            >
                              Retry Backup
                            </button>
                          ) : null}
                          {isRestoreFailure ? (
                            <button
                              type="button"
                              disabled={showBusyUi}
                              onClick={() => {
                                setIsRestoreConfirmOpen(true);
                              }}
                            >
                              Retry Restore
                            </button>
                          ) : null}
                          <button
                            type="button"
                            disabled={showBusyUi}
                            onClick={() => {
                              void handleCopyTroubleshootingHint();
                            }}
                          >
                            Copy Troubleshooting Hint
                          </button>
                        </div>
                      </>
                    ) : null}
                  </div>
                </details>
              </section>
            </>
          ) : (
            <section className="profile-card profile-empty-state" aria-label="Connect identity">
              <h2>{isLocalKeyLocked ? "Unlock identity" : "Connect identity"}</h2>
              <p className="profile-helper">
                Sign in from one modal. Extension login is fastest, and local key tools are available when needed.
              </p>
              <div className="profile-actions">
                <button
                  type="button"
                  disabled={showBusyUi}
                  onClick={() => {
                    setIsAuthDialogOpen(true);
                  }}
                >
                  {isLocalKeyLocked ? "Unlock Identity" : "Connect Identity"}
                </button>
              </div>
              {isLocalKeyLocked ? (
                <p className="profile-helper">A local key is saved and locked on this device.</p>
              ) : null}
            </section>
          )}

          <Dialog open={isAuthDialogOpen && !identity} onOpenChange={setIsAuthDialogOpen}>
            <DialogContent className="profile-auth-dialog" aria-describedby="profile-auth-dialog-description">
              <DialogHeader>
                <DialogTitle>
                  {showLocalAuthTools
                    ? "Connect Identity - Local key"
                    : isLocalKeyLocked
                      ? "Unlock or Connect Identity"
                      : "Connect Identity"}
                </DialogTitle>
                <DialogDescription id="profile-auth-dialog-description">
                  Extension login is recommended. Local key import and creation are available here when needed.
                </DialogDescription>
              </DialogHeader>

              {status === "loading" ? (
                <p className="profile-status" aria-live="polite">Restoring account session...</p>
              ) : null}

              {isLocalKeyLocked ? (
                <section className="profile-auth-section" aria-label="Unlock encrypted local key">
                  <h3>Unlock Local Key</h3>
                  <label htmlFor="profile-unlock-passphrase-input">Passphrase</label>
                  <input
                    id="profile-unlock-passphrase-input"
                    type="password"
                    value={unlockPassphrase}
                    onChange={(event) => {
                      setUnlockPassphrase(event.target.value);
                    }}
                    placeholder="Passphrase"
                    autoComplete="current-password"
                    spellCheck={false}
                  />
                  <div className="profile-actions">
                    <button
                      type="button"
                      disabled={status === "loading" || showBusyUi || unlockPassphrase.trim().length === 0}
                      onClick={() => {
                        void handleUnlockLocalAccount();
                      }}
                    >
                      {activeAuthAction === "unlock" ? "Unlocking..." : "Unlock Key"}
                    </button>
                    <button
                      type="button"
                      disabled={showBusyUi}
                      onClick={() => {
                        setShowLocalAuthTools((current) => {
                          const next = !current;
                          if (next) {
                            setLocalKeyTab("import");
                          }

                          return next;
                        });
                      }}
                    >
                      {showLocalAuthTools ? "Hide Other Methods" : "Use Different Login Method"}
                    </button>
                    <button type="button" disabled={showBusyUi} onClick={logout}>
                      Clear Saved Key
                    </button>
                  </div>
                </section>
              ) : null}

              {!isLocalKeyLocked && !showLocalAuthTools ? (
                <section className="profile-auth-section" aria-label="Quick connect with extension">
                  <h3>Quick Connect</h3>
                  <p className="profile-helper">Use your browser extension to sign in fast.</p>
                  <div className="profile-actions">
                    <button
                      type="button"
                      disabled={!hasNip07 || status === "loading" || showBusyUi}
                      onClick={() => {
                        void handleNip07Connect();
                      }}
                    >
                      {activeAuthAction === "connect"
                        ? "Connecting..."
                        : hasNip07
                          ? "Connect with Extension"
                          : "Extension Not Detected"}
                    </button>
                    <button
                      type="button"
                      disabled={showBusyUi}
                      onClick={() => {
                        setLocalKeyTab("import");
                        setShowLocalAuthTools(true);
                      }}
                    >
                      Use Local Key
                    </button>
                  </div>
                  {!hasNip07 ? (
                    <p className="profile-helper">Install or enable a Nostr extension to use quick connect.</p>
                  ) : null}
                </section>
              ) : null}

              {showLocalAuthTools ? (
                <section className="profile-auth-section" aria-label="Local key tools">
                  <div className="profile-auth-tabs" role="tablist" aria-label="Local key actions">
                    <button
                      type="button"
                      role="tab"
                      id="profile-local-tab-import"
                      aria-controls="profile-local-panel-import"
                      aria-selected={localKeyTab === "import"}
                      className={`profile-auth-tab${localKeyTab === "import" ? " is-active" : ""}`}
                      disabled={showBusyUi}
                      onClick={() => {
                        setLocalKeyTab("import");
                      }}
                    >
                      Import key
                    </button>
                    <button
                      type="button"
                      role="tab"
                      id="profile-local-tab-generate"
                      aria-controls="profile-local-panel-generate"
                      aria-selected={localKeyTab === "generate"}
                      className={`profile-auth-tab${localKeyTab === "generate" ? " is-active" : ""}`}
                      disabled={showBusyUi}
                      onClick={() => {
                        setLocalKeyTab("generate");
                      }}
                    >
                      Generate key
                    </button>
                  </div>

                  {localKeyTab === "import" ? (
                    <div
                      className="profile-auth-tabpanel"
                      role="tabpanel"
                      id="profile-local-panel-import"
                      aria-labelledby="profile-local-tab-import"
                    >
                      <label htmlFor="profile-nsec-input" className="sr-only">Nsec key</label>
                      <input
                        id="profile-nsec-input"
                        type="password"
                        value={nsecInput}
                        onChange={(event) => {
                          setNsecInput(event.target.value);
                        }}
                        placeholder="nsec1..."
                        autoComplete="off"
                        spellCheck={false}
                      />
                      <label htmlFor="profile-import-passphrase-input" className="sr-only">Optional passphrase</label>
                      <input
                        id="profile-import-passphrase-input"
                        type="password"
                        value={importPassphrase}
                        onChange={(event) => {
                          setImportPassphrase(event.target.value);
                        }}
                        placeholder="Passphrase (optional)"
                        autoComplete="new-password"
                        spellCheck={false}
                      />
                      <button
                        type="button"
                        disabled={status === "loading" || showBusyUi || nsecInput.trim().length === 0}
                        onClick={() => {
                          void handleImportNsec();
                        }}
                      >
                        {activeAuthAction === "import" ? "Importing..." : "Import Key"}
                      </button>
                    </div>
                  ) : null}

                  {localKeyTab === "generate" ? (
                    <div
                      className="profile-auth-tabpanel"
                      role="tabpanel"
                      id="profile-local-panel-generate"
                      aria-labelledby="profile-local-tab-generate"
                    >
                      <label htmlFor="profile-name-input" className="sr-only">Name (optional)</label>
                      <input
                        id="profile-name-input"
                        type="text"
                        value={newAccountName}
                        onChange={(event) => {
                          setNewAccountName(event.target.value);
                        }}
                        placeholder="sudoku-player"
                        autoComplete="nickname"
                        spellCheck={false}
                        maxLength={64}
                      />
                      <label htmlFor="profile-create-passphrase-input" className="sr-only">Optional passphrase</label>
                      <input
                        id="profile-create-passphrase-input"
                        type="password"
                        value={newAccountPassphrase}
                        onChange={(event) => {
                          setNewAccountPassphrase(event.target.value);
                        }}
                        placeholder="Passphrase (optional)"
                        autoComplete="new-password"
                        spellCheck={false}
                      />
                      <button
                        type="button"
                        disabled={status === "loading" || showBusyUi}
                        onClick={() => {
                          void handleCreateAccount();
                        }}
                      >
                        {activeAuthAction === "create" ? "Creating..." : "Generate Key"}
                      </button>
                    </div>
                  ) : null}
                </section>
              ) : null}
            </DialogContent>
          </Dialog>
        </section>
      </div>
    </main>
  );
}
