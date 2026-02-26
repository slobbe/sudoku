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
      <div className="mx-auto flex min-h-16 w-full max-w-5xl items-center justify-center gap-2 px-4 text-sm text-muted-foreground">
        <Link href="/privacy" className="inline-flex min-h-11 items-center rounded-md px-3 hover:text-foreground">
          Privacy
        </Link>
        <span aria-hidden="true">|</span>
        <Link href="/contact" className="inline-flex min-h-11 items-center rounded-md px-3 hover:text-foreground">
          Contact
        </Link>
      </div>
    </footer>
  );
}
