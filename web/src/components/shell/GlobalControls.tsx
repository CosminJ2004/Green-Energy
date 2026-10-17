"use client";

import clsx from "clsx";
import { ChevronLeft, ChevronRight, Sun, Wind } from "lucide-react";
import { Segmented } from "@/components/ui/Tabs";
import { useAppState, type SourceSelection } from "@/lib/state";
import { addDays, formatDateKey } from "@/lib/time";

const SOURCE_OPTIONS: { value: SourceSelection; label: string; icon: React.ReactNode }[] = [
  { value: "solar", label: "Solar", icon: <Sun className="size-4 text-solar-ink" aria-hidden /> },
  { value: "wind", label: "Wind", icon: <Wind className="size-4 text-wind-ink" aria-hidden /> },
  { value: "both", label: "Both", icon: null },
];

/** Energy source toggle + forecast issue date picker (state lives in the URL via useAppState). */
export function GlobalControls({ className }: { className?: string }) {
  const { source, setSource, issueDate, setIssueDate, shiftIssueDate, isToday, today } = useAppState();
  const btn = "inline-flex size-9 items-center justify-center rounded-md border border-border bg-surface text-fg-muted hover:bg-surface-2 hover:text-fg";
  return (
    <div className={clsx("flex flex-wrap items-center gap-x-4 gap-y-2", className)}>
      <Segmented options={SOURCE_OPTIONS} value={source} onChange={setSource} ariaLabel="Energy source" size="sm" />
      <div className="flex items-center gap-1.5">
        <label htmlFor="issue-date" className="mr-1 text-sm font-medium text-fg-muted">
          Issued
        </label>
        <button type="button" className={btn} onClick={() => shiftIssueDate(-1)} aria-label="Previous issue date">
          <ChevronLeft className="size-4" aria-hidden />
        </button>
        <input
          id="issue-date"
          type="date"
          value={issueDate}
          max={addDays(today, 7)}
          onChange={(e) => e.target.value && setIssueDate(e.target.value)}
          className="h-9 rounded-md border border-border bg-surface px-2 text-sm font-medium text-fg"
        />
        <button type="button" className={btn} onClick={() => shiftIssueDate(1)} aria-label="Next issue date">
          <ChevronRight className="size-4" aria-hidden />
        </button>
        {!isToday && (
          <button type="button" onClick={() => setIssueDate(today)} className="ml-1 rounded-md px-2 py-1 text-sm font-medium text-accent-ink hover:bg-accent-soft">
            Today
          </button>
        )}
      </div>
      <p className="text-sm text-fg-subtle">
        Forecast for <span className="font-medium text-fg-muted">{formatDateKey(addDays(issueDate, 1))}</span> –{" "}
        <span className="font-medium text-fg-muted">{formatDateKey(addDays(issueDate, 2))}</span> (Bucharest time)
      </p>
    </div>
  );
}
