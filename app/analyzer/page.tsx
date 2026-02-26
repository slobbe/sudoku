import type { Metadata } from "next";
import { ContentPage } from "@/components/ContentPage";

export const metadata: Metadata = {
  title: "Analyzer",
  description: "Review Sudoku positions and strategy opportunities with analysis-focused tooling.",
  alternates: {
    canonical: "/analyzer",
  },
};

export default function AnalyzerPage() {
  return (
    <ContentPage
      title="Sudoku Analyzer"
      description="Analyzer tools are stubbed in this iteration. This page reserves a focused place for candidate diagnostics, mistake review, and strategy tracing."
    />
  );
}
