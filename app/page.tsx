import type { Metadata } from "next";
import Link from "next/link";
import { ContentPage } from "@/components/ContentPage";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: {
    absolute: "Sudoku",
  },
  description: "Play mobile-first Sudoku puzzles, tackle daily challenges, and level up with solving techniques.",
  alternates: {
    canonical: "/",
  },
};

export default function Page() {
  return (
    <ContentPage
      title="Sudoku for Focused Daily Play"
      description="Enjoy fast, touch-friendly Sudoku built for phones first. Jump into instant games, solve the daily puzzle, and improve with practical strategy guides."
      ctaHref="/play"
      ctaLabel="Start Playing"
    >
      <section className="grid gap-3 sm:grid-cols-2" aria-label="Quick routes">
        <Button asChild variant="secondary" className="w-full">
          <Link href="/daily">Daily Challenge</Link>
        </Button>
        <Button asChild variant="outline" className="w-full">
          <Link href="/techniques">Learn Techniques</Link>
        </Button>
      </section>
    </ContentPage>
  );
}
