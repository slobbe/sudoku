import type { Metadata } from "next";
import { TechniqueTemplate } from "@/components/TechniqueTemplate";

export const metadata: Metadata = {
  title: "Naked Pairs",
  description: "Apply naked pairs to remove shared candidates from other cells in a unit.",
  alternates: {
    canonical: "/techniques/naked-pairs",
  },
};

export default function NakedPairsPage() {
  return (
    <TechniqueTemplate
      title="Naked Pairs"
      description="If two cells in one unit contain the same two candidates, those digits must belong there. Eliminate both candidates from all other cells in that unit."
    />
  );
}
