import type { Metadata } from "next";
import { NostrProfilePage } from "@/components/nostr-profile-page";
import { AccountSidebar } from "@/components/account-sidebar";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Profile",
  description: "Manage your Nostr profile for shared Sudoku features.",
  alternates: {
    canonical: "/profile",
  },
};

export default function ProfilePage() {
  return (
    <Suspense
      fallback={(
        <main className="app app-panel" aria-label="Profile loading">
          <div className="account-layout">
            <AccountSidebar />

            <section className="panel-view profile-view account-content">
              <div className="settings-header">
                <h2>Profile</h2>
              </div>
              <section className="profile-card" aria-label="Loading profile">
                <p className="profile-status" aria-live="polite">Loading profile...</p>
              </section>
            </section>
          </div>
        </main>
      )}
    >
      <NostrProfilePage />
    </Suspense>
  );
}
