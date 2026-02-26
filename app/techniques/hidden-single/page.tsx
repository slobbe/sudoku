import type { Metadata } from "next";
import { TechniqueTemplate } from "@/components/TechniqueTemplate";

export const metadata: Metadata = {
  title: "Hidden Single",
  description: "Identify hidden singles when a candidate appears in only one cell of a unit.",
  alternates: {
    canonical: "/techniques/hidden-single",
  },
};

export default function HiddenSinglePage() {
  return (
    <TechniqueTemplate
      title="Hidden Single"
      description="Even when a cell has multiple notes, one candidate may be unique in its row, column, or box. That uniqueness forces the placement."
    />
  );
}
