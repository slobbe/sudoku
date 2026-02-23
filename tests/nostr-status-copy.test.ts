import { describe, expect, it } from "bun:test";
import {
  buildNostrTroubleshootingHint,
  formatNostrActionLabel,
  formatNostrActionStatusText,
  isNostrNoBackupState,
  NOSTR_NO_BACKUP_FOUND_MESSAGE,
} from "../src/lib/nostr/status-copy";

describe("nostr status copy helpers", () => {
  it("formats status labels consistently", () => {
    expect(formatNostrActionLabel("idle")).toBe("idle");
    expect(formatNostrActionLabel("syncing")).toBe("syncing");
    expect(formatNostrActionLabel("synced")).toBe("synced");
    expect(formatNostrActionLabel("up_to_date")).toBe("up to date");
    expect(formatNostrActionLabel("failed")).toBe("failed");
  });

  it("maps action statuses to fallback text when message is missing", () => {
    const fallbacks = {
      syncing: "syncing...",
      synced: "done",
      upToDate: "already current",
      failed: "failed",
    };

    expect(formatNostrActionStatusText("idle", null, fallbacks)).toBeNull();
    expect(formatNostrActionStatusText("syncing", null, fallbacks)).toBe("syncing...");
    expect(formatNostrActionStatusText("synced", null, fallbacks)).toBe("done");
    expect(formatNostrActionStatusText("up_to_date", null, fallbacks)).toBe("already current");
    expect(formatNostrActionStatusText("failed", null, fallbacks)).toBe("failed");
  });

  it("prefers explicit status message over fallback text", () => {
    const fallbacks = {
      syncing: "syncing...",
      synced: "done",
      upToDate: "already current",
      failed: "failed",
    };

    expect(formatNostrActionStatusText("syncing", "Custom message", fallbacks)).toBe("Custom message");
  });

  it("detects no-backup restore semantics", () => {
    expect(isNostrNoBackupState("up_to_date", NOSTR_NO_BACKUP_FOUND_MESSAGE)).toBe(true);
    expect(isNostrNoBackupState("failed", NOSTR_NO_BACKUP_FOUND_MESSAGE)).toBe(false);
    expect(isNostrNoBackupState("up_to_date", "Different message")).toBe(false);
  });

  it("builds troubleshooting hint with key state lines", () => {
    const hint = buildNostrTroubleshootingHint({
      profileStatus: "failed",
      profileMessage: "Could not refresh profile from Nostr relays.",
      backupStatus: "up_to_date",
      backupMessage: "No local game data to back up yet.",
      restoreStatus: "up_to_date",
      restoreMessage: NOSTR_NO_BACKUP_FOUND_MESSAGE,
      lastBackupAt: null,
      lastRestoreAt: "2026-02-23T10:15:00.000Z",
      lastBackupEncryption: null,
      lastRestoreEncryption: "nip44",
      formatTimestamp: (value) => value ?? "Never",
      formatEncryptionLabel: (value) => (value ? value.toUpperCase() : "Unknown"),
    });

    expect(hint).toContain("Sudoku Nostr troubleshooting snapshot");
    expect(hint).toContain("Profile status: failed");
    expect(hint).toContain("Backup status: up to date");
    expect(hint).toContain("Restore status: up to date");
    expect(hint).toContain("Restore encryption: NIP44");
  });
});
