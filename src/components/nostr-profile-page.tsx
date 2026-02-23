"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNostrAccount } from "@/lib/nostr";
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
    profileSyncStatus,
    profileSyncMessage,
    lastBackupAt,
    lastRestoreAt,
    hasNip07,
    connectNip07,
    importNsec,
    createLocalAccount,
    unlockLocalAccount,
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
  const [editableAccountName, setEditableAccountName] = useState("");
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [showSecretKey, setShowSecretKey] = useState(false);
  const [activeAuthAction, setActiveAuthAction] = useState<"none" | "connect" | "import" | "create" | "unlock">("none");
  const [isBackupActionRunning, setIsBackupActionRunning] = useState(false);

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

  const nextPath = useMemo(() => sanitizeNextPath(searchParams.get("next")), [searchParams]);
  const exportableNsec = useMemo(
    () => (identity?.source === "local" ? getExportableNsec() : null),
    [getExportableNsec, identity],
  );
  const profileSyncStatusText = useMemo(() => {
    if (profileSyncStatus === "idle") {
      return profileSyncMessage;
    }

    if (profileSyncStatus === "syncing") {
      return profileSyncMessage ?? "Syncing profile with relays...";
    }

    if (profileSyncStatus === "synced") {
      return profileSyncMessage ?? "Profile synced to relays.";
    }

    if (profileSyncStatus === "up_to_date") {
      return profileSyncMessage ?? "Profile is up to date.";
    }

    return profileSyncMessage ?? "Profile sync failed.";
  }, [profileSyncMessage, profileSyncStatus]);
  const localKeyProtectionText = useMemo(() => {
    if (localKeyProtection === "encrypted") {
      return "Encrypted in local storage";
    }

    if (localKeyProtection === "unencrypted") {
      return "Unencrypted in local storage";
    }

    return "Managed by extension";
  }, [localKeyProtection]);

  useEffect(() => {
    setShowSecretKey(false);
  }, [identity?.source]);

  useEffect(() => {
    setEditableAccountName(name ?? "");
  }, [identity?.pubkey, identity?.source, name]);

  const completeAuth = useCallback((message: string) => {
    setActionMessage(message);
    router.replace(nextPath);
  }, [nextPath, router]);

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
      setActionMessage(result.message ?? "Local key unlocked.");
    } finally {
      setActiveAuthAction("none");
    }
  }, [unlockLocalAccount, unlockPassphrase]);

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

  const handleSaveAccountName = useCallback(async () => {
    const result = await updateLocalAccountName(editableAccountName);
    if (!result.ok) {
      setActionMessage(result.error ?? "Could not update name.");
      return;
    }

    setActionMessage(
      result.message
      ?? (editableAccountName.trim().length > 0 ? "Name updated." : "Name cleared."),
    );
  }, [editableAccountName, updateLocalAccountName]);

  const handleBackupGameData = useCallback(async () => {
    setIsBackupActionRunning(true);
    try {
      const result = await backupGameDataToRelays();
      if (!result.ok) {
        setActionMessage(result.error ?? "Could not back up encrypted game data.");
        return;
      }

      setActionMessage(result.message ?? "Encrypted game backup completed.");
    } finally {
      setIsBackupActionRunning(false);
    }
  }, [backupGameDataToRelays]);

  const handleRestoreGameData = useCallback(async () => {
    setIsBackupActionRunning(true);
    try {
      const result = await restoreGameDataFromRelays();
      if (!result.ok) {
        setActionMessage(result.error ?? "Could not restore encrypted game data.");
        return;
      }

      setActionMessage(result.message ?? "Encrypted game backup restored.");
    } finally {
      setIsBackupActionRunning(false);
    }
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

  return (
    <main className="app app-panel" aria-label="Nostr profile settings">
      <section className="panel-view profile-view">
        <div className="settings-header">
          <h2>Profile</h2>
          <button id="profile-close" type="button" onClick={() => router.replace("/")}>Home</button>
        </div>

        <section className="profile-card" aria-label="Nostr profile basics">
          <h2>Nostr Profile</h2>
          <p className="profile-helper">Use an extension, import an nsec, or create a local key.</p>
        </section>

        {status === "loading" ? (
          <p className="profile-status" aria-live="polite">Restoring account session...</p>
        ) : null}

        {identity ? (
          <section className="profile-card" aria-label="Current profile">
            <h2>Current Profile</h2>
            <div className="profile-meta">
              <p className="profile-meta-row">
                <span className="profile-meta-label">Source</span>
                <strong>{identity.source === "nip07" ? "NIP-07 extension" : "Local key"}</strong>
              </p>
              {identity.source === "local" ? (
                <p className="profile-meta-row">
                  <span className="profile-meta-label">Stored key</span>
                  <strong>{localKeyProtectionText}</strong>
                </p>
              ) : null}
              <p className="profile-meta-row">
                <span className="profile-meta-label">Name</span>
                <strong>{name ?? "Not set"}</strong>
              </p>
              <p className="profile-meta-row">
                <span className="profile-meta-label">Npub</span>
                <span className="profile-mono">{identity.npub}</span>
              </p>
            </div>

            <label htmlFor="profile-current-name-input">Display Name</label>
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
                disabled={profileSyncStatus === "syncing" || activeAuthAction !== "none"}
                onClick={() => { void handleSaveAccountName(); }}
              >
                {profileSyncStatus === "syncing" ? "Saving..." : "Save Name"}
              </button>
              <button
                type="button"
                disabled={profileSyncStatus === "syncing" || activeAuthAction !== "none"}
                onClick={() => {
                  setEditableAccountName(name ?? "");
                }}
              >
                Reset
              </button>
            </div>

            <div className="profile-actions">
              <button
                type="button"
                disabled={profileSyncStatus === "syncing" || activeAuthAction !== "none"}
                onClick={() => { void handleRefreshProfile(); }}
              >
                {profileSyncStatus === "syncing" ? "Refreshing..." : "Refresh from Relays"}
              </button>
              <button type="button" onClick={logout}>
                Log Out
              </button>
            </div>

            {profileSyncStatusText ? (
              <p className="profile-status" aria-live="polite">{profileSyncStatusText}</p>
            ) : null}

            {identity.source === "local" ? (
              <>
                {localKeyProtection === "encrypted" ? (
                  <p className="profile-secret-warning">
                    Your local key is encrypted at rest. Keep your passphrase safe.
                  </p>
                ) : (
                  <p className="profile-secret-warning profile-warning">
                    Your local key is stored unencrypted in local storage on this device.
                  </p>
                )}
                <p className="profile-secret-warning">
                  Back up your nsec now. Anyone with this key can control your profile.
                </p>
                {showSecretKey && exportableNsec ? (
                  <p className="profile-mono profile-secret-key">{exportableNsec}</p>
                ) : null}
                <div className="profile-actions">
                  <button
                    type="button"
                    disabled={activeAuthAction !== "none"}
                    onClick={() => {
                      setShowSecretKey((current) => !current);
                    }}
                  >
                    {showSecretKey ? "Hide Secret Key" : "Reveal Secret Key"}
                  </button>
                  <button type="button" disabled={activeAuthAction !== "none"} onClick={() => { void handleCopyNsec(); }}>
                    Copy Secret Key
                  </button>
                  <button type="button" disabled={activeAuthAction !== "none"} onClick={handleDownloadNsec}>
                    Download Secret Key
                  </button>
                </div>
              </>
            ) : (
              <p className="profile-secret-warning">Secret key access is managed by your NIP-07 extension.</p>
            )}
          </section>
        ) : (
          <>
            {isLocalKeyLocked ? (
              <section className="profile-card" aria-label="Unlock encrypted local key">
                <h2>Unlock Local Key</h2>
                <p className="profile-helper">
                  Enter your passphrase to unlock the encrypted local key stored on this device.
                </p>
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
                    disabled={status === "loading" || activeAuthAction !== "none" || unlockPassphrase.trim().length === 0}
                    onClick={() => { void handleUnlockLocalAccount(); }}
                  >
                    {activeAuthAction === "unlock" ? "Unlocking..." : "Unlock Key"}
                  </button>
                  <button type="button" disabled={activeAuthAction !== "none"} onClick={logout}>
                    Clear Saved Key
                  </button>
                </div>
                <p className="profile-helper">
                  Forgot your passphrase? Clear the saved key and import or create a new one.
                </p>
              </section>
            ) : null}

            <section className="profile-card" aria-label="Connect with NIP-07">
              <h2>Connect with Extension</h2>
              <p className="profile-helper">Use your browser Nostr extension account.</p>
              <button
                type="button"
                disabled={!hasNip07 || status === "loading" || activeAuthAction !== "none"}
                onClick={() => { void handleNip07Connect(); }}
              >
                {activeAuthAction === "connect"
                  ? "Connecting..."
                  : hasNip07
                    ? "Connect with Extension"
                    : "Extension Not Detected"}
              </button>
            </section>

            <section className="profile-card" aria-label="Import nsec">
              <h2>Import nsec</h2>
              <p className="profile-helper">Import a private key and save it in local storage on this device.</p>
              <label htmlFor="profile-nsec-input">Nsec key</label>
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
              <label htmlFor="profile-import-passphrase-input">Optional passphrase</label>
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
              <p className="profile-helper profile-warning">
                Leave passphrase empty to store your key unencrypted in local storage.
              </p>
              <button
                type="button"
                disabled={status === "loading" || activeAuthAction !== "none" || nsecInput.trim().length === 0}
                onClick={() => { void handleImportNsec(); }}
              >
                {activeAuthAction === "import" ? "Importing..." : "Import Local Key"}
              </button>
            </section>

            <section className="profile-card" aria-label="Generate local key">
              <h2>Create Local Key</h2>
              <p className="profile-helper">Create a new key pair and store it in local storage on this device.</p>
              <label htmlFor="profile-name-input">Name</label>
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
              <label htmlFor="profile-create-passphrase-input">Optional passphrase</label>
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
              <p className="profile-helper profile-warning">
                Leave passphrase empty to store your key unencrypted in local storage.
              </p>
              <button
                type="button"
                disabled={status === "loading" || activeAuthAction !== "none"}
                onClick={() => { void handleCreateAccount(); }}
              >
                {activeAuthAction === "create" ? "Creating..." : "Generate Local Key"}
              </button>
            </section>
          </>
        )}

        <section className="profile-card" aria-label="Encrypted game backup">
          <h2>Game Backup</h2>
          <p className="profile-helper">
            Back up your current game, settings, and stats as encrypted app data on Nostr relays.
          </p>
          <div className="profile-actions">
            <button
              type="button"
              disabled={isBackupActionRunning || profileSyncStatus === "syncing"}
              onClick={() => { void handleBackupGameData(); }}
            >
              {isBackupActionRunning ? "Working..." : "Backup to Nostr"}
            </button>
            <button
              type="button"
              disabled={isBackupActionRunning || profileSyncStatus === "syncing"}
              onClick={() => { void handleRestoreGameData(); }}
            >
              {isBackupActionRunning ? "Working..." : "Restore from Nostr"}
            </button>
          </div>
          <p className="profile-helper">Last backup: {formatTimestamp(lastBackupAt)}</p>
          <p className="profile-helper">Last restore: {formatTimestamp(lastRestoreAt)}</p>
        </section>

        <section className="profile-card" aria-label="About Nostr in this app">
          <h2>About Nostr</h2>
          <ul className="profile-info-list">
            <li><strong>npub</strong> is your public profile key and can be shared.</li>
            <li><strong>nsec</strong> is your private key and must stay secret.</li>
            <li>This app is local-first and only contacts relays on explicit profile actions.</li>
            <li>Relay actions include importing an nsec, saving a name, backup, restore, and manual refresh.</li>
          </ul>
        </section>

        {error ? <p className="profile-error">{error}</p> : null}
        {actionMessage ? <p className="profile-status">{actionMessage}</p> : null}
      </section>
    </main>
  );
}
