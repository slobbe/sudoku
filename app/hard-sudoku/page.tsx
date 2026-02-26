import type { Metadata } from "next";
import { ContentPage } from "@/components/ContentPage";

export const metadata: Metadata = {
  title: "Hard Sudoku",
  description: "Tackle hard Sudoku grids that reward patience, notation discipline, and precise elimination.",
  alternates: {
    canonical: "/hard-sudoku",
  },
};

export default function HardSudokuPage() {
  return (
    <ContentPage
      title="Hard Sudoku"
      description="Hard puzzles raise the pressure with denser candidate webs. Expect to combine multiple techniques before each breakthrough."
      ctaHref="/play?difficulty=hard"
      ctaLabel="Play Hard"
    />
  );
}
