import clsx from "clsx";
import type { ReactNode } from "react";

export type LegendSwatch = "line" | "dashed" | "dotted" | "band" | "dot" | "square" | "bar";

export interface LegendItem {
  label: ReactNode;
  /** Concrete colour (from useThemeColors) or a CSS var, e.g. "var(--solar)". */
  color: string;
  kind?: LegendSwatch;
  description?: ReactNode;
}

/** Chart/map legend. Always render one for >= 2 series; label text stays in text colours. */
export function Legend({ items, className, direction = "row" }: { items: LegendItem[]; className?: string; direction?: "row" | "column" }) {
  return (
    <ul className={clsx("flex gap-x-5 gap-y-2 text-sm text-fg-muted sm:text-base", direction === "row" ? "flex-wrap items-center" : "flex-col", className)}>
      {items.map((it, i) => (
        <li key={i} className="flex items-center gap-2">
          <Swatch color={it.color} kind={it.kind ?? "line"} />
          <span>
            <span className="text-fg">{it.label}</span>
            {it.description && <span className="ml-1 text-fg-subtle">{it.description}</span>}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function Swatch({ color, kind = "line" }: { color: string; kind?: LegendSwatch }) {
  const common = "inline-block shrink-0";
  switch (kind) {
    case "band":
      return <span className={clsx(common, "h-3.5 w-6 rounded-sm")} style={{ background: color }} aria-hidden />;
    case "dot":
      return <span className={clsx(common, "size-3 rounded-full")} style={{ background: color }} aria-hidden />;
    case "square":
    case "bar":
      return <span className={clsx(common, "size-3.5 rounded-[3px]")} style={{ background: color }} aria-hidden />;
    case "dashed":
      return <span className={clsx(common, "w-6 border-t-[3px] border-dashed")} style={{ borderColor: color }} aria-hidden />;
    case "dotted":
      return <span className={clsx(common, "w-6 border-t-[3px] border-dotted")} style={{ borderColor: color }} aria-hidden />;
    default:
      return <span className={clsx(common, "h-[3px] w-6 rounded-full")} style={{ background: color }} aria-hidden />;
  }
}
