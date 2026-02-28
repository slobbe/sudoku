import type { Metadata } from "next";
import { SudokuApp } from "@/components/sudoku-app";

export const metadata: Metadata = {
  title: "Daily",
  description: "Open today's daily Sudoku puzzle instantly and switch to any earlier date.",
  alternates: {
    canonical: "/daily",
  },
};

export default function DailyPage() {
  return (
    <>
      <section className="sr-only">
        <h1>Daily Sudoku</h1>
        <p>Play today&apos;s daily Sudoku puzzle and use the date picker to load any past challenge.</p>
      </section>
      <SudokuApp entryPoint="daily" />
    </>
  );
}
