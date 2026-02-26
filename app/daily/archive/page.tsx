import type { Metadata } from "next";
import { ContentPage } from "@/components/ContentPage";

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
      description="Archive browsing is available as a lightweight placeholder in this phase. Use direct dates under /daily/YYYY-MM-DD to replay specific daily puzzles."
    />
  );
}
