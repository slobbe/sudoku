import type { Metadata } from "next";
import { ContentPage } from "@/components/ContentPage";

export const metadata: Metadata = {
  title: "How to Play",
  description: "Learn the core Sudoku rules and practical solving workflow for daily play.",
  alternates: {
    canonical: "/how-to-play",
  },
};

export default function HowToPlayPage() {
  return (
    <ContentPage
      title="How to Play Sudoku"
      description="Each row, column, and 3x3 box must contain digits 1 through 9 exactly once. Start with obvious singles, keep notes clean, and iterate from certainty to certainty."
      ctaHref="/play"
      ctaLabel="Start a Puzzle"
    >
      <ol className="grid gap-2 pl-5 text-sm leading-6 text-muted-foreground marker:text-foreground">
        <li>Scan for missing digits in each row and column.</li>
        <li>Use notes to track candidates in uncertain cells.</li>
        <li>Apply elimination patterns until a new single appears.</li>
      </ol>
    </ContentPage>
  );
}
