import type { Metadata } from "next";
import { ContentPage } from "@/components/ContentPage";

export const metadata: Metadata = {
  title: "Privacy",
  description: "Privacy details for local game data, optional Nostr integration, and storage behavior.",
  alternates: {
    canonical: "/privacy",
  },
};

export default function PrivacyPage() {
  return (
    <ContentPage
      title="Privacy"
      description="Game progress and stats are stored in your browser. Optional Nostr features only run when explicitly triggered, and no central game account is required."
    />
  );
}
