import { NostrIdentityPage } from "@/components/nostr-identity-page";
import { Suspense } from "react";

export default function IdentityPage() {
  return (
    <Suspense fallback={<main className="app app-panel">Loading identity...</main>}>
      <NostrIdentityPage />
    </Suspense>
  );
}
