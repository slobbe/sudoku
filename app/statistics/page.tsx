import type { Metadata } from "next";
import { SudokuApp } from "@/components/sudoku-app";

export const metadata: Metadata = {
  title: "Statistics",
  description: "View Sudoku performance metrics, streaks, and daily history.",
  alternates: {
    canonical: "/statistics",
  },
};

export default function StatisticsPage() {
  return <SudokuApp entryPoint="statistics" />;
}
