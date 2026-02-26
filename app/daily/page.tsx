import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { ContentPage } from "@/components/ContentPage";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Daily",
  description: "Play the daily Sudoku challenge and revisit recent dates from the archive.",
  alternates: {
    canonical: "/daily",
  },
};

function getCurrentDateForTimezone(timeZone: string): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  } catch {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "UTC",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  }
}

export default async function DailyPage() {
  const headerStore = await headers();
  const timeZone = headerStore.get("x-vercel-ip-timezone")
    ?? headerStore.get("x-time-zone")
    ?? "UTC";
  const dateKey = getCurrentDateForTimezone(timeZone);

  return (
    <ContentPage
      title="Daily Sudoku Challenge"
      description="Take on a deterministic puzzle for the current day. Your streak is easiest to keep when you play from the same timezone each day."
      ctaHref={`/daily/${dateKey}`}
      ctaLabel="Play today's puzzle"
    >
      <Button asChild variant="outline" className="w-full sm:w-auto">
        <Link href="/daily/archive">Browse archive</Link>
      </Button>
    </ContentPage>
  );
}
