import type { Metadata } from "next";
import { TechniqueTemplate } from "@/components/TechniqueTemplate";

export const metadata: Metadata = {
  title: "Naked Single",
  description: "Use naked singles to place digits when only one candidate remains in a cell.",
  alternates: {
    canonical: "/techniques/naked-single",
  },
};

export default function NakedSinglePage() {
  return (
    <TechniqueTemplate
      title="Naked Single"
      description="A naked single appears when a cell has exactly one legal candidate left. Place it immediately to unlock a fresh round of eliminations across peers."
    />
  );
}
