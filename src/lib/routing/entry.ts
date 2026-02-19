export type SudokuEntryPoint = "home" | "daily" | "settings" | "statistics" | "puzzle";

export type SudokuAppView = "home" | "game" | "settings" | "stats";

export type PuzzleEntryMode = "new" | "continue";

type DailyEntryStartArgs = {
  entryPoint: SudokuEntryPoint;
  isHydrated: boolean;
  hasDailyEntryStarted: boolean;
};

type PuzzleEntryStartArgs = {
  entryPoint: SudokuEntryPoint;
  isHydrated: boolean;
  hasPuzzleEntryStarted: boolean;
};

type RouteGameLoadingArgs = {
  entryPoint: SudokuEntryPoint;
  hasDailyEntryStarted: boolean;
  hasPuzzleEntryStarted: boolean;
  hasBoard: boolean;
  mode: "standard" | "daily";
};

export function getInitialViewForEntryPoint(entryPoint: SudokuEntryPoint): SudokuAppView {
  if (entryPoint === "settings") {
    return "settings";
  }

  if (entryPoint === "statistics") {
    return "stats";
  }

  if (entryPoint === "daily" || entryPoint === "puzzle") {
    return "game";
  }

  return "home";
}

export function shouldStartDailyEntry(args: DailyEntryStartArgs): boolean {
  return args.entryPoint === "daily" && args.isHydrated && !args.hasDailyEntryStarted;
}

export function shouldStartPuzzleEntry(args: PuzzleEntryStartArgs): boolean {
  return args.entryPoint === "puzzle" && args.isHydrated && !args.hasPuzzleEntryStarted;
}

export function parsePuzzleEntryMode(search: string): PuzzleEntryMode {
  const params = new URLSearchParams(search);
  return params.get("mode") === "new" ? "new" : "continue";
}

export function isRouteGameLoading(args: RouteGameLoadingArgs): boolean {
  if (args.entryPoint === "daily") {
    return !args.hasDailyEntryStarted || !args.hasBoard || args.mode !== "daily";
  }

  if (args.entryPoint === "puzzle") {
    return !args.hasPuzzleEntryStarted || !args.hasBoard || args.mode !== "standard";
  }

  return false;
}
