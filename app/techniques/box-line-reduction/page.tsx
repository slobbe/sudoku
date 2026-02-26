import type { Metadata } from "next";
import { TechniqueTemplate } from "@/components/TechniqueTemplate";

export const metadata: Metadata = {
  title: "Box-Line Reduction",
  description: "Use box-line reduction to remove candidates from a box based on row or column constraints.",
  alternates: {
    canonical: "/techniques/box-line-reduction",
  },
};

export default function BoxLineReductionPage() {
  return (
    <TechniqueTemplate
      title="Box-Line Reduction"
      description="When all possible cells for a digit in a row or column fall inside one box, eliminate that digit from the remaining cells in the same box."
    />
  );
}
