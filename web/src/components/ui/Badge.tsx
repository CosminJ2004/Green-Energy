import clsx from "clsx";
import { Database, FlaskConical } from "lucide-react";
import type { ReactNode } from "react";
import type { Provenance } from "@/lib/api/types";

export type BadgeTone = "neutral" | "accent" | "solar" | "wind" | "price" | "good" | "warn" | "bad" | "info" | "synthetic" | "real";

const TONES: Record<BadgeTone, string> = {
  neutral: "bg-surface-2 text-fg-muted border-border",
  accent: "bg-accent-soft text-accent-ink border-transparent",
  solar: "bg-solar-soft text-solar-ink border-transparent",
  wind: "bg-wind-soft text-wind-ink border-transparent",
  price: "bg-price-soft text-price-ink border-transparent",
  good: "bg-good-soft text-good border-transparent",
  warn: "bg-warn-soft text-warn border-transparent",
  bad: "bg-bad-soft text-bad border-transparent",
  info: "bg-info-soft text-info border-transparent",
  synthetic: "bg-synthetic-soft text-synthetic border-synthetic-border",
  real: "bg-real-soft text-real border-real-border",
};

export interface BadgeProps {
  tone?: BadgeTone;
  icon?: ReactNode;
  size?: "sm" | "md";
  title?: string;
  className?: string;
  children: ReactNode;
}

/** Small pill label. Status tones (good/warn/bad) must carry an icon or text, never colour alone. */
export function Badge({ tone = "neutral", icon, size = "sm", title, className, children }: BadgeProps) {
  return (
    <span
      title={title}
      className={clsx(
        "inline-flex max-w-full items-center gap-1.5 whitespace-nowrap rounded-full border font-medium",
        size === "sm" ? "px-2.5 py-0.5 text-xs sm:text-sm" : "px-3 py-1 text-sm sm:text-base",
        TONES[tone],
        className,
      )}
    >
      {icon}
      <span className="truncate">{children}</span>
    </span>
  );
}

export interface DataProvenanceBadgeProps {
  provenance: Provenance;
  /** Overrides the default real-data label (default: "Real data: Energy-Charts.info (CC BY 4.0)"). */
  realLabel?: string;
  /** Short form: "Synthetic" / "Real data". Full label stays in the tooltip. */
  compact?: boolean;
  size?: "sm" | "md";
  className?: string;
}

/** Honest data label. Use on every chart/map/table that shows numbers. */
export function DataProvenanceBadge({ provenance, realLabel, compact, size = "sm", className }: DataProvenanceBadgeProps) {
  const full = provenance === "real" ? (realLabel ?? "Real data: Energy-Charts.info (CC BY 4.0)") : "Synthetic demo data";
  const short = provenance === "real" ? "Real data" : "Synthetic demo data";
  const iconCls = size === "sm" ? "size-3.5" : "size-4";
  return (
    <Badge
      tone={provenance}
      size={size}
      title={full}
      className={className}
      icon={provenance === "real" ? <Database className={iconCls} aria-hidden /> : <FlaskConical className={iconCls} aria-hidden />}
    >
      {compact ? short : full}
    </Badge>
  );
}
