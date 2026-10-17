"use client";

/**
 * Recharts helpers: themed tooltip content and axis/grid props.
 *
 *   const ct = useChartTheme();
 *   <CartesianGrid {...ct.grid} />
 *   <XAxis dataKey="time" {...ct.xAxis} tickFormatter={formatLocalTime} />
 *   <YAxis {...ct.yAxis} unit=" MW" />
 *   <Tooltip content={<ChartTooltip unit="MW" labelFormatter={formatLocalDateTime} />} cursor={ct.cursor} />
 */

import type { ReactNode } from "react";
import { formatNumber } from "@/lib/format";
import { useThemeColors, type ThemeColors } from "@/lib/theme";

export function chartTheme(c: ThemeColors) {
  const tick = { fill: c.fgSubtle, fontSize: 14 };
  return {
    colors: c,
    grid: { stroke: c.grid, strokeDasharray: "0", vertical: false },
    xAxis: { stroke: c.axis, tick, tickLine: false, axisLine: { stroke: c.axis }, minTickGap: 24 },
    yAxis: { stroke: c.axis, tick, tickLine: false, axisLine: false, width: 64 },
    cursor: { stroke: c.borderStrong, strokeWidth: 1.5, strokeDasharray: "4 4" },
    barCursor: { fill: c.surface3, opacity: 0.6 },
    referenceLine: { stroke: c.borderStrong, strokeDasharray: "4 4" },
    /** Standard series stroke width (2px lines per dataviz guidance; 3px for the hero line). */
    strokeWidth: 2,
    heroStrokeWidth: 3,
  };
}

export type ChartTheme = ReturnType<typeof chartTheme>;

/** Theme-aware Recharts props; re-renders when the theme changes. */
export function useChartTheme(): ChartTheme {
  return chartTheme(useThemeColors());
}

interface TooltipEntry {
  name?: string | number;
  value?: unknown;
  color?: string;
  stroke?: string;
  fill?: string;
  dataKey?: unknown;
  unit?: ReactNode;
  payload?: unknown;
}

export interface ChartTooltipProps {
  // Injected by Recharts:
  active?: boolean;
  payload?: readonly TooltipEntry[];
  label?: string | number;
  // Ours:
  unit?: string;
  digits?: number;
  labelFormatter?: (label: string | number) => ReactNode;
  valueFormatter?: (value: number, entry: TooltipEntry) => ReactNode;
  /** Hide entries (e.g. the invisible stacked base of a band). */
  filter?: (entry: TooltipEntry) => boolean;
  /** Extra content under the rows (e.g. regime, provenance). */
  footer?: (payload: readonly TooltipEntry[]) => ReactNode;
}

/** Themed tooltip body for Recharts' <Tooltip content={<ChartTooltip ... />} />. */
export function ChartTooltip({ active, payload, label, unit, digits = 0, labelFormatter, valueFormatter, filter, footer }: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const rows = payload.filter((p) => p.value !== undefined && p.value !== null && (filter ? filter(p) : true));
  return (
    <div className="min-w-44 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-fg shadow-card">
      {label !== undefined && <p className="mb-1 font-semibold">{labelFormatter ? labelFormatter(label) : label}</p>}
      <ul className="space-y-0.5">
        {rows.map((p, i) => {
          const v = p.value;
          const display = Array.isArray(v)
            ? `${formatNumber(Number(v[0]), digits)}–${formatNumber(Number(v[1]), digits)}${unit ? ` ${unit}` : ""}`
            : typeof v === "number"
              ? valueFormatter
                ? valueFormatter(v, p)
                : `${formatNumber(v, digits)}${unit ? ` ${unit}` : ""}`
              : String(v);
          return (
            <li key={i} className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-2 text-fg-muted">
                <span className="inline-block size-2.5 rounded-full" style={{ background: p.color ?? p.stroke ?? p.fill }} aria-hidden />
                {p.name}
              </span>
              <span className="tabular font-semibold">{display}</span>
            </li>
          );
        })}
      </ul>
      {footer && <div className="mt-1.5 border-t border-border pt-1.5 text-xs text-fg-subtle">{footer(payload)}</div>}
    </div>
  );
}

/** Figure wrapper: fixed-height chart area + caption, keeps layout stable while loading. */
export function ChartFrame({ height = 360, caption, children, className }: { height?: number; caption?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <figure className={className}>
      <div style={{ height }} className="w-full">
        {children}
      </div>
      {caption && <figcaption className="mt-2 text-sm text-fg-subtle">{caption}</figcaption>}
    </figure>
  );
}
