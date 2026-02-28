import {
  loadSavedGamePayloadFromBrowser,
  readLegacySavedGamePayloadFromBrowser,
  readSavedGameConfigPayloadFromBrowser,
  saveSavedGamePayloadToBrowser,
} from "./storage/saved-game-repository";

export type AppTheme = "light" | "dark";
export type AppThemePreference = AppTheme | "system";

const THEME_STORAGE_KEY = "sudoku-theme-preference";
const DEFAULT_THEME_PREFERENCE: AppThemePreference = "system";

const THEME_COLORS: Record<AppTheme, string> = {
  light: "#f5f1e8",
  dark: "#141311",
};

function isLegacyDarkTheme(value: unknown): boolean {
  return value === "slate" || value === "dusk" || value === "mist" || value === "amber" || value === "purple";
}

export function resolveSystemTheme(): AppTheme {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return "light";
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function normalizeAppThemePreference(theme: unknown): AppThemePreference {
  if (theme === "system" || theme === "light" || theme === "dark") {
    return theme;
  }

  if (isLegacyDarkTheme(theme)) {
    return "dark";
  }

  return DEFAULT_THEME_PREFERENCE;
}

export function resolveThemePreference(preference: AppThemePreference): AppTheme {
  return preference === "system" ? resolveSystemTheme() : preference;
}

export function normalizeAppTheme(theme: unknown): AppTheme {
  if (theme === "light" || theme === "dark") {
    return theme;
  }

  if (isLegacyDarkTheme(theme)) {
    return "dark";
  }

  if (theme === "system") {
    return resolveSystemTheme();
  }

  return resolveThemePreference(DEFAULT_THEME_PREFERENCE);
}

export function applyThemeToDocument(theme: AppTheme): void {
  if (typeof document === "undefined") {
    return;
  }

  document.documentElement.dataset.theme = theme;
  const themeMeta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (themeMeta) {
    themeMeta.setAttribute("content", THEME_COLORS[theme]);
  }
}

export function applyThemePreferenceToDocument(preference: AppThemePreference): AppTheme {
  const resolvedTheme = resolveThemePreference(preference);
  applyThemeToDocument(resolvedTheme);
  return resolvedTheme;
}

export async function persistThemeToSavedGame(theme: AppThemePreference): Promise<void> {
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

export async function readThemePreferenceFromSavedGame(): Promise<AppThemePreference> {
  if (typeof window !== "undefined") {
    try {
      const localTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
      if (localTheme) {
        return normalizeAppThemePreference(localTheme);
      }
    } catch {
      // Ignore local storage read errors.
    }
  }

  const configPayload = await readSavedGameConfigPayloadFromBrowser();
  if (configPayload) {
    const nextTheme = normalizeAppThemePreference(configPayload.theme);
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
    const nextTheme = normalizeAppThemePreference(legacyPayload.theme);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
      } catch {
        // Ignore storage failures in private mode.
      }
    }
    return nextTheme;
  }

  return DEFAULT_THEME_PREFERENCE;
}

export async function readThemeFromSavedGame(): Promise<AppTheme> {
  const preference = await readThemePreferenceFromSavedGame();
  return resolveThemePreference(preference);
}
