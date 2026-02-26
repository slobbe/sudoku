import type { Metadata } from "next";
import { ContentPage } from "@/components/ContentPage";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Solver",
  description: "Paste a Sudoku grid and prepare to solve it with future solver tooling.",
  alternates: {
    canonical: "/solver",
  },
};

export default function SolverPage() {
  return (
    <ContentPage
      title="Sudoku Solver"
      description="Solver UI is available as a placeholder in this phase. Paste a puzzle grid string and use the button flow that will power full solving logic next."
    >
      <section className="grid gap-3" aria-label="Solver input">
        <h2 className="text-lg font-semibold">Grid Input</h2>
        <label htmlFor="solver-grid" className="text-sm font-medium text-muted-foreground">
          Enter 81 characters (0 or . for empty cells)
        </label>
        <textarea
          id="solver-grid"
          className="min-h-40 w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
          placeholder="530070000600195000098000060800060003400803001700020006060000280000419005000080079"
        />
        <Button type="button" disabled>
          Solve (Placeholder)
        </Button>
      </section>
    </ContentPage>
  );
}
