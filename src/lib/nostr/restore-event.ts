export const NOSTR_RESTORE_COMPLETED_EVENT = "sudoku:nostr-restore-completed";

export type NostrRestoreCompletedEventDetail = {
  restoredAt: string;
};

export function emitNostrRestoreCompletedEvent(restoredAt: string): void {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent<NostrRestoreCompletedEventDetail>(NOSTR_RESTORE_COMPLETED_EVENT, {
      detail: { restoredAt },
    }),
  );
}
