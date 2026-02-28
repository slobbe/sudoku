import type { Metadata } from "next";
import Link from "next/link";
import { ContentPage } from "@/components/ContentPage";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: {
    absolute: "Sudoku",
  },
  description: "Play mobile-first Sudoku puzzles and tackle daily challenges with a calm, focused gameplay experience.",
  alternates: {
    canonical: "/",
  },
};

export default function Page() {
  return (
    <ContentPage
      title="Sudoku for Focused Daily Play"
      description="Enjoy fast, touch-friendly Sudoku built for phones first. Jump into instant games, solve the daily puzzle, and track your progress over time."
    >
      <section className="grid gap-3 sm:grid-cols-2" aria-label="Quick routes">
        <Button asChild className="w-full">
          <Link href="/play">Start puzzle</Link>
        </Button>
        <Button asChild variant="secondary" className="w-full">
          <Link href="/daily">Daily Challenge</Link>
        </Button>
      </section>
    </ContentPage>
  );
}
