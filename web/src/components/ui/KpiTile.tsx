import clsx from "clsx";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import type { ReactNode } from "react";
import type { Provenance } from "@/lib/api/types";
import { formatNumber } from "@/lib/format";
import { DataProvenanceBadge } from "./Badge";

export interface KpiTileProps {
  label: ReactNode;
  /** Pre-formatted string, or a number formatted with `digits`. */
  value: ReactNode | number;
  digits?: number;
  unit?: string;
  /** Change indicator. `goodWhen` decides colour: up/down/none (neutral). */
  delta?: { value: number; label?: string; unit?: string; digits?: number; goodWhen?: "up" | "down" | "none" };
  hint?: ReactNode;
  /** Colour of the top accent bar (identity, not status). */
  accent?: "solar" | "wind" | "price" | "accent" | "neutral";
  icon?: ReactNode;
  provenance?: Provenance;
  loading?: boolean;
  className?: string;
}

const ACCENT: Record<NonNullable<KpiTileProps["accent"]>, string> = {
  solar: "bg-solar",
  wind: "bg-wind",
  price: "bg-price",
  accent: "bg-accent",
  neutral: "bg-border-strong",
};

/** Big-number tile. Numbers use text tokens; colour only marks identity via the top bar. */
export function KpiTile({ label, value, digits = 0, unit, delta, hint, accent = "neutral", icon, provenance, loading, className }: KpiTileProps) {
  const shown = typeof value === "number" ? formatNumber(value, digits) : value;
  let deltaEl: ReactNode = null;
  if (delta) {
    const dir = delta.value > 0 ? "up" : delta.value < 0 ? "down" : "flat";
    const good = delta.goodWhen === "none" || dir === "flat" ? null : delta.goodWhen === dir;
    const Icon = dir === "up" ? ArrowUpRight : dir === "down" ? ArrowDownRight : Minus;
    const sign = delta.value > 0 ? "+" : delta.value < 0 ? "−" : "±";
    deltaEl = (
      <p className={clsx("mt-1 flex items-center gap-1 text-sm font-medium", good === null ? "text-fg-muted" : good ? "text-good" : "text-bad")}>
        <Icon className="size-4" aria-hidden />
        <span>
          {sign}
          {formatNumber(Math.abs(delta.value), delta.digits ?? 0)}
          {delta.unit ? ` ${delta.unit}` : ""}
        </span>
        {delta.label && <span className="font-normal text-fg-subtle">{delta.label}</span>}
      </p>
    );
  }
  return (
    <div className={clsx("relative overflow-hidden rounded-card border border-border bg-surface p-4 shadow-card sm:p-5", className)}>
      <span className={clsx("absolute inset-x-0 top-0 h-1", ACCENT[accent])} aria-hidden />
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-fg-muted sm:text-base">{label}</p>
        {icon && <span className="text-fg-subtle">{icon}</span>}
      </div>
      {loading ? (
        <div className="mt-2 h-9 w-32 animate-pulse rounded bg-surface-3" aria-label="Loading" />
      ) : (
        <p className="mt-1 text-3xl font-bold tracking-tight text-fg sm:text-4xl">
          {shown}
          {unit && <span className="ml-1.5 text-lg font-semibold text-fg-muted sm:text-xl">{unit}</span>}
        </p>
      )}
      {deltaEl}
      {hint && <p className="mt-1 text-sm text-fg-subtle">{hint}</p>}
      {provenance && (
        <div className="mt-3">
          <DataProvenanceBadge provenance={provenance} compact />
        </div>
      )}
    </div>
  );
}
