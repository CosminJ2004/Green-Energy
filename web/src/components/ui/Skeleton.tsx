import clsx from "clsx";

/** Pulsing placeholder block. */
export function Skeleton({ className, height, width }: { className?: string; height?: number | string; width?: number | string }) {
  return <div aria-hidden className={clsx("animate-pulse rounded-md bg-surface-3", className)} style={{ height, width }} />;
}

/** Placeholder for a chart of the given height (keeps layout stable). */
export function ChartSkeleton({ height = 360, className }: { height?: number; className?: string }) {
  return (
    <div role="status" aria-label="Loading chart" className={clsx("flex w-full items-end gap-1.5 overflow-hidden rounded-md bg-surface-2 p-4", className)} style={{ height }}>
      {Array.from({ length: 24 }, (_, i) => (
        <div key={i} className="flex-1 animate-pulse rounded-t bg-surface-3" style={{ height: `${25 + 55 * Math.sin((Math.PI * (i + 2)) / 28) ** 2}%` }} />
      ))}
    </div>
  );
}

/** A few lines of text placeholder. */
export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={clsx("space-y-2", className)} aria-hidden>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} height={14} width={i === lines - 1 ? "60%" : "100%"} />
      ))}
    </div>
  );
}
