import type { NostrActionStatus } from "./account-context";

export const NOSTR_NO_BACKUP_FOUND_MESSAGE = "No encrypted backup found on relays.";

type NostrActionStatusFallbacks = {
  syncing: string;
  synced: string;
  upToDate: string;
  failed: string;
};

type BuildNostrTroubleshootingHintParams = {
  profileStatus: NostrActionStatus;
  profileMessage: string | null;
  backupStatus: NostrActionStatus;
  backupMessage: string | null;
  restoreStatus: NostrActionStatus;
  restoreMessage: string | null;
  lastBackupAt: string | null;
  lastRestoreAt: string | null;
  lastBackupEncryption: "nip44" | "nip04" | null;
  lastRestoreEncryption: "nip44" | "nip04" | null;
  formatTimestamp: (value: string | null) => string;
  formatEncryptionLabel: (value: "nip44" | "nip04" | null) => string;
};

export function formatNostrActionLabel(status: NostrActionStatus): string {
  if (status === "syncing") {
    return "syncing";
  }

  if (status === "synced") {
    return "synced";
  }

  if (status === "up_to_date") {
    return "up to date";
  }

  if (status === "failed") {
    return "failed";
  }

  return "idle";
}

export function formatNostrActionStatusText(
  status: NostrActionStatus,
  message: string | null,
  fallbacks: NostrActionStatusFallbacks,
): string | null {
  if (status === "idle") {
    return message;
  }

  if (status === "syncing") {
    return message ?? fallbacks.syncing;
  }

  if (status === "synced") {
    return message ?? fallbacks.synced;
  }

  if (status === "up_to_date") {
    return message ?? fallbacks.upToDate;
  }

  return message ?? fallbacks.failed;
}

export function isNostrNoBackupState(status: NostrActionStatus, message: string | null): boolean {
  return status === "up_to_date" && message === NOSTR_NO_BACKUP_FOUND_MESSAGE;
}

export function buildNostrTroubleshootingHint(params: BuildNostrTroubleshootingHintParams): string {
  const lines = [
    "Sudoku Nostr troubleshooting snapshot",
    `- Profile status: ${formatNostrActionLabel(params.profileStatus)}${params.profileMessage ? ` (${params.profileMessage})` : ""}`,
    `- Backup status: ${formatNostrActionLabel(params.backupStatus)}${params.backupMessage ? ` (${params.backupMessage})` : ""}`,
    `- Restore status: ${formatNostrActionLabel(params.restoreStatus)}${params.restoreMessage ? ` (${params.restoreMessage})` : ""}`,
    `- Last backup: ${params.formatTimestamp(params.lastBackupAt)}`,
    `- Last restore: ${params.formatTimestamp(params.lastRestoreAt)}`,
    `- Backup encryption: ${params.formatEncryptionLabel(params.lastBackupEncryption)}`,
    `- Restore encryption: ${params.formatEncryptionLabel(params.lastRestoreEncryption)}`,
    "- Local browser data stays unchanged unless restore succeeds.",
  ];

  return lines.join("\n");
}
