import type { Metadata } from "next";
import { ContentPage } from "@/components/ContentPage";

export const metadata: Metadata = {
  title: "Contact",
  description: "Contact information and issue reporting paths for the Sudoku project.",
  alternates: {
    canonical: "/contact",
  },
};

export default function ContactPage() {
  return (
    <ContentPage
      title="Contact"
      description="For feedback, bugs, or feature ideas, please use the project issue tracker. This route is intentionally lightweight and optimized for mobile loading."
    />
  );
}
