import type { Metadata } from "next";
import { SudokuApp } from "@/components/sudoku-app";

export const metadata: Metadata = {
  title: "Play",
  description: "Play a focused Sudoku session with quick controls and mobile-friendly interactions.",
  alternates: {
    canonical: "/play",
  },
};

export default function PlayPage() {
  return (
    <>
      <section className="sr-only">
        <h1>Play Sudoku</h1>
        <p>Play Sudoku puzzles with touch-friendly controls and fast puzzle generation.</p>
      </section>
      <SudokuApp entryPoint="puzzle" />
    </>
  );
}
