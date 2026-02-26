import type { Metadata } from "next";
import { ContentPage } from "@/components/ContentPage";
import { DailyArchiveCalendar } from "@/components/DailyArchiveCalendar";

export const metadata: Metadata = {
  title: "Daily Archive",
  description: "Browse previously published daily Sudoku dates and replay the challenge.",
  alternates: {
    canonical: "/daily/archive",
  },
};

export default function DailyArchivePage() {
  return (
    <ContentPage
      title="Daily Puzzle Archive"
      description="Browse previous daily Sudoku puzzles by date. Select any day to jump directly into that archive challenge."
    >
      <DailyArchiveCalendar />
    </ContentPage>
  );
}
