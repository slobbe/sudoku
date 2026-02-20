import {
  readLegacySavedGamePayloadFromBrowser,
  readSavedGameConfigPayloadFromBrowser,
} from "./storage/game-storage";

export type AppTheme = "slate" | "dusk" | "mist" | "amber" | "light";

const APP_THEMES: AppTheme[] = ["slate", "dusk", "mist", "amber", "light"];

const THEME_COLORS: Record<AppTheme, string> = {
  slate: "#101923",
  mist: "#131917",
  dusk: "#151422",
  amber: "#1c1811",
  light: "#eff3fa",
};

export function normalizeAppTheme(theme: unknown): AppTheme {
  if (theme === "purple") {
    return "dusk";
  }

  if (typeof theme !== "string") {
    return "slate";
  }

  return APP_THEMES.includes(theme as AppTheme) ? (theme as AppTheme) : "slate";
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

export function readThemeFromSavedGame(): AppTheme {
  const configPayload = readSavedGameConfigPayloadFromBrowser();
  if (configPayload) {
    return normalizeAppTheme(configPayload.theme);
  }

  const legacyPayload = readLegacySavedGamePayloadFromBrowser();
  if (legacyPayload) {
    return normalizeAppTheme(legacyPayload.theme);
  }

  return "slate";
}
