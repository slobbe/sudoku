import type {
  Board,
  Difficulty,
  PuzzleCandidate,
} from "@slobbe/sudoku-engine";

const CACHE_DB_NAME = "sudoku-puzzle-cache";
const CACHE_DB_VERSION = 1;
const STORE_NAME = "entries";

const CACHE_SCHEMA_VERSION = "tech-v1";

const inMemoryStore = new Map<string, unknown>();

let databasePromise: Promise<IDBDatabase | null> | null = null;

function isDifficulty(value: unknown): value is Difficulty {
  return value === "easy" || value === "medium" || value === "hard" || value === "expert";
}

function isTechnique(value: unknown): boolean {
  return value === "naked-single"
    || value === "hidden-single"
    || value === "locked-candidates"
    || value === "naked-pair"
    || value === "hidden-pair"
    || value === "x-wing"
    || value === "swordfish";
}

function isBoardShape(value: unknown): value is Board {
  return Array.isArray(value)
    && value.length === 9
    && value.every(
      (row) => Array.isArray(row)
        && row.length === 9
        && row.every((cell) => Number.isInteger(cell) && cell >= 0 && cell <= 9),
    );
}

function isTechniqueCounts(value: unknown): boolean {
  if (!value || typeof value !== "object") {
    return false;
  }

  const counts = value as Record<string, unknown>;
  const techniques = [
    "naked-single",
    "hidden-single",
    "locked-candidates",
    "naked-pair",
    "hidden-pair",
    "x-wing",
    "swordfish",
  ];

  return techniques.every((technique) => Number.isInteger(counts[technique]) && (counts[technique] as number) >= 0);
}

function isPuzzleCandidate(value: unknown): value is PuzzleCandidate {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  const hasCoreShape = isBoardShape(candidate.puzzle)
    && isBoardShape(candidate.solution)
    && isDifficulty(candidate.difficulty)
    && Number.isInteger(candidate.givens);

  if (!hasCoreShape) {
    return false;
  }

  if (!("score" in candidate) || !("hardestTechnique" in candidate) || !("solvedByTechniques" in candidate)) {
    return true;
  }

  return Number.isInteger(candidate.score)
    && isTechnique(candidate.hardestTechnique)
    && typeof candidate.solvedByTechniques === "boolean"
    && isTechniqueCounts(candidate.techniqueCounts);
}

function puzzleSignature(board: Board): string {
  return board.map((row) => row.join("")).join("|");
}

function getDailyKey(seed: string, difficulty: Difficulty): string {
  return `daily:${CACHE_SCHEMA_VERSION}:${seed}:${difficulty}`;
}

function getQueueKey(difficulty: Difficulty): string {
  return `queue:${CACHE_SCHEMA_VERSION}:${difficulty}`;
}

function waitForRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed."));
  });
}

function waitForTransaction(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(transaction.error ?? new Error("IndexedDB transaction aborted."));
    transaction.onerror = () => reject(transaction.error ?? new Error("IndexedDB transaction failed."));
  });
}

function getIndexedDbFactory(): IDBFactory | null {
  if (typeof indexedDB === "undefined") {
    return null;
  }

  return indexedDB;
}

function openDatabase(factory: IDBFactory): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = factory.open(CACHE_DB_NAME, CACHE_DB_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open puzzle cache database."));
  });
}

async function getDatabase(): Promise<IDBDatabase | null> {
  if (databasePromise) {
    return databasePromise;
  }

  const factory = getIndexedDbFactory();
  if (!factory) {
    return null;
  }

  databasePromise = openDatabase(factory).catch(() => null);
  return databasePromise;
}

async function readFromPersistentStore(key: string): Promise<unknown | null> {
  const database = await getDatabase();
  if (!database) {
    return inMemoryStore.get(key) ?? null;
  }

  try {
    const transaction = database.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const value = await waitForRequest(store.get(key));
    await waitForTransaction(transaction);
    return value ?? null;
  } catch {
    return inMemoryStore.get(key) ?? null;
  }
}

async function writeToPersistentStore(key: string, value: unknown): Promise<void> {
  inMemoryStore.set(key, value);

  const database = await getDatabase();
  if (!database) {
    return;
  }

  try {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    await waitForRequest(store.put(value, key));
    await waitForTransaction(transaction);
  } catch {
    // Keep in-memory cache as fallback.
  }
}

async function readQueue(difficulty: Difficulty): Promise<PuzzleCandidate[]> {
  const value = await readFromPersistentStore(getQueueKey(difficulty));
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isPuzzleCandidate);
}

async function writeQueue(difficulty: Difficulty, queue: PuzzleCandidate[]): Promise<void> {
  await writeToPersistentStore(getQueueKey(difficulty), queue);
}

export async function readDailyCachedPuzzle(seed: string, difficulty: Difficulty): Promise<PuzzleCandidate | null> {
  const value = await readFromPersistentStore(getDailyKey(seed, difficulty));
  if (!isPuzzleCandidate(value)) {
    return null;
  }

  return value;
}

export async function writeDailyCachedPuzzle(seed: string, difficulty: Difficulty, candidate: PuzzleCandidate): Promise<void> {
  await writeToPersistentStore(getDailyKey(seed, difficulty), candidate);
}

export async function popQueuedPuzzle(difficulty: Difficulty): Promise<PuzzleCandidate | null> {
  const queue = await readQueue(difficulty);
  if (queue.length === 0) {
    return null;
  }

  const [head, ...tail] = queue;
  await writeQueue(difficulty, tail);
  return head;
}

export async function getQueueLength(difficulty: Difficulty): Promise<number> {
  const queue = await readQueue(difficulty);
  return queue.length;
}

export async function appendQueuedPuzzle(
  difficulty: Difficulty,
  candidate: PuzzleCandidate,
  maxEntries: number,
): Promise<void> {
  const queue = await readQueue(difficulty);
  const signature = puzzleSignature(candidate.puzzle);
  const existingSignatures = new Set(queue.map((entry) => puzzleSignature(entry.puzzle)));
  if (existingSignatures.has(signature)) {
    return;
  }

  const nextQueue = [...queue, candidate].slice(-Math.max(1, maxEntries));
  await writeQueue(difficulty, nextQueue);
}
