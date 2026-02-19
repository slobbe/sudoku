export type AppTheme = "slate" | "dusk" | "mist" | "amber";

const APP_THEMES: AppTheme[] = ["slate", "dusk", "mist", "amber"];

const THEME_COLORS: Record<AppTheme, string> = {
  slate: "#151a21",
  mist: "#161918",
  dusk: "#171420",
  amber: "#1d1913",
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

export function readThemeFromSavedGame(saveKey: string): AppTheme {
  if (typeof window === "undefined") {
    return "slate";
  }

  try {
    const raw = window.localStorage.getItem(saveKey);
    if (!raw) {
      return "slate";
    }

    const parsed = JSON.parse(raw) as { theme?: unknown };
    return normalizeAppTheme(parsed.theme);
  } catch {
    return "slate";
  }
}
