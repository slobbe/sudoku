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
      <section className="grid gap-6">
        <header className="grid gap-3">
          <h1 className="text-balance text-3xl font-semibold leading-tight tracking-tight md:text-4xl">{title}</h1>
          <p className="max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">{description}</p>
        </header>
        {(ctaHref && ctaLabel) || children ? (
          <div className="grid gap-4">
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
