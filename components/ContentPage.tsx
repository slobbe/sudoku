import Link from "next/link";
import type { ReactNode } from "react";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";

type ContentPageProps = {
  title: string;
  description: string;
  ctaHref?: string;
  ctaLabel?: string;
  children?: ReactNode;
};

export function ContentPage({ title, description, ctaHref, ctaLabel, children }: ContentPageProps) {
  return (
    <PageShell>
      <section className="grid gap-6 md:gap-8">
        <header className="grid gap-4">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Sudoku Journal</p>
          <h1 className="font-heading text-balance text-4xl font-semibold leading-tight md:text-5xl xl:text-6xl">
            {title}
          </h1>
          <p className="max-w-3xl text-base leading-7 text-muted-foreground md:text-lg md:leading-8">{description}</p>
        </header>
        {(ctaHref && ctaLabel) || children ? (
          <div className="grid gap-5 py-1">
            {ctaHref && ctaLabel ? (
              <Button asChild className="w-full sm:w-auto">
                <Link href={ctaHref}>{ctaLabel}</Link>
              </Button>
            ) : null}
            {children}
          </div>
        ) : null}
      </section>
    </PageShell>
  );
}
