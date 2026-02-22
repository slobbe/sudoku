import {
  createSeededRng,
  generatePuzzleCandidate,
  type Difficulty,
} from "@slobbe/sudoku-engine";
import type {
  PuzzleWorkerRequest,
  PuzzleWorkerResponse,
} from "./types";

const cancelledRequestIds = new Set<number>();

function postResponse(message: PuzzleWorkerResponse): void {
  self.postMessage(message);
}

function isCancelled(requestId: number): boolean {
  return cancelledRequestIds.has(requestId);
}

function createAbortError(): Error {
  const error = new Error("Puzzle generation aborted.");
  error.name = "AbortError";
  return error;
}

function createRequestRng(seed: string | undefined): () => number {
  if (seed) {
    return createSeededRng(seed);
  }

  return Math.random;
}

async function generateExactPuzzle(
  requestId: number,
  difficulty: Difficulty,
  seed?: string,
) {
  const rng = createRequestRng(seed);
  let attempts = 0;

  while (true) {
    if (isCancelled(requestId)) {
      throw createAbortError();
    }

    const candidate = generatePuzzleCandidate(difficulty, { rng });
    attempts += 1;
    if (candidate.difficulty === difficulty) {
      return candidate;
    }

    if (attempts % 8 === 0) {
      await new Promise((resolve) => {
        setTimeout(resolve, 0);
      });
    }
  }
}

async function handleGenerateMessage(message: Extract<PuzzleWorkerRequest, { type: "generate" }>): Promise<void> {
  try {
    const candidate = await generateExactPuzzle(message.id, message.difficulty, message.seed);
    if (isCancelled(message.id)) {
      postResponse({
        type: "error",
        id: message.id,
        message: "Puzzle generation aborted.",
        aborted: true,
      });
      return;
    }

    postResponse({
      type: "generated",
      id: message.id,
      candidate,
    });
  } catch (error) {
    const isAbortError = error instanceof Error && error.name === "AbortError";
    postResponse({
      type: "error",
      id: message.id,
      message: isAbortError
        ? "Puzzle generation aborted."
        : error instanceof Error
          ? error.message
          : "Puzzle generation failed.",
      aborted: isAbortError,
    });
  } finally {
    cancelledRequestIds.delete(message.id);
  }
}

self.addEventListener("message", (event: MessageEvent<PuzzleWorkerRequest>) => {
  const message = event.data;
  if (!message) {
    return;
  }

  if (message.type === "cancel") {
    cancelledRequestIds.add(message.id);
    return;
  }

  void handleGenerateMessage(message);
});
