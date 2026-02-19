import type { Metadata } from "next";
import { SudokuApp } from "@/components/sudoku-app";

export const metadata: Metadata = {
  title: "Daily Puzzle",
  description: "Solve today's shared Sudoku puzzle and track your daily streak.",
};

export default function DailyPage() {
  return <SudokuApp entryPoint="daily" />;
}
