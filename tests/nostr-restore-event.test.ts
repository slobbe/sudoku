import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import {
  emitNostrRestoreCompletedEvent,
  NOSTR_RESTORE_COMPLETED_EVENT,
} from "../src/lib/nostr/restore-event";

type TestWindow = {
  dispatchEvent: (event: Event) => boolean;
  addEventListener: (type: string, listener: EventListenerOrEventListenerObject) => void;
  removeEventListener: (type: string, listener: EventListenerOrEventListenerObject) => void;
};

const globalWithWindow = globalThis as typeof globalThis & { window?: TestWindow };

describe("nostr restore event", () => {
  let originalWindow: TestWindow | undefined;

  beforeEach(() => {
    originalWindow = globalWithWindow.window;
    Object.defineProperty(globalThis, "window", {
      value: globalThis,
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(globalThis, "window", {
      value: originalWindow,
      configurable: true,
      writable: true,
    });
  });

  it("dispatches restore completed custom event", () => {
    const restoredAt = new Date().toISOString();
    const receivedDetails: string[] = [];
    const listener = (event: Event) => {
      const customEvent = event as CustomEvent<{ restoredAt: string }>;
      receivedDetails.push(customEvent.detail.restoredAt);
    };

    window.addEventListener(NOSTR_RESTORE_COMPLETED_EVENT, listener);
    emitNostrRestoreCompletedEvent(restoredAt);
    window.removeEventListener(NOSTR_RESTORE_COMPLETED_EVENT, listener);

    expect(receivedDetails).toEqual([restoredAt]);
  });
});
