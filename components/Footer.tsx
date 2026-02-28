"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Laptop, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { Toggle } from "@/components/ui/toggle";
import { APP_VERSION } from "@/lib/app-version";
import {
  applyThemeToDocument,
  applyThemePreferenceToDocument,
  normalizeAppTheme,
  persistThemeToSavedGame,
  readThemePreferenceFromSavedGame,
  type AppTheme,
  type AppThemePreference,
} from "@/lib/theme";

const GITHUB_PROFILE_URL = "https://github.com/slobbe";
const GITHUB_REPO_URL = "https://github.com/slobbe/sudoku";
const GITHUB_LICENSE_URL = "https://github.com/slobbe/sudoku/blob/main/LICENSE";

const footerLinks = [
  { href: "/privacy", label: "Privacy" },
] as const;

export function Footer() {
  const pathname = usePathname();
  const [themePreference, setThemePreference] = useState<AppThemePreference>("system");
  const [resolvedTheme, setResolvedTheme] = useState<AppTheme>("light");

  useEffect(() => {
    let cancelled = false;
    void readThemePreferenceFromSavedGame().then((savedPreference) => {
      if (cancelled) {
        return;
      }

      setThemePreference(savedPreference);
      const nextResolvedTheme = applyThemePreferenceToDocument(savedPreference);
      setResolvedTheme(nextResolvedTheme);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const observer = new MutationObserver(() => {
      const nextTheme = normalizeAppTheme(root.dataset.theme);
      setResolvedTheme(nextTheme);
    });

    observer.observe(root, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || themePreference !== "system" || typeof window.matchMedia !== "function") {
      return;
    }

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const syncSystemTheme = () => {
      const nextTheme: AppTheme = mediaQuery.matches ? "dark" : "light";
      setResolvedTheme(nextTheme);
      applyThemeToDocument(nextTheme);
    };

    syncSystemTheme();

    mediaQuery.addEventListener("change", syncSystemTheme);
    return () => {
      mediaQuery.removeEventListener("change", syncSystemTheme);
    };
  }, [themePreference]);

  const toggleTheme = () => {
    const nextPreference: AppThemePreference = themePreference === "system"
      ? "light"
      : themePreference === "light"
        ? "dark"
        : "system";

    setThemePreference(nextPreference);
    const nextResolvedTheme = applyThemePreferenceToDocument(nextPreference);
    setResolvedTheme(nextResolvedTheme);
    void persistThemeToSavedGame(nextPreference);
  };

  const themeToggleLabel = themePreference === "system"
    ? "Theme: system"
    : themePreference === "dark"
      ? "Theme: dark"
      : "Theme: light";

  return (
    <footer className="border-t border-border/80" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
      <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-3 px-4 py-3 text-xs text-muted-foreground md:grid-cols-[1fr_auto_1fr] md:items-center lg:px-8">
        <div className="order-3 md:order-1">
          <p className="text-center tracking-wide md:text-left">v{APP_VERSION}</p>
        </div>

        <div className="order-2 grid gap-0.5 text-center md:order-2">
          <p>
            Made with 💜 by
            {" "}
            <a href={GITHUB_PROFILE_URL} target="_blank" rel="noreferrer" className="hover:text-foreground">
              slobbe
            </a>
          </p>
          <p>
            <a href={GITHUB_REPO_URL} target="_blank" rel="noreferrer" className="hover:text-foreground">
              Open Source
            </a>
            {" "}
            under
            {" "}
            <a href={GITHUB_LICENSE_URL} target="_blank" rel="noreferrer" className="hover:text-foreground">
              MIT License
            </a>
          </p>
        </div>

        <div className="order-1 flex items-center justify-center gap-3 md:order-3 md:justify-end">
          {footerLinks.map((link, index) => (
            <div key={link.href} className="flex items-center gap-3">
              {index > 0 ? <span aria-hidden="true">/</span> : null}
              <Link href={link.href} className={pathname === link.href ? "text-foreground" : "hover:text-foreground"}>
                {link.label}
              </Link>
            </div>
          ))}
          <Toggle
            variant="default"
            size="sm"
            aria-label={themeToggleLabel}
            title={themeToggleLabel}
            pressed={resolvedTheme === "dark"}
            onPressedChange={toggleTheme}
            className="h-8 w-8 border-0 bg-transparent p-0 hover:bg-transparent data-[state=on]:bg-transparent"
          >
            {themePreference === "system" ? (
              <Laptop className="h-3.5 w-3.5" aria-hidden="true" />
            ) : themePreference === "dark" ? (
              <Sun className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <Moon className="h-3.5 w-3.5" aria-hidden="true" />
            )}
          </Toggle>
        </div>
      </div>
    </footer>
  );
}
