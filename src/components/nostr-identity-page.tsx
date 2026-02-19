"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNostrAccount } from "@/lib/nostr";
import { applyThemeToDocument, readThemeFromSavedGame } from "@/lib/theme";

const SAVE_KEY = "sudoku-pwa-current-game-v1";

function sanitizeNextPath(nextPath: string | null): string {
  if (!nextPath || !nextPath.startsWith("/") || nextPath.startsWith("//")) {
    return "/";
  }

  return nextPath;
}

export function NostrIdentityPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    status,
    identity,
    name,
    error,
    hasNip07,
    connectNip07,
    importNsec,
    createLocalAccount,
    updateLocalAccountName,
    getExportableNsec,
    logout,
  } = useNostrAccount();

  const [nsecInput, setNsecInput] = useState("");
  const [newAccountName, setNewAccountName] = useState("");
  const [editableAccountName, setEditableAccountName] = useState("");
  const [isEditingAccountName, setIsEditingAccountName] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [showSecretKey, setShowSecretKey] = useState(false);

  useEffect(() => {
    const savedTheme = readThemeFromSavedGame(SAVE_KEY);
    applyThemeToDocument(savedTheme);
  }, []);

  const nextPath = useMemo(() => sanitizeNextPath(searchParams.get("next")), [searchParams]);
  const exportableNsec = useMemo(
    () => (identity?.source === "local" ? getExportableNsec() : null),
    [getExportableNsec, identity],
  );

  useEffect(() => {
    setShowSecretKey(false);
  }, [identity?.source]);

  useEffect(() => {
    setEditableAccountName(name ?? "");
    setIsEditingAccountName(!name || name.trim().length === 0);
  }, [name, identity?.source]);

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

  const handleSaveAccountName = useCallback(async () => {
    const result = await updateLocalAccountName(editableAccountName);
    if (!result.ok) {
      setActionMessage(result.error ?? "Could not update name.");
      return;
    }

    setIsEditingAccountName(editableAccountName.trim().length === 0);
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
    <main className="app app-panel" aria-label="Nostr identity settings">
      <section className="panel-view identity-view">
        <div className="settings-header">
          <h2>Identity</h2>
          <button id="identity-close" type="button" onClick={() => router.replace("/")}>Home</button>
        </div>

        {status === "loading" ? (
          <p className="identity-status" aria-live="polite">Restoring account session...</p>
        ) : null}

        {identity ? (
          <section className="identity-card" aria-label="Current identity">
            <h2>Current account</h2>
            <p>
              Source:
              {" "}
              <strong>{identity.source === "nip07" ? "NIP-07 extension" : "Session local key"}</strong>
            </p>
            {name ? (
              <p>
                Name:
                {" "}
                <strong>{name}</strong>
              </p>
            ) : null}
            {identity.source === "local" ? (
              <>
                {name && !isEditingAccountName ? (
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingAccountName(true);
                    }}
                  >
                    Edit Name
                  </button>
                ) : (
                  <>
                    <label htmlFor="identity-current-name-input">Name</label>
                    <input
                      id="identity-current-name-input"
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
                    <div className="identity-actions">
                      <button type="button" onClick={() => { void handleSaveAccountName(); }}>
                        Save Name
                      </button>
                      {name ? (
                        <button
                          type="button"
                          onClick={() => {
                            setEditableAccountName(name);
                            setIsEditingAccountName(false);
                          }}
                        >
                          Cancel
                        </button>
                      ) : null}
                    </div>
                  </>
                )}
              </>
            ) : null}
            <p>
              Npub:
              {" "}
              <span className="identity-mono">{identity.npub}</span>
            </p>
            {identity.source === "local" ? (
              <>
                <p className="identity-secret-warning">
                  Back up your secret key now. Anyone with this key can control your identity.
                </p>
                {showSecretKey && exportableNsec ? (
                  <p className="identity-mono identity-secret-key">{exportableNsec}</p>
                ) : null}
                <div className="identity-actions">
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
              <p className="identity-secret-warning">Secret key is managed by your NIP-07 extension.</p>
            )}
            <div className="identity-actions">
              <button type="button" onClick={logout}>
                Log Out
              </button>
            </div>
          </section>
        ) : (
          <>
            <section className="identity-card" aria-label="Connect with NIP-07">
              <h2>NIP-07 extension</h2>
              <p>Use a browser Nostr extension account if available.</p>
              <button type="button" disabled={!hasNip07 || status === "loading"} onClick={() => { void handleNip07Connect(); }}>
                {hasNip07 ? "Connect with Extension" : "Extension Not Detected"}
              </button>
            </section>

            <section className="identity-card" aria-label="Import nsec">
              <h2>Import nsec</h2>
              <p>Import a private key for this browser session only.</p>
              <label htmlFor="identity-nsec-input">Nsec key</label>
              <input
                id="identity-nsec-input"
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

            <section className="identity-card" aria-label="Generate local session key">
              <h2>Create new key pair</h2>
              <p>Create a new local key pair stored in session only.</p>
              <label htmlFor="identity-name-input">Name</label>
              <input
                id="identity-name-input"
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

        {error ? <p className="identity-error">{error}</p> : null}
        {actionMessage ? <p className="identity-status">{actionMessage}</p> : null}
      </section>
    </main>
  );
}
