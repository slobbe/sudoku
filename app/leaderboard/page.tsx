import type { Metadata } from "next";
import { ContentPage } from "@/components/ContentPage";

export const metadata: Metadata = {
  title: "Leaderboard",
  description: "Leaderboard is currently a stub route reserved for future competitive rankings.",
  alternates: {
    canonical: "/leaderboard",
  },
};

export default function LeaderboardPage() {
  return (
    <ContentPage
      title="Leaderboard"
      description="This is a lightweight placeholder page for upcoming leaderboard features. Competitive ranking and score-sharing are planned for a future iteration."
    />
  );
}
