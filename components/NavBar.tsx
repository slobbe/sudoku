"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/play", label: "Play" },
  { href: "/daily", label: "Daily" },
  { href: "/solver", label: "Solver" },
  { href: "/techniques", label: "Techniques" },
  { href: "/profile", label: "Profile" },
  { href: "/about", label: "About" },
] as const;

function NavItems({ compact = false }: { compact?: boolean }) {
  return (
    <>
      {navLinks.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={cn(
            "inline-flex min-h-11 items-center rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
            compact && "px-2",
          )}
        >
          {link.label}
        </Link>
      ))}
    </>
  );
}

export function NavBar() {
  const pathname = usePathname();
  const isPlayRoute = pathname === "/play";

  return (
    <header
      className={cn("sticky top-0 z-40 border-b border-border/70 bg-background/90 backdrop-blur", isPlayRoute && "border-b-0")}
      style={{
        paddingTop: "env(safe-area-inset-top)",
      }}
    >
      <div className={cn("mx-auto flex w-full max-w-5xl items-center justify-between px-4", isPlayRoute ? "min-h-14" : "min-h-16") }>
        <Link href="/" className="inline-flex min-h-11 items-center text-base font-semibold tracking-tight">
          Sudoku
        </Link>

        {isPlayRoute ? (
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" aria-label="Open menu">
                <Menu className="h-5 w-5" aria-hidden="true" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="pt-10">
              <SheetHeader>
                <SheetTitle>Menu</SheetTitle>
                <SheetDescription>Navigate Sudoku sections.</SheetDescription>
              </SheetHeader>
              <nav className="mt-6 grid gap-2">
                <NavItems compact />
              </nav>
            </SheetContent>
          </Sheet>
        ) : (
          <>
            <nav className="hidden items-center gap-1 md:flex" aria-label="Primary navigation">
              <NavItems />
            </nav>
            <div className="md:hidden">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon" aria-label="Open menu">
                    <Menu className="h-5 w-5" aria-hidden="true" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="pt-10">
                  <SheetHeader>
                    <SheetTitle>Navigate</SheetTitle>
                    <SheetDescription>Browse Sudoku pages and tools.</SheetDescription>
                  </SheetHeader>
                  <nav className="mt-6 grid gap-2">
                    <NavItems />
                  </nav>
                </SheetContent>
              </Sheet>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
