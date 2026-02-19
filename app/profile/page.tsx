import type { Metadata } from "next";
import { NostrProfilePage } from "@/components/nostr-profile-page";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Profile",
  description: "Manage your Nostr profile for shared Sudoku features.",
};

export default function ProfilePage() {
  return (
    <Suspense
      fallback={(
        <main className="app app-panel" aria-label="Profile loading">
          <section className="panel-view profile-view">
            <div className="settings-header">
              <h2>Profile</h2>
              <button type="button" disabled>Home</button>
            </div>
            <section className="profile-card" aria-label="Loading profile">
              <p className="profile-status" aria-live="polite">Loading profile...</p>
            </section>
          </section>
        </main>
      )}
    >
      <NostrProfilePage />
    </Suspense>
  );
}
