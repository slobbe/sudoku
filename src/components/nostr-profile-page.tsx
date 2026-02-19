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

export function NostrProfilePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    status,
    identity,
    name,
    error,
    profileSyncStatus,
    profileSyncMessage,
    hasNip07,
    connectNip07,
    importNsec,
    createLocalAccount,
    updateLocalAccountName,
    refreshProfileFromRelays,
    getExportableNsec,
    logout,
  } = useNostrAccount();

  const [nsecInput, setNsecInput] = useState("");
  const [newAccountName, setNewAccountName] = useState("");
  const [editableAccountName, setEditableAccountName] = useState("");
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [showSecretKey, setShowSecretKey] = useState(false);

  useEffect(() => {
    const savedTheme = readThemeFromSavedGame();
    applyThemeToDocument(savedTheme);
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
    const result = await connectNip07();
    if (!result.ok) {
      setActionMessage(result.error ?? "Could not connect NIP-07 account.");
      return;
    }

    completeAuth("Connected with NIP-07 extension.");
  }, [completeAuth, connectNip07]);

  const handleImportNsec = useCallback(async () => {
    const result = await importNsec(nsecInput);
    if (!result.ok) {
      setActionMessage(result.error ?? "Could not import nsec.");
      return;
    }

    setNsecInput("");
    completeAuth("Imported session key.");
  }, [completeAuth, importNsec, nsecInput]);

  const handleCreateAccount = useCallback(async () => {
    const result = await createLocalAccount(newAccountName);
    if (!result.ok) {
      setActionMessage(result.error ?? "Could not create local session account.");
      return;
    }

    setNewAccountName("");
    completeAuth("Created local session key.");
  }, [completeAuth, createLocalAccount, newAccountName]);

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
          <p className="profile-helper">Use an extension, import an nsec, or create a local session key.</p>
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
                <strong>{identity.source === "nip07" ? "NIP-07 extension" : "Session local key"}</strong>
              </p>
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
                disabled={profileSyncStatus === "syncing"}
                onClick={() => { void handleSaveAccountName(); }}
              >
                {profileSyncStatus === "syncing" ? "Saving..." : "Save Name"}
              </button>
              <button
                type="button"
                disabled={profileSyncStatus === "syncing"}
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
                disabled={profileSyncStatus === "syncing"}
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
                <p className="profile-secret-warning">
                  Back up your nsec now. Anyone with this key can control your profile.
                </p>
                {showSecretKey && exportableNsec ? (
                  <p className="profile-mono profile-secret-key">{exportableNsec}</p>
                ) : null}
                <div className="profile-actions">
                  <button
                    type="button"
                    onClick={() => {
                      setShowSecretKey((current) => !current);
                    }}
                  >
                    {showSecretKey ? "Hide Secret Key" : "Reveal Secret Key"}
                  </button>
                  <button type="button" onClick={() => { void handleCopyNsec(); }}>
                    Copy Secret Key
                  </button>
                  <button type="button" onClick={handleDownloadNsec}>
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
            <section className="profile-card" aria-label="Connect with NIP-07">
              <h2>Connect with Extension</h2>
              <p className="profile-helper">Use your browser Nostr extension account.</p>
              <button type="button" disabled={!hasNip07 || status === "loading"} onClick={() => { void handleNip07Connect(); }}>
                {hasNip07 ? "Connect with Extension" : "Extension Not Detected"}
              </button>
            </section>

            <section className="profile-card" aria-label="Import nsec">
              <h2>Import nsec</h2>
              <p className="profile-helper">Import a private key for this browser session only.</p>
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
              <button type="button" disabled={status === "loading" || nsecInput.trim().length === 0} onClick={() => { void handleImportNsec(); }}>
                Import Session Key
              </button>
            </section>

            <section className="profile-card" aria-label="Generate local session key">
              <h2>Create Local Key</h2>
              <p className="profile-helper">Create a new key pair stored in session only.</p>
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
              <button type="button" disabled={status === "loading"} onClick={() => { void handleCreateAccount(); }}>
                Generate Session Key
              </button>
            </section>
          </>
        )}

        <section className="profile-card" aria-label="About Nostr in this app">
          <h2>About Nostr</h2>
          <ul className="profile-info-list">
            <li><strong>npub</strong> is your public profile key and can be shared.</li>
            <li><strong>nsec</strong> is your private key and must stay secret.</li>
            <li>This app is local/session-first and only contacts relays on explicit profile actions.</li>
            <li>Relay actions include importing an nsec, saving a name, creating a named key, and manual refresh.</li>
          </ul>
        </section>

        {error ? <p className="profile-error">{error}</p> : null}
        {actionMessage ? <p className="profile-status">{actionMessage}</p> : null}
      </section>
    </main>
  );
}
