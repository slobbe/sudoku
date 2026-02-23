import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import {
  clearNostrSession,
  createSessionLocalAccount,
  getSessionLocalNsec,
  restoreNostrAccountFromSession,
} from "../src/lib/nostr/account";

class MemoryStorage implements Storage {
  private readonly data = new Map<string, string>();

  get length(): number {
    return this.data.size;
  }

  clear(): void {
    this.data.clear();
  }

  getItem(key: string): string | null {
    return this.data.has(key) ? this.data.get(key)! : null;
  }

  key(index: number): string | null {
    return Array.from(this.data.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.data.delete(key);
  }

  setItem(key: string, value: string): void {
    this.data.set(key, String(value));
  }
}

type TestWindow = {
  localStorage: Storage;
  sessionStorage: Storage;
};

const globalWithWindow = globalThis as typeof globalThis & { window?: TestWindow };

function setTestWindow(localStorage: Storage, sessionStorage: Storage): void {
  Object.defineProperty(globalThis, "window", {
    value: {
      localStorage,
      sessionStorage,
    },
    configurable: true,
    writable: true,
  });
}

describe("nostr account storage", () => {
  let originalWindow: TestWindow | undefined;

  beforeEach(() => {
    originalWindow = globalWithWindow.window;
    setTestWindow(new MemoryStorage(), new MemoryStorage());
    clearNostrSession();
  });

  afterEach(() => {
    clearNostrSession();
    Object.defineProperty(globalThis, "window", {
      value: originalWindow,
      configurable: true,
      writable: true,
    });
  });

  it("restores an unencrypted local key from local storage", async () => {
    await createSessionLocalAccount("Alice");

    const currentWindow = globalWithWindow.window as TestWindow;
    const persistedLocalStorage = currentWindow.localStorage;

    setTestWindow(persistedLocalStorage, new MemoryStorage());

    const restored = await restoreNostrAccountFromSession();

    expect(restored.identity?.source).toBe("local");
    expect(restored.name).toBe("Alice");
    expect(restored.requiresPassphrase).toBe(false);
    expect(restored.localKeyProtection).toBe("unencrypted");
  });

  it("requires passphrase to restore encrypted local key", async () => {
    await createSessionLocalAccount("Bob", "passphrase-123");
    const unlockedNsec = getSessionLocalNsec();

    const currentWindow = globalWithWindow.window as TestWindow;
    const persistedLocalStorage = currentWindow.localStorage;

    setTestWindow(persistedLocalStorage, new MemoryStorage());

    const restartedAccountModule = await import(`../src/lib/nostr/account.ts?restart=${Date.now()}`);

    const restored = await restartedAccountModule.restoreNostrAccountFromSession();
    expect(restored.identity).toBeNull();
    expect(restored.name).toBe("Bob");
    expect(restored.requiresPassphrase).toBe(true);
    expect(restored.localKeyProtection).toBe("encrypted");

    await expect(restartedAccountModule.unlockStoredLocalAccount("wrong-passphrase")).rejects.toThrow(
      "Passphrase is incorrect or key data is invalid.",
    );

    const unlocked = await restartedAccountModule.unlockStoredLocalAccount("passphrase-123");
    expect(unlocked.identity.source).toBe("local");
    expect(unlocked.name).toBe("Bob");
    expect(restartedAccountModule.getSessionLocalNsec()).toBe(unlockedNsec);
  });
});
