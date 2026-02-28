import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { NostrAccountProvider } from "@/components/nostr-account-provider";
import { Footer } from "@/components/Footer";
import { NavBar } from "@/components/NavBar";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://slobbe.github.io/sudoku";
const themeBootScript = `(() => {
  try {
    const key = "sudoku-theme-preference";
    const raw = window.localStorage.getItem(key);
    const theme = raw === "dark" || raw === "dusk" || raw === "slate" || raw === "mist" || raw === "amber" || raw === "purple"
      ? "dark"
      : "light";
    document.documentElement.dataset.theme = theme;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute("content", theme === "dark" ? "#141311" : "#f5f1e8");
    }
  } catch {
    document.documentElement.dataset.theme = "light";
  }
})();`;

export const metadata: Metadata = {
  title: {
    default: "Sudoku",
    template: "%s | Sudoku",
  },
  metadataBase: new URL(siteUrl),
  description: "Offline-capable Sudoku puzzle with daily challenge, notes, and hints.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    title: "Sudoku",
    capable: true,
    statusBarStyle: "default",
  },
  icons: {
    shortcut: "/favicon.svg",
    icon: [
      { url: "/icons/icon-192.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f5f1e8",
};

type RootLayoutProps = {
  children: ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" data-theme="light" data-scroll-lock="off" suppressHydrationWarning>
      <body className="font-ui flex min-h-svh flex-col bg-background text-foreground antialiased">
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
        <NostrAccountProvider>
          <NavBar />
          <div className="mx-auto w-full max-w-7xl flex-1">{children}</div>
          <Footer />
        </NostrAccountProvider>
      </body>
    </html>
  );
}
