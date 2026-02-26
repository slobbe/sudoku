"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Calendar } from "@/components/ui/calendar";

function toDateKey(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function DailyArchiveCalendar() {
  const router = useRouter();
  const today = useMemo(() => {
    const value = new Date();
    value.setHours(23, 59, 59, 999);
    return value;
  }, []);

  const [selected, setSelected] = useState<Date | undefined>(new Date());

  return (
    <section className="grid gap-3" aria-label="Daily archive calendar">
      <h2 className="text-lg font-semibold">Pick a day</h2>
      <p className="text-sm text-muted-foreground">Tap a date to open that day's daily Sudoku puzzle.</p>
      <Calendar
        mode="single"
        selected={selected}
        onSelect={(date) => {
          setSelected(date);
          if (!date) {
            return;
          }

          router.push(`/daily/${toDateKey(date)}`);
        }}
        disabled={{ after: today }}
        className="w-fit rounded-lg border border-border/60 bg-background/50"
      />
    </section>
  );
}
