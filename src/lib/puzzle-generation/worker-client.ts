import type {
  Difficulty,
  PuzzleCandidate,
} from "@slobbe/sudoku-engine";
import type {
  PuzzleWorkerRequest,
  PuzzleWorkerResponse,
} from "./types";

type PendingRequest = {
  resolve: (candidate: PuzzleCandidate) => void;
  reject: (error: Error) => void;
};

let workerInstance: Worker | null = null;
let nextRequestId = 1;

const pendingRequests = new Map<number, PendingRequest>();

function createAbortError(): Error {
  if (typeof DOMException !== "undefined") {
    return new DOMException("Puzzle generation aborted.", "AbortError");
  }

  const error = new Error("Puzzle generation aborted.");
  error.name = "AbortError";
  return error;
}

function handleWorkerMessage(event: MessageEvent<PuzzleWorkerResponse>): void {
  const message = event.data;
  if (!message) {
    return;
  }

  const pending = pendingRequests.get(message.id);
  if (!pending) {
    return;
  }

  pendingRequests.delete(message.id);

  if (message.type === "generated") {
    pending.resolve(message.candidate);
    return;
  }

  if (message.aborted) {
    pending.reject(createAbortError());
    return;
  }

  pending.reject(new Error(message.message));
}

function getWorker(): Worker {
  if (typeof window === "undefined") {
    throw new Error("Puzzle worker is only available in the browser.");
  }

  if (!workerInstance) {
    workerInstance = new Worker(new URL("./worker.ts", import.meta.url), { type: "module" });
    workerInstance.addEventListener("message", handleWorkerMessage);
  }

  return workerInstance;
}

function postWorkerMessage(message: PuzzleWorkerRequest): void {
  getWorker().postMessage(message);
}

export async function requestExactPuzzleFromWorker(
  difficulty: Difficulty,
  seed?: string,
  signal?: AbortSignal,
): Promise<PuzzleCandidate> {
  const requestId = nextRequestId;
  nextRequestId += 1;

  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(createAbortError());
      return;
    }

    const onAbort = () => {
      pendingRequests.delete(requestId);
      postWorkerMessage({ type: "cancel", id: requestId });
      reject(createAbortError());
    };

    pendingRequests.set(requestId, {
      resolve: (candidate) => {
        if (signal) {
          signal.removeEventListener("abort", onAbort);
        }
        resolve(candidate);
      },
      reject: (error) => {
        if (signal) {
          signal.removeEventListener("abort", onAbort);
        }
        reject(error);
      },
    });

    if (signal) {
      signal.addEventListener("abort", onAbort, { once: true });
    }

    postWorkerMessage({
      type: "generate",
      id: requestId,
      difficulty,
      seed,
    });
  });
}
