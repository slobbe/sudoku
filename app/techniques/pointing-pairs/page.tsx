import type { Metadata } from "next";
import { TechniqueTemplate } from "@/components/TechniqueTemplate";

export const metadata: Metadata = {
  title: "Pointing Pairs",
  description: "Leverage pointing pairs to eliminate candidates from rows or columns outside a box.",
  alternates: {
    canonical: "/techniques/pointing-pairs",
  },
};

export default function PointingPairsPage() {
  return (
    <TechniqueTemplate
      title="Pointing Pairs"
      description="If all candidates for a digit inside a 3x3 box lie on one row or column, that digit can be removed from the rest of that row or column outside the box."
    />
  );
}
