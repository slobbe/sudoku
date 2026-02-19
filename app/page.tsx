import type { Metadata } from "next";
import { SudokuApp } from "@/components/sudoku-app";

export const metadata: Metadata = {
  title: {
    absolute: "Sudoku",
  },
  description: "Play Sudoku puzzles with notes, hints, and adjustable challenge settings.",
};

export default function Page() {
  return <SudokuApp />;
}
