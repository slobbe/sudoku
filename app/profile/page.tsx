import type { Metadata } from "next";
import { NostrProfilePage } from "@/components/nostr-profile-page";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Profile",
  description: "Manage your Nostr profile for shared Sudoku features.",
};

export default function ProfilePage() {
  return (
    <Suspense fallback={<main className="app app-panel">Loading profile...</main>}>
      <NostrProfilePage />
    </Suspense>
  );
}
