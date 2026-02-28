"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { Toggle } from "@/components/ui/toggle";
import { APP_VERSION } from "@/lib/app-version";
import {
  applyThemeToDocument,
  normalizeAppTheme,
  persistThemeToSavedGame,
  readThemeFromSavedGame,
  type AppTheme,
} from "@/lib/theme";

const GITHUB_PROFILE_URL = "https://github.com/slobbe";
const GITHUB_REPO_URL = "https://github.com/slobbe/sudoku";
const GITHUB_LICENSE_URL = "https://github.com/slobbe/sudoku/blob/main/LICENSE";

const footerLinks = [
  { href: "/privacy", label: "Privacy" },
] as const;

export function Footer() {
  const pathname = usePathname();
  const [theme, setTheme] = useState<AppTheme>("light");

  useEffect(() => {
    let cancelled = false;
    void readThemeFromSavedGame().then((savedTheme) => {
      if (cancelled) {
        return;
      }

      setTheme(savedTheme);
      applyThemeToDocument(savedTheme);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const observer = new MutationObserver(() => {
      const nextTheme = normalizeAppTheme(root.dataset.theme);
      setTheme(nextTheme);
    });

    observer.observe(root, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  const isDark = theme === "dark";

  const toggleTheme = () => {
    const nextTheme: AppTheme = isDark ? "light" : "dark";
    setTheme(nextTheme);
    applyThemeToDocument(nextTheme);
    void persistThemeToSavedGame(nextTheme);
  };

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
            aria-label="Toggle theme"
            pressed={isDark}
            onPressedChange={toggleTheme}
            className="h-8 w-8 border-0 bg-transparent p-0 hover:bg-transparent data-[state=on]:bg-transparent"
          >
            {isDark ? <Sun className="h-3.5 w-3.5" aria-hidden="true" /> : <Moon className="h-3.5 w-3.5" aria-hidden="true" />}
          </Toggle>
        </div>
      </div>
    </footer>
  );
}
