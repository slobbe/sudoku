"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserRound } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useNostrAccount } from "@/lib/nostr";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/play", label: "Play" },
  { href: "/daily", label: "Daily" },
] as const;

function isLinkActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function NavBar() {
  const pathname = usePathname();
  const { name } = useNostrAccount();
  const profileActive = isLinkActive(pathname, "/profile");
  const playerLabel = name?.trim().length ? name.trim() : "Guest";

  return (
    <header className="sticky top-0 z-40 bg-background/96 backdrop-blur-sm" style={{ paddingTop: "env(safe-area-inset-top)" }}>
      <div className="mx-auto grid min-h-14 w-full max-w-7xl grid-cols-[1fr_auto_1fr] items-center px-4 md:min-h-16 lg:px-8">
        <Link href="/" className="justify-self-start font-heading text-xl font-semibold tracking-tight md:text-2xl">
          Sudoku
        </Link>

        <nav className="justify-self-center" aria-label="Primary navigation">
          <div className="flex items-center gap-1 md:gap-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "inline-flex items-center justify-center px-2 py-2 text-sm text-muted-foreground transition-colors md:px-2.5",
                  isLinkActive(pathname, link.href) && "font-semibold text-foreground",
                  !isLinkActive(pathname, link.href) && "hover:text-foreground",
                )}
                aria-current={isLinkActive(pathname, link.href) ? "page" : undefined}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </nav>

        <Link
          href="/profile"
          className={cn(
            "inline-flex h-9 items-center justify-center justify-self-end gap-1.5 px-2 text-muted-foreground transition-colors",
            profileActive && "font-semibold text-foreground",
            !profileActive && "hover:text-foreground",
          )}
          aria-label="Profile"
          aria-current={profileActive ? "page" : undefined}
        >
          <UserRound className="h-4 w-4" aria-hidden="true" />
          <span className="max-w-24 truncate text-xs font-medium">{playerLabel}</span>
        </Link>
      </div>
      <Separator />
    </header>
  );
}
