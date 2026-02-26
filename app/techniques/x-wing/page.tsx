import type { Metadata } from "next";
import { TechniqueTemplate } from "@/components/TechniqueTemplate";

export const metadata: Metadata = {
  title: "X-Wing",
  description: "Apply the X-Wing pattern to eliminate candidates across matching row-column pairs.",
  alternates: {
    canonical: "/techniques/x-wing",
  },
};

export default function XWingPage() {
  return (
    <TechniqueTemplate
      title="X-Wing"
      description="An X-Wing forms when a candidate appears in exactly two aligned columns across two rows (or vice versa). This locks placements and removes that candidate elsewhere in those columns or rows."
    />
  );
}
