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
  const todayStart = useMemo(() => {
    const value = new Date();
    value.setHours(0, 0, 0, 0);
    return value;
  }, []);

  const [selected, setSelected] = useState<Date | undefined>(undefined);

  return (
    <section className="grid gap-3" aria-label="Daily archive calendar">
      <h2 className="text-lg font-semibold">Pick a past day</h2>
      <p className="text-sm text-muted-foreground">Select any earlier date to open that daily Sudoku puzzle.</p>
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
        disabled={(date) => date >= todayStart}
        className="w-fit rounded-lg border border-border/60 bg-background/50"
      />
    </section>
  );
}
