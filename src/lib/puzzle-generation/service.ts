import type {
  Difficulty,
  PuzzleCandidate,
} from "@slobbe/sudoku-engine";
import {
  appendQueuedPuzzle,
  getQueueLength,
  popQueuedPuzzle,
  readDailyCachedPuzzle,
  writeDailyCachedPuzzle,
} from "./cache";
import { requestExactPuzzleFromWorker } from "./worker-client";

export type GamePuzzleRequest = {
  difficulty: Difficulty;
  seed?: string;
  signal?: AbortSignal;
};

const STANDARD_QUEUE_TARGET = 3;

const inMemoryDailyCache = new Map<string, PuzzleCandidate>();
const warmQueueInFlight = new Set<Difficulty>();

function getDailyMemoryKey(seed: string, difficulty: Difficulty): string {
  return `${seed}:${difficulty}`;
}

async function generateAndQueueOne(difficulty: Difficulty): Promise<void> {
  const generated = await requestExactPuzzleFromWorker(difficulty);
  await appendQueuedPuzzle(difficulty, generated, STANDARD_QUEUE_TARGET);
}

export function warmPuzzleQueue(difficulty: Difficulty, target = STANDARD_QUEUE_TARGET): void {
  if (typeof window === "undefined") {
    return;
  }

  if (warmQueueInFlight.has(difficulty)) {
    return;
  }

  warmQueueInFlight.add(difficulty);

  void (async () => {
    try {
      let length = await getQueueLength(difficulty);
      while (length < Math.max(1, target)) {
        await generateAndQueueOne(difficulty);
        length = await getQueueLength(difficulty);
      }
    } catch {
      // Ignore warmup failures and keep foreground generation available.
    } finally {
      warmQueueInFlight.delete(difficulty);
    }
  })();
}

export async function generateGamePuzzle(request: GamePuzzleRequest): Promise<PuzzleCandidate> {
  const { difficulty, seed, signal } = request;

  if (seed) {
    const dailyKey = getDailyMemoryKey(seed, difficulty);
    const inMemory = inMemoryDailyCache.get(dailyKey);
    if (inMemory) {
      return inMemory;
    }

    const persisted = await readDailyCachedPuzzle(seed, difficulty);
    if (persisted) {
      inMemoryDailyCache.set(dailyKey, persisted);
      return persisted;
    }

    const generated = await requestExactPuzzleFromWorker(difficulty, seed, signal);
    inMemoryDailyCache.set(dailyKey, generated);
    await writeDailyCachedPuzzle(seed, difficulty, generated);
    return generated;
  }

  const queued = await popQueuedPuzzle(difficulty);
  if (queued) {
    warmPuzzleQueue(difficulty);
    return queued;
  }

  const generated = await requestExactPuzzleFromWorker(difficulty, undefined, signal);
  warmPuzzleQueue(difficulty);
  return generated;
}
