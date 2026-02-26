import type { Metadata } from "next";
import { TechniqueTemplate } from "@/components/TechniqueTemplate";

export const metadata: Metadata = {
  title: "Uniqueness",
  description: "Use uniqueness logic to avoid deadly patterns and force candidate eliminations.",
  alternates: {
    canonical: "/techniques/uniqueness",
  },
};

export default function UniquenessPage() {
  return (
    <TechniqueTemplate
      title="Uniqueness"
      description="Uniqueness techniques rely on Sudoku's single-solution rule. Spotting potentially ambiguous rectangle patterns can justify safe candidate removals."
    />
  );
}
