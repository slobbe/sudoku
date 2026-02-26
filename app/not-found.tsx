import { PageShell } from "@/components/PageShell";

export default function NotFound() {
  return (
    <PageShell>
      <section className="grid gap-3" aria-label="Page not found">
        <h1 className="text-3xl font-semibold">Page not found</h1>
        <p className="text-base text-muted-foreground">The route does not exist in this Sudoku sitemap.</p>
      </section>
    </PageShell>
  );
}
