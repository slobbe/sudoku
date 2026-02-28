import type { Metadata } from "next";
import { SudokuApp } from "@/components/sudoku-app";

export const metadata: Metadata = {
  title: "Statistics / Daily",
  description: "View Daily Challenge completion stats, streaks, and monthly history.",
  alternates: {
    canonical: "/statistics/daily",
  },
};

export default function StatisticsDailyPage() {
  return (
    <>
      <section className="sr-only">
        <h1>Daily Statistics</h1>
        <p>Track daily challenge results, streaks, and monthly performance.</p>
      </section>
      <SudokuApp entryPoint="statistics" statisticsSection="daily" />
    </>
  );
}
