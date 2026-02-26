import type { Metadata } from "next";
import { ContentPage } from "@/components/ContentPage";

export const metadata: Metadata = {
  title: "Easy Sudoku",
  description: "Start with approachable Sudoku puzzles that focus on fundamentals and smooth progression.",
  alternates: {
    canonical: "/easy-sudoku",
  },
};

export default function EasySudokuPage() {
  return (
    <ContentPage
      title="Easy Sudoku"
      description="Ideal for warm-up rounds and quick progress. Easy puzzles emphasize straightforward singles and clean early momentum."
      ctaHref="/play?difficulty=easy"
      ctaLabel="Play Easy"
    />
  );
}
