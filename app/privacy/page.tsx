import type { Metadata } from "next";
import { ContentPage } from "@/components/ContentPage";

export const metadata: Metadata = {
  title: "Privacy",
  description: "A simple overview of what this Sudoku app stores, what it does not track, and your control over your data.",
  alternates: {
    canonical: "/privacy",
  },
};

export default function PrivacyPage() {
  return (
    <ContentPage
      title="Privacy"
      description="Your puzzle data stays on your device by default. We keep this simple and only use online features when you ask for them."
    >
      <section className="grid gap-4 text-sm leading-6 text-muted-foreground md:text-base md:leading-7" aria-label="Privacy details">
        <div className="grid gap-1.5">
          <h2 className="text-base font-semibold text-foreground md:text-lg">What we save on your device</h2>
          <p>
            We save your puzzle progress, daily history, statistics, and gameplay settings in your browser so you can continue where you left off.
          </p>
        </div>

        <div className="grid gap-1.5">
          <h2 className="text-base font-semibold text-foreground md:text-lg">What we do not track</h2>
          <p>
            You do not need an app account to play. We do not run ads, and we do not collect gameplay analytics in a central app database.
          </p>
        </div>

        <div className="grid gap-1.5">
          <h2 className="text-base font-semibold text-foreground md:text-lg">Optional backup</h2>
          <p>
            If you use Nostr backup/restore, it only happens when you press those actions. Backup data is encrypted before it is sent to relays.
          </p>
        </div>

        <div className="grid gap-1.5">
          <h2 className="text-base font-semibold text-foreground md:text-lg">Your control</h2>
          <p>
            You can clear local data in your browser at any time, or use Reset local data in Settings. If you back up to public relays, relay operators control how long that data is kept.
          </p>
        </div>

        <div className="grid gap-1.5">
          <h2 className="text-base font-semibold text-foreground md:text-lg">Security reminder</h2>
          <p>
            Keep your device secure and never share private keys or passphrases. Anyone with access to your unlocked browser profile may access local app data.
          </p>
        </div>

      </section>
    </ContentPage>
  );
}
