import { describe, expect, it } from "bun:test";
import {
  getInitialViewForEntryPoint,
  isRouteGameLoading,
  parsePuzzleEntryMode,
  shouldStartDailyEntry,
  shouldStartPuzzleEntry,
} from "../src/lib/routing/entry";

describe("route entry helpers", () => {
  it("maps each route entry point to its initial app view", () => {
    expect(getInitialViewForEntryPoint("home")).toBe("home");
    expect(getInitialViewForEntryPoint("daily")).toBe("game");
    expect(getInitialViewForEntryPoint("puzzle")).toBe("game");
    expect(getInitialViewForEntryPoint("settings")).toBe("settings");
    expect(getInitialViewForEntryPoint("statistics")).toBe("stats");
  });

  it("parses puzzle mode from query string", () => {
    expect(parsePuzzleEntryMode("?mode=new")).toBe("new");
    expect(parsePuzzleEntryMode("mode=new")).toBe("new");
  });

  it("defaults puzzle entry mode to continue", () => {
    expect(parsePuzzleEntryMode("")).toBe("continue");
    expect(parsePuzzleEntryMode("?mode=continue")).toBe("continue");
    expect(parsePuzzleEntryMode("?mode=foo")).toBe("continue");
  });

  it("starts daily entry only when daily route is hydrated and not started", () => {
    expect(shouldStartDailyEntry({
      entryPoint: "daily",
      isHydrated: true,
      hasDailyEntryStarted: false,
    })).toBe(true);

    expect(shouldStartDailyEntry({
      entryPoint: "daily",
      isHydrated: false,
      hasDailyEntryStarted: false,
    })).toBe(false);

    expect(shouldStartDailyEntry({
      entryPoint: "daily",
      isHydrated: true,
      hasDailyEntryStarted: true,
    })).toBe(false);

    expect(shouldStartDailyEntry({
      entryPoint: "home",
      isHydrated: true,
      hasDailyEntryStarted: false,
    })).toBe(false);
  });

  it("starts puzzle entry only when puzzle route is hydrated and not started", () => {
    expect(shouldStartPuzzleEntry({
      entryPoint: "puzzle",
      isHydrated: true,
      hasPuzzleEntryStarted: false,
    })).toBe(true);

    expect(shouldStartPuzzleEntry({
      entryPoint: "puzzle",
      isHydrated: false,
      hasPuzzleEntryStarted: false,
    })).toBe(false);

    expect(shouldStartPuzzleEntry({
      entryPoint: "puzzle",
      isHydrated: true,
      hasPuzzleEntryStarted: true,
    })).toBe(false);

    expect(shouldStartPuzzleEntry({
      entryPoint: "daily",
      isHydrated: true,
      hasPuzzleEntryStarted: false,
    })).toBe(false);
  });

  it("shows route loading state until matching game entry is ready", () => {
    expect(isRouteGameLoading({
      entryPoint: "daily",
      hasDailyEntryStarted: false,
      hasPuzzleEntryStarted: true,
      hasBoard: false,
      mode: "daily",
    })).toBe(true);

    expect(isRouteGameLoading({
      entryPoint: "daily",
      hasDailyEntryStarted: true,
      hasPuzzleEntryStarted: true,
      hasBoard: true,
      mode: "daily",
    })).toBe(false);

    expect(isRouteGameLoading({
      entryPoint: "puzzle",
      hasDailyEntryStarted: true,
      hasPuzzleEntryStarted: true,
      hasBoard: true,
      mode: "standard",
    })).toBe(false);

    expect(isRouteGameLoading({
      entryPoint: "puzzle",
      hasDailyEntryStarted: true,
      hasPuzzleEntryStarted: true,
      hasBoard: true,
      mode: "daily",
    })).toBe(true);

    expect(isRouteGameLoading({
      entryPoint: "home",
      hasDailyEntryStarted: false,
      hasPuzzleEntryStarted: false,
      hasBoard: false,
      mode: "standard",
    })).toBe(false);
  });
});
