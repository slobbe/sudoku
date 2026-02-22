import type {
  Difficulty,
  PuzzleCandidate,
} from "@slobbe/sudoku-engine";

export type GeneratedPuzzle = PuzzleCandidate;

export type PuzzleWorkerRequest =
  | {
    type: "generate";
    id: number;
    difficulty: Difficulty;
    seed?: string;
  }
  | {
    type: "cancel";
    id: number;
  };

export type PuzzleWorkerResponse =
  | {
    type: "generated";
    id: number;
    candidate: GeneratedPuzzle;
  }
  | {
    type: "error";
    id: number;
    message: string;
    aborted?: boolean;
  };
