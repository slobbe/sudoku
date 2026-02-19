"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { useNostrAccount } from "@/lib/nostr";

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
    error,
    hasNip07,
    connectNip07,
    importNsec,
    createLocalAccount,
    logout,
  } = useNostrAccount();

  const [nsecInput, setNsecInput] = useState("");
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const nextPath = useMemo(() => sanitizeNextPath(searchParams.get("next")), [searchParams]);

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
    const result = await createLocalAccount();
    if (!result.ok) {
      setActionMessage(result.error ?? "Could not create local session account.");
      return;
    }

    completeAuth("Created local session key.");
  }, [completeAuth, createLocalAccount]);

  return (
    <main className="app app-panel" aria-label="Nostr identity settings">
      <section className="panel-view identity-view">
        <header className="identity-header">
          <h1 className="view-title">Identity</h1>
          <Link href="/" className="identity-home-link">Home</Link>
        </header>

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
            <p>
              Npub:
              {" "}
              <span className="identity-mono">{identity.npub}</span>
            </p>
            <div className="identity-actions">
              <button type="button" onClick={() => router.replace(nextPath)}>
                Continue
              </button>
              <button type="button" onClick={logout}>
                Log Out
              </button>
            </div>
          </section>
        ) : null}

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
          <button type="button" disabled={status === "loading"} onClick={() => { void handleCreateAccount(); }}>
            Generate Session Key
          </button>
        </section>

        {error ? <p className="identity-error">{error}</p> : null}
        {actionMessage ? <p className="identity-status">{actionMessage}</p> : null}
      </section>
    </main>
  );
}
