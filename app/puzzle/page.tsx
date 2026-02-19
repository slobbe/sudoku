import type { Metadata } from "next";
import { SudokuApp } from "@/components/sudoku-app";

export const metadata: Metadata = {
  title: "Puzzle",
  description: "Jump directly into your current Sudoku puzzle or start a new one.",
};

export default function PuzzlePage() {
  return <SudokuApp entryPoint="puzzle" />;
}
