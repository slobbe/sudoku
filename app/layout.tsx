import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { NostrAccountProvider } from "@/components/nostr-account-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sudoku PWA",
  description: "Offline-capable Sudoku puzzle with three difficulties and hints.",
  manifest: "./manifest.webmanifest",
  appleWebApp: {
    title: "Sudoku",
    capable: true,
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "./icons/icon-192.svg", type: "image/svg+xml" },
      { url: "./icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "./icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "./icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#151a21",
};

type RootLayoutProps = {
  children: ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" data-theme="slate" data-scroll-lock="on" suppressHydrationWarning>
      <body>
        <NostrAccountProvider>{children}</NostrAccountProvider>
      </body>
    </html>
  );
}
