import type { Metadata } from "next";
import { TechniqueTemplate } from "@/components/TechniqueTemplate";

export const metadata: Metadata = {
  title: "Hidden Pairs",
  description: "Use hidden pairs to isolate two digits that only fit in two specific cells.",
  alternates: {
    canonical: "/techniques/hidden-pairs",
  },
};

export default function HiddenPairsPage() {
  return (
    <TechniqueTemplate
      title="Hidden Pairs"
      description="When two digits each appear in exactly the same two cells of a unit, those cells can be reduced to that pair, removing extra notes."
    />
  );
}
