"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function Footer() {
  const pathname = usePathname();

  if (pathname === "/play") {
    return null;
  }

  return (
    <footer
      className="border-t border-border/70"
      style={{
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <div className="mx-auto flex min-h-16 w-full max-w-7xl items-center justify-center gap-2 px-4 text-sm text-muted-foreground lg:justify-between lg:px-8">
        <p className="hidden text-xs uppercase tracking-[0.16em] text-muted-foreground/80 lg:block">Sudoku PWA</p>
        <div className="flex items-center gap-2">
          <Link href="/privacy" className="inline-flex min-h-11 items-center rounded-md px-3 hover:text-foreground">
            Privacy
          </Link>
          <span aria-hidden="true">|</span>
          <Link href="/contact" className="inline-flex min-h-11 items-center rounded-md px-3 hover:text-foreground">
            Contact
          </Link>
        </div>
      </div>
    </footer>
  );
}
