import type { Metadata } from "next";
import { ContentPage } from "@/components/ContentPage";

export const metadata: Metadata = {
  title: "Evil Sudoku",
  description: "Challenge yourself with evil-level Sudoku puzzles intended for advanced logical play.",
  alternates: {
    canonical: "/evil-sudoku",
  },
};

export default function EvilSudokuPage() {
  return (
    <ContentPage
      title="Evil Sudoku"
      description="This tier pushes deep candidate chains and advanced strategy. In-game, evil routes map to the app's expert generation profile."
      ctaHref="/play?difficulty=evil"
      ctaLabel="Play Evil"
    />
  );
}
