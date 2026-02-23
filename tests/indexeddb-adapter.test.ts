import { afterEach, describe, expect, it } from "bun:test";
import { createIndexedDbSavedGameAdapter } from "../src/lib/storage/indexeddb-adapter";

type OpenFailure = "error" | "blocked";
type ReadFailure = "request" | "transaction";
type WriteFailure = "request" | "transaction";

type FakeIndexedDbOptions = {
  openFailure?: OpenFailure;
  readFailure?: ReadFailure;
  writeFailure?: WriteFailure;
  initialPayload?: Record<string, unknown> | null;
};

type MutableRequest<T> = {
  result: T;
  error: Error | null;
  onsuccess: ((event: Event) => void) | null;
  onerror: ((event: Event) => void) | null;
};

type MutableOpenRequest = MutableRequest<IDBDatabase> & {
  onupgradeneeded: ((event: IDBVersionChangeEvent) => void) | null;
  onblocked: ((event: Event) => void) | null;
};

type MutableTransaction = {
  error: Error | null;
  oncomplete: ((event: Event) => void) | null;
  onabort: ((event: Event) => void) | null;
  onerror: ((event: Event) => void) | null;
};

const indexedDbDescriptor = Object.getOwnPropertyDescriptor(globalThis, "indexedDB");

function restoreIndexedDbGlobal(): void {
  if (indexedDbDescriptor) {
    Object.defineProperty(globalThis, "indexedDB", indexedDbDescriptor);
    return;
  }

  Reflect.deleteProperty(globalThis, "indexedDB");
}

function assignIndexedDbGlobal(factory: IDBFactory): void {
  Object.defineProperty(globalThis, "indexedDB", {
    configurable: true,
    writable: true,
    value: factory,
  });
}

function createFakeIndexedDbFactory(options: FakeIndexedDbOptions = {}): IDBFactory {
  let persistedPayload = options.initialPayload ?? null;

  return {
    open() {
      const storeNames = new Set<string>();

      const database = {
        objectStoreNames: {
          contains(name: string) {
            return storeNames.has(name);
          },
        } as unknown as DOMStringList,
        createObjectStore(name: string) {
          storeNames.add(name);
          return {} as IDBObjectStore;
        },
        transaction() {
          const transaction = {
            error: null,
            oncomplete: null,
            onabort: null,
            onerror: null,
            objectStore() {
              return store as unknown as IDBObjectStore;
            },
          } as MutableTransaction & { objectStore: () => IDBObjectStore };

          const store = {
            get() {
              const request: MutableRequest<unknown> = {
                result: undefined,
                error: null,
                onsuccess: null,
                onerror: null,
              };

              setTimeout(() => {
                if (options.readFailure === "request") {
                  request.error = new Error("Read request failed.");
                  request.onerror?.(new Event("error"));
                  return;
                }

                request.result = persistedPayload;
                request.onsuccess?.(new Event("success"));

                setTimeout(() => {
                  if (options.readFailure === "transaction") {
                    transaction.error = new Error("Read transaction failed.");
                    transaction.onabort?.(new Event("abort"));
                    return;
                  }

                  transaction.oncomplete?.(new Event("complete"));
                }, 0);
              }, 0);

              return request as unknown as IDBRequest<unknown>;
            },
            put(payload: Record<string, unknown>) {
              const request: MutableRequest<IDBValidKey> = {
                result: "v2",
                error: null,
                onsuccess: null,
                onerror: null,
              };

              setTimeout(() => {
                if (options.writeFailure === "request") {
                  request.error = new Error("Write request failed.");
                  request.onerror?.(new Event("error"));
                  return;
                }

                persistedPayload = payload;
                request.onsuccess?.(new Event("success"));

                setTimeout(() => {
                  if (options.writeFailure === "transaction") {
                    transaction.error = new Error("Write transaction failed.");
                    transaction.onabort?.(new Event("abort"));
                    return;
                  }

                  transaction.oncomplete?.(new Event("complete"));
                }, 0);
              }, 0);

              return request as unknown as IDBRequest<IDBValidKey>;
            },
          };

          return transaction as unknown as IDBTransaction;
        },
        close() {
          return undefined;
        },
      } as unknown as IDBDatabase;

      const request: MutableOpenRequest = {
        result: database,
        error: null,
        onsuccess: null,
        onerror: null,
        onupgradeneeded: null,
        onblocked: null,
      };

      setTimeout(() => {
        if (options.openFailure === "error") {
          request.error = new Error("Open failed.");
          request.onerror?.(new Event("error"));
          return;
        }

        if (options.openFailure === "blocked") {
          request.onblocked?.(new Event("blocked"));
          return;
        }

        request.onupgradeneeded?.(new Event("upgradeneeded") as IDBVersionChangeEvent);
        request.onsuccess?.(new Event("success"));
      }, 0);

      return request as unknown as IDBOpenDBRequest;
    },
  } as unknown as IDBFactory;
}

