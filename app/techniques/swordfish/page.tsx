import type { Metadata } from "next";
import { TechniqueTemplate } from "@/components/TechniqueTemplate";

export const metadata: Metadata = {
  title: "Swordfish",
  description: "Use Swordfish to remove candidates through three-row or three-column pattern alignment.",
  alternates: {
    canonical: "/techniques/swordfish",
  },
};

export default function SwordfishPage() {
  return (
    <TechniqueTemplate
      title="Swordfish"
      description="Swordfish extends the X-Wing idea to three rows and three columns. When candidate positions align in this pattern, eliminations follow across the corresponding lines."
    />
  );
}
