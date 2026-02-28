import {
  loadSavedGamePayloadFromBrowser,
  readLegacySavedGamePayloadFromBrowser,
  readSavedGameConfigPayloadFromBrowser,
  saveSavedGamePayloadToBrowser,
} from "./storage/saved-game-repository";

export type AppTheme = "light" | "dark";

const APP_THEMES: AppTheme[] = ["light", "dark"];
const THEME_STORAGE_KEY = "sudoku-theme-preference";

const THEME_COLORS: Record<AppTheme, string> = {
  light: "#f5f1e8",
  dark: "#141311",
};

export function normalizeAppTheme(theme: unknown): AppTheme {
  if (theme === "dark") {
    return "dark";
  }

  if (theme === "light") {
    return "light";
  }

  if (theme === "slate" || theme === "dusk" || theme === "mist" || theme === "amber" || theme === "purple") {
    return "dark";
  }

  if (typeof theme !== "string") {
    return "light";
  }

  return APP_THEMES.includes(theme as AppTheme) ? (theme as AppTheme) : "light";
}

export function applyThemeToDocument(theme: AppTheme): void {
  if (typeof document === "undefined") {
    return;
  }

  document.documentElement.dataset.theme = theme;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Ignore storage failures in private mode.
    }
  }
  const themeMeta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (themeMeta) {
    themeMeta.setAttribute("content", THEME_COLORS[theme]);
  }
}

export async function persistThemeToSavedGame(theme: AppTheme): Promise<void> {
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Ignore storage failures in private mode.
    }
  }

  const payload = (await loadSavedGamePayloadFromBrowser()) ?? {};
  await saveSavedGamePayloadToBrowser({
    ...payload,
    theme,
  });
}

export async function readThemeFromSavedGame(): Promise<AppTheme> {
  if (typeof window !== "undefined") {
    try {
      const localTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
      if (localTheme) {
        return normalizeAppTheme(localTheme);
      }
    } catch {
      // Ignore local storage read errors.
    }
  }

  const configPayload = await readSavedGameConfigPayloadFromBrowser();
  if (configPayload) {
    const nextTheme = normalizeAppTheme(configPayload.theme);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
      } catch {
        // Ignore storage failures in private mode.
      }
    }
    return nextTheme;
  }

  const legacyPayload = await readLegacySavedGamePayloadFromBrowser();
  if (legacyPayload) {
    const nextTheme = normalizeAppTheme(legacyPayload.theme);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
      } catch {
        // Ignore storage failures in private mode.
      }
    }
    return nextTheme;
  }

  return "light";
}
