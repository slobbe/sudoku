import type { Metadata } from "next";
import Link from "next/link";
import { ContentPage } from "@/components/ContentPage";
import { Button } from "@/components/ui/button";

const techniques = [
  { slug: "naked-single", title: "Naked Single" },
  { slug: "hidden-single", title: "Hidden Single" },
  { slug: "naked-pairs", title: "Naked Pairs" },
  { slug: "hidden-pairs", title: "Hidden Pairs" },
  { slug: "pointing-pairs", title: "Pointing Pairs" },
  { slug: "box-line-reduction", title: "Box-Line Reduction" },
  { slug: "x-wing", title: "X-Wing" },
  { slug: "swordfish", title: "Swordfish" },
  { slug: "uniqueness", title: "Uniqueness" },
] as const;

export const metadata: Metadata = {
  title: "Techniques",
  description: "Study practical Sudoku solving techniques from beginner singles to advanced fish patterns.",
  alternates: {
    canonical: "/techniques",
  },
};

export default function TechniquesPage() {
  return (
    <ContentPage
      title="Sudoku Techniques"
      description="Use these strategy pages as a progressive roadmap. Start with singles, then move to pair logic, line interactions, and advanced pattern elimination."
    >
      <section className="grid gap-2 sm:grid-cols-2" aria-label="Technique index">
        {techniques.map((technique) => (
          <Button key={technique.slug} asChild variant="outline" className="w-full justify-start">
            <Link href={`/techniques/${technique.slug}`}>{technique.title}</Link>
          </Button>
        ))}
      </section>
    </ContentPage>
  );
}
