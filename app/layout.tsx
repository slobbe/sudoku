import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { NostrAccountProvider } from "@/components/nostr-account-provider";
import { Footer } from "@/components/Footer";
import { NavBar } from "@/components/NavBar";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://slobbe.github.io/sudoku";

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
  themeColor: "#101923",
};

type RootLayoutProps = {
  children: ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" data-theme="slate" data-scroll-lock="off" suppressHydrationWarning>
      <body className="min-h-svh bg-background text-foreground antialiased">
        <NostrAccountProvider>
          <NavBar />
          <div className="mx-auto w-full max-w-5xl">{children}</div>
          <Footer />
        </NostrAccountProvider>
      </body>
    </html>
  );
}
