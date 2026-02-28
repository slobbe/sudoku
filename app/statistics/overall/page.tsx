import type { Metadata } from "next";
import { SudokuApp } from "@/components/sudoku-app";

export const metadata: Metadata = {
  title: "Statistics / Overall",
  description: "View overall Sudoku completion and difficulty win rates.",
  alternates: {
    canonical: "/statistics/overall",
  },
};

export default function StatisticsOverallPage() {
  return <SudokuApp entryPoint="statistics" statisticsSection="overall" />;
}
