import type { Metadata } from "next";
import { NostrIdentityPage } from "@/components/nostr-identity-page";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Identity",
  description: "Manage your Nostr identity for shared Sudoku features.",
};

export default function IdentityPage() {
  return (
    <Suspense fallback={<main className="app app-panel">Loading identity...</main>}>
      <NostrIdentityPage />
    </Suspense>
  );
}
