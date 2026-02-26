import type { Metadata } from "next";
import { ContentPage } from "@/components/ContentPage";

export const metadata: Metadata = {
  title: "Medium Sudoku",
  description: "Play balanced Sudoku puzzles with a mix of accessibility and deeper deduction steps.",
  alternates: {
    canonical: "/medium-sudoku",
  },
};

export default function MediumSudokuPage() {
  return (
    <ContentPage
      title="Medium Sudoku"
      description="A practical everyday difficulty. Medium boards introduce tighter candidate management while staying fast on mobile play sessions."
      ctaHref="/play?difficulty=medium"
      ctaLabel="Play Medium"
    />
  );
}
