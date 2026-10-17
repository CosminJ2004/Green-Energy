"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useThemePreference, type ThemePreference } from "@/lib/theme";

const NEXT: Record<ThemePreference, ThemePreference> = { system: "light", light: "dark", dark: "system" };
const LABEL: Record<ThemePreference, string> = { system: "System theme", light: "Light theme", dark: "Dark theme" };

/** Cycles system → light → dark. Persists in localStorage ("ge-theme"). */
export function ThemeToggle({ className }: { className?: string }) {
  const { preference, setPreference } = useThemePreference();
  const Icon = preference === "light" ? Sun : preference === "dark" ? Moon : Monitor;
  return (
    <button
      type="button"
      onClick={() => setPreference(NEXT[preference])}
      className={`inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-2.5 py-2 text-sm font-medium text-fg-muted hover:bg-surface-2 hover:text-fg ${className ?? ""}`}
      aria-label={`${LABEL[preference]}. Switch to ${LABEL[NEXT[preference]].toLowerCase()}`}
      title={`${LABEL[preference]} (click to change)`}
    >
      <Icon className="size-5" aria-hidden />
      <span className="hidden lg:inline">{preference === "system" ? "Auto" : preference === "light" ? "Light" : "Dark"}</span>
    </button>
  );
}
