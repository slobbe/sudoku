"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Menu, Play, UserRound } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNostrAccount } from "@/lib/nostr";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/play", label: "Play" },
  { href: "/daily", label: "Daily" },
] as const;

const mobileMenuLinks = [
  { href: "/play", label: "Play", icon: Play },
  { href: "/daily", label: "Daily", icon: CalendarDays },
  { href: "/profile", label: "Profile", icon: UserRound },
] as const;

function isLinkActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function isIsoDateSegment(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function NavBar() {
  const pathname = usePathname();
  const { name } = useNostrAccount();
  const normalizedPathname = pathname.replace(/\/+$/, "") || "/";
  const pathSegments = normalizedPathname.split("/").filter(Boolean);
  const lastSegment = pathSegments[pathSegments.length - 1] ?? "";
  const previousSegment = pathSegments[pathSegments.length - 2] ?? "";
  const isDailyGameplayRoot = lastSegment === "daily" && previousSegment !== "statistics";
  const isDailyGameplayDate = previousSegment === "daily" && isIsoDateSegment(lastSegment);
  const isGameplayRoute = lastSegment === "play"
    || lastSegment === "puzzle"
    || isDailyGameplayRoot
    || isDailyGameplayDate;
  const profileActive = isLinkActive(pathname, "/profile");
  const playerLabel = name?.trim().length ? name.trim() : "Guest";

  return (
    <header className="sticky top-0 z-40 bg-background/96 backdrop-blur-sm" style={{ paddingTop: "env(safe-area-inset-top)" }}>
      <div className={cn(
        "mx-auto grid w-full max-w-7xl grid-cols-[1fr_auto] items-center px-4 md:grid-cols-[1fr_auto_1fr] lg:px-8",
        isGameplayRoute ? "min-h-10 md:min-h-11" : "min-h-14 md:min-h-16",
      )}>
        <Link
          href="/"
          className={cn(
            "justify-self-start font-heading font-semibold tracking-tight",
            isGameplayRoute ? "text-base md:text-lg" : "text-xl md:text-2xl",
          )}
        >
          Sudoku
        </Link>

        <nav className="hidden justify-self-center md:block" aria-label="Primary navigation">
          <div className="flex items-center gap-1 md:gap-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "inline-flex items-center justify-center px-2 text-sm text-muted-foreground transition-colors md:px-2.5",
                  isGameplayRoute ? "py-0.5 md:py-1" : "py-2",
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

        <div className="flex w-full justify-end justify-self-end">
          <Link
            href="/profile"
            className={cn(
              "hidden items-center justify-center gap-1.5 px-2 text-muted-foreground transition-colors md:inline-flex",
              isGameplayRoute ? "h-7 md:h-8" : "h-9",
              profileActive && "font-semibold text-foreground",
              !profileActive && "hover:text-foreground",
            )}
            aria-label="Profile"
            aria-current={profileActive ? "page" : undefined}
          >
            <UserRound className="h-4 w-4" aria-hidden="true" />
            <span className="max-w-24 truncate text-xs font-medium">{playerLabel}</span>
          </Link>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground md:hidden"
                aria-label="Open navigation menu"
              >
                <Menu className="h-4 w-4" aria-hidden="true" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44 md:hidden">
              {mobileMenuLinks.map((link) => (
                <DropdownMenuItem key={link.href} asChild>
                  <Link
                    href={link.href}
                    className={cn(
                      "inline-flex items-center gap-2",
                      isLinkActive(pathname, link.href) && "font-semibold",
                    )}
                    aria-current={isLinkActive(pathname, link.href) ? "page" : undefined}
                  >
                    <link.icon className="h-4 w-4" aria-hidden="true" />
                    <span className="truncate">{link.href === "/profile" ? playerLabel : link.label}</span>
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <Separator />
    </header>
  );
}
