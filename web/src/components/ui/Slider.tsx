"use client";

import clsx from "clsx";
import { RotateCcw } from "lucide-react";
import { useId, type CSSProperties, type ReactNode } from "react";

export interface SliderProps {
  label: ReactNode;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  /** Unit shown after the value, e.g. "%", "°C", "m/s", "×". */
  unit?: string;
  /** Custom value formatter (default: number + unit). Also used for aria-valuetext. */
  format?: (v: number) => string;
  description?: ReactNode;
  disabled?: boolean;
  /** Track colour (identity): solar/wind/price or the UI accent. */
  tone?: "accent" | "solar" | "wind" | "price";
  /** Tick labels under the track. */
  marks?: { value: number; label: string }[];
  /** Shows a reset button when value !== resetValue. */
  resetValue?: number;
  id?: string;
  className?: string;
}

const TONE_VAR: Record<NonNullable<SliderProps["tone"]>, string> = {
  accent: "var(--accent)",
  solar: "var(--solar)",
  wind: "var(--wind)",
  price: "var(--price)",
};

/** Accessible labelled range input with live value read-out and units. */
export function Slider({ label, value, onChange, min, max, step = 1, unit, format, description, disabled, tone = "accent", marks, resetValue, id, className }: SliderProps) {
  const autoId = useId();
  const inputId = id ?? `slider-${autoId}`;
  const descId = description ? `${inputId}-desc` : undefined;
  const text = format ? format(value) : `${trimNumber(value, step)}${unit ? ` ${unit}` : ""}`;
  const pct = max > min ? ((value - min) / (max - min)) * 100 : 0;
  const style = { "--fill": `${pct}%`, "--track-fill": TONE_VAR[tone] } as CSSProperties;
  return (
    <div className={clsx("w-full", disabled && "opacity-60", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={inputId} className="text-base font-medium text-fg">
          {label}
        </label>
        <div className="flex items-center gap-2">
          <output htmlFor={inputId} className="tabular text-base font-semibold text-fg" aria-live="polite">
            {text}
          </output>
          {resetValue !== undefined && value !== resetValue && !disabled && (
            <button
              type="button"
              onClick={() => onChange(resetValue)}
              className="rounded p-1 text-fg-subtle hover:bg-surface-2 hover:text-fg"
              aria-label="Reset to default"
              title="Reset"
            >
              <RotateCcw className="size-4" aria-hidden />
            </button>
          )}
        </div>
      </div>
      <input
        id={inputId}
        type="range"
        className="ge-range mt-1"
        style={style}
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        aria-valuetext={text}
        aria-describedby={descId}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      {marks && marks.length > 0 && (
        <div className="relative mt-0.5 h-5 text-xs text-fg-subtle" aria-hidden>
          {marks.map((m) => (
            <span key={m.value} className="absolute -translate-x-1/2 whitespace-nowrap" style={{ left: `${((m.value - min) / (max - min)) * 100}%` }}>
              {m.label}
            </span>
          ))}
        </div>
      )}
      {description && (
        <p id={descId} className="mt-1 text-sm text-fg-subtle">
          {description}
        </p>
      )}
    </div>
  );
}

function trimNumber(v: number, step: number): string {
  const decimals = step >= 1 ? 0 : Math.min(3, Math.ceil(-Math.log10(step)));
  return v.toFixed(decimals);
}
