"use client";

/** Theme hooks (client only). Import them via "@/lib/theme". */

import { useCallback, useSyncExternalStore } from "react";
import { THEME_STORAGE_KEY, palettes, type ThemeColors, type ThemeMode, type ThemePreference } from "./theme";

function readPreference(): ThemePreference {
  if (typeof document === "undefined") return "system";
  const attr = document.documentElement.getAttribute("data-theme");
  return attr === "light" || attr === "dark" ? attr : "system";
}

function readResolved(): ThemeMode {
  if (typeof window === "undefined") return "light";
  const pref = readPreference();
  if (pref !== "system") return pref;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function subscribe(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const mo = new MutationObserver(onChange);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
  mq?.addEventListener?.("change", onChange);
  return () => {
    mo.disconnect();
    mq?.removeEventListener?.("change", onChange);
  };
}

/** "light" | "dark" actually in effect. Server render assumes "light". */
export function useResolvedTheme(): ThemeMode {
  return useSyncExternalStore(subscribe, readResolved, () => "light");
}

/** Concrete colours for the theme in effect. */
export function useThemeColors(): ThemeColors {
  return palettes[useResolvedTheme()];
}

/** Read/write the user's preference (system | light | dark), persisted in localStorage. */
export function useThemePreference(): {
  preference: ThemePreference;
  resolved: ThemeMode;
  setPreference: (p: ThemePreference) => void;
} {
  const preference = useSyncExternalStore<ThemePreference>(subscribe, readPreference, () => "system");
  const resolved = useResolvedTheme();
  const setPreference = useCallback((p: ThemePreference) => {
    const root = document.documentElement;
    if (p === "system") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", p);
    try {
      if (p === "system") localStorage.removeItem(THEME_STORAGE_KEY);
      else localStorage.setItem(THEME_STORAGE_KEY, p);
    } catch {
      /* storage unavailable: preference lasts for this page view */
    }
  }, []);
  return { preference, resolved, setPreference };
}
