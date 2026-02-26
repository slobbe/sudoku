import type { Metadata } from "next";
import { ContentPage } from "@/components/ContentPage";

export const metadata: Metadata = {
  title: "About",
  description: "Learn about the Sudoku PWA and its focus on mobile-first puzzle play.",
  alternates: {
    canonical: "/about",
  },
};

export default function AboutPage() {
  return (
    <ContentPage
      title="About This Sudoku App"
      description="This project is a local-first Sudoku PWA built with Next.js and TypeScript. It is designed for fast daily play on mobile with offline-friendly behavior and deterministic puzzles."
    />
  );
}
