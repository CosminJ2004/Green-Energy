"use client";

/**
 * Shared global controls (energy source + forecast issue date), synced to the
 * URL (?source=solar|wind|both&date=YYYY-MM-DD) so links and reloads keep them.
 * Defaults: source "both", date = today in Bucharest (omitted from the URL).
 */

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import type { EnergySource } from "@/lib/api/types";
import { addDays, forecastWindow, isDateKey, todayLocal } from "@/lib/time";

export type SourceSelection = EnergySource | "both";

export interface AppState {
  /** Selected source toggle. */
  source: SourceSelection;
  /** Sources to fetch/render: ["solar"], ["wind"] or ["solar", "wind"]. */
  sources: EnergySource[];
  /** One source for single-source views (Explain etc.): "solar" when "both" is selected. */
  primarySource: EnergySource;
  /** Forecast issue date D (local, "YYYY-MM-DD"). Forecast covers D+1 and D+2. */
  issueDate: string;
  /** Today in Bucharest. */
  today: string;
  isToday: boolean;
  /** Forecast window for issueDate as ISO UTC, half-open [from, to). */
  window: { from: string; to: string };
  region: "RO";
  setSource: (s: SourceSelection) => void;
  setIssueDate: (d: string) => void;
  shiftIssueDate: (days: number) => void;
  /** Build an href that preserves the global controls, e.g. hrefWith("/explain", { hour: "12" }). */
  hrefWith: (path: string, extra?: Record<string, string | undefined>) => string;
  /** Update arbitrary view-specific URL params (merged; undefined removes). */
  setParams: (params: Record<string, string | undefined>) => void;
  /** Read the current URL search params (view-specific state). */
  searchParams: URLSearchParams;
}

const Ctx = createContext<AppState | null>(null);

const SOURCES: SourceSelection[] = ["solar", "wind", "both"];

export function AppStateProvider({ children }: { children: ReactNode }) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const today = todayLocal();
  const rawSource = params.get("source");
  const source: SourceSelection = SOURCES.includes(rawSource as SourceSelection) ? (rawSource as SourceSelection) : "both";
  const rawDate = params.get("date");
  const issueDate = isDateKey(rawDate) ? rawDate : today;

  const setParams = useCallback(
    (next: Record<string, string | undefined>) => {
      const q = new URLSearchParams(params.toString());
      for (const [k, v] of Object.entries(next)) {
        if (v === undefined || v === "") q.delete(k);
        else q.set(k, v);
      }
      const s = q.toString();
      router.replace(s ? `${pathname}?${s}` : pathname, { scroll: false });
    },
    [params, pathname, router],
  );

  const value = useMemo<AppState>(() => {
    const sources: EnergySource[] = source === "both" ? ["solar", "wind"] : [source];
    const hrefWith = (path: string, extra?: Record<string, string | undefined>) => {
      const q = new URLSearchParams();
      if (source !== "both") q.set("source", source);
      if (issueDate !== today) q.set("date", issueDate);
      for (const [k, v] of Object.entries(extra ?? {})) if (v !== undefined) q.set(k, v);
      const s = q.toString();
      return s ? `${path}?${s}` : path;
    };
    return {
      source,
      sources,
      primarySource: source === "wind" ? "wind" : "solar",
      issueDate,
      today,
      isToday: issueDate === today,
      window: forecastWindow(issueDate),
      region: "RO",
      setSource: (s) => setParams({ source: s === "both" ? undefined : s }),
      setIssueDate: (d) => setParams({ date: isDateKey(d) && d !== today ? d : undefined }),
      shiftIssueDate: (n) => {
        const d = addDays(issueDate, n);
        setParams({ date: d !== today ? d : undefined });
      },
      hrefWith,
      setParams,
      searchParams: new URLSearchParams(params.toString()),
    };
  }, [source, issueDate, today, params, setParams]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Global control state. Must be used inside <AppStateProvider> (provided by the root layout). */
export function useAppState(): AppState {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAppState must be used inside <AppStateProvider>");
  return v;
}
