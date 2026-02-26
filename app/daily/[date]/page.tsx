import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SudokuApp } from "@/components/sudoku-app";

type DailyDatePageProps = {
  params: Promise<{
    date: string;
  }>;
};

function isValidDateKey(value: string): boolean {
  if (!/^(\d{4})-(\d{2})-(\d{2})$/.test(value)) {
    return false;
  }

  const [yearPart, monthPart, dayPart] = value.split("-");
  const year = Number(yearPart);
  const month = Number(monthPart);
  const day = Number(dayPart);
  const candidate = new Date(Date.UTC(year, month - 1, day));

  return Number.isFinite(candidate.getTime())
    && candidate.getUTCFullYear() === year
    && candidate.getUTCMonth() === month - 1
    && candidate.getUTCDate() === day;
}

export async function generateMetadata({ params }: DailyDatePageProps): Promise<Metadata> {
  const { date } = await params;
  return {
    title: `Daily ${date}`,
    description: `Solve the deterministic Sudoku challenge for ${date}.`,
    alternates: {
      canonical: `/daily/${date}`,
    },
  };
}

export default async function DailyDatePage({ params }: DailyDatePageProps) {
  const { date } = await params;

  if (!isValidDateKey(date)) {
    notFound();
  }

  return (
    <>
      <section className="sr-only">
        <h1>Daily Sudoku {date}</h1>
        <p>Play the daily Sudoku puzzle for {date}.</p>
      </section>
      <SudokuApp entryPoint="daily" dailyDateKey={date} />
    </>
  );
}