afterEach(() => {
  restoreIndexedDbGlobal();
});

describe("indexeddb saved game adapter", () => {
  it("returns null and false when indexeddb is unavailable", async () => {
    Reflect.deleteProperty(globalThis, "indexedDB");
    const adapter = createIndexedDbSavedGameAdapter();

    await expect(adapter.loadPayload()).resolves.toBeNull();
    await expect(adapter.savePayload({ value: 1 })).resolves.toBe(false);
  });

  it("returns null when open request fails", async () => {
    assignIndexedDbGlobal(createFakeIndexedDbFactory({ openFailure: "error" }));
    const adapter = createIndexedDbSavedGameAdapter();

    await expect(adapter.loadPayload()).resolves.toBeNull();
  });

  it("returns null when open request is blocked", async () => {
    assignIndexedDbGlobal(createFakeIndexedDbFactory({ openFailure: "blocked" }));
    const adapter = createIndexedDbSavedGameAdapter();

    await expect(adapter.loadPayload()).resolves.toBeNull();
  });

  it("returns null when read transaction fails", async () => {
    assignIndexedDbGlobal(createFakeIndexedDbFactory({ readFailure: "transaction" }));
    const adapter = createIndexedDbSavedGameAdapter();

    await expect(adapter.loadPayload()).resolves.toBeNull();
  });

  it("returns null when read request fails", async () => {
    assignIndexedDbGlobal(createFakeIndexedDbFactory({ readFailure: "request" }));
    const adapter = createIndexedDbSavedGameAdapter();

    await expect(adapter.loadPayload()).resolves.toBeNull();
  });

  it("returns false when write request fails", async () => {
    assignIndexedDbGlobal(createFakeIndexedDbFactory({ writeFailure: "request" }));
    const adapter = createIndexedDbSavedGameAdapter();

    await expect(adapter.savePayload({ value: 1 })).resolves.toBe(false);
  });

  it("returns false when write transaction fails", async () => {
    assignIndexedDbGlobal(createFakeIndexedDbFactory({ writeFailure: "transaction" }));
    const adapter = createIndexedDbSavedGameAdapter();

    await expect(adapter.savePayload({ value: 1 })).resolves.toBe(false);
  });

  it("reads payload and picks config fields", async () => {
    assignIndexedDbGlobal(createFakeIndexedDbFactory({
      initialPayload: {
        difficulty: "hard",
        theme: "mist",
        configuredHintsPerGame: 2,
        extra: "ignored",
      },
    }));
    const adapter = createIndexedDbSavedGameAdapter();

    await expect(adapter.loadPayload()).resolves.toEqual({
      difficulty: "hard",
      theme: "mist",
      configuredHintsPerGame: 2,
      extra: "ignored",
    });

    await expect(adapter.readConfigPayload()).resolves.toEqual({
      difficulty: "hard",
      theme: "mist",
      configuredHintsPerGame: 2,
    });
  });
});
