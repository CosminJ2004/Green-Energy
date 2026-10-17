/**
 * Server-safe (no React import). The hooks live in theme-hooks.ts ("use client")
 * and are re-exported here, so always import from "@/lib/theme".
 *
 * JS mirror of the CSS tokens in src/app/globals.css, for libraries that need
 * concrete colour values (Recharts, MapLibre). Keep both files in sync.
 *
 * Usage in a client component:
 *   const c = useThemeColors();
 *   <Line stroke={c.solar} />
 */

export type ThemeMode = "light" | "dark";
export type ThemePreference = "system" | ThemeMode;

export interface MapColors {
  land: string;
  water: string;
  border: string;
  regionLine: string;
  line400: string;
  line220: string;
  substation: string;
  nuclear: string;
  hydro: string;
  solarPlant: string;
  windFarm: string;
  label: string;
  labelHalo: string;
}

export interface ThemeColors {
  mode: ThemeMode;
  bg: string;
  surface: string;
  surface2: string;
  surface3: string;
  fg: string;
  fgMuted: string;
  fgSubtle: string;
  border: string;
  borderStrong: string;
  accent: string;
  accentSoft: string;
  /** Energy series. Use `solar`/`wind` for marks, `*Ink` for text, `*Band` for p10–p90 fills. */
  solar: string;
  solarInk: string;
  solarSoft: string;
  solarBand: string;
  wind: string;
  windInk: string;
  windSoft: string;
  windBand: string;
  price: string;
  priceInk: string;
  load: string;
  /** Observed generation line (ink colour, so it reads as "truth"). */
  actual: string;
  /** Persistence / clear-sky / climatology baselines (draw dashed). */
  baseline: string;
  grid: string;
  axis: string;
  /** Diverging pair for SHAP: pushes forecast up / down. */
  positive: string;
  positiveInk: string;
  positiveSoft: string;
  negative: string;
  negativeInk: string;
  negativeSoft: string;
  neutralMid: string;
  /** Status — reserved meaning, always with icon + label. */
  good: string;
  warn: string;
  bad: string;
  info: string;
  synthetic: string;
  real: string;
  map: MapColors;
  /** Sequential ramps, low → high (6 steps). In dark mode low values sit near the surface. */
  ramps: {
    solar: string[];
    wind: string[];
    siting: string[];
  };
}

const light: ThemeColors = {
  mode: "light",
  bg: "#f3f5f8",
  surface: "#ffffff",
  surface2: "#eef1f5",
  surface3: "#e2e7ee",
  fg: "#0f172a",
  fgMuted: "#334155",
  fgSubtle: "#526075",
  border: "#d5dbe4",
  borderStrong: "#9aa6b6",
  accent: "#0b6e3f",
  accentSoft: "#dff3e8",
  solar: "#c77700",
  solarInk: "#8a5200",
  solarSoft: "#fdf0d9",
  solarBand: "rgba(199, 119, 0, 0.2)",
  wind: "#00879e",
  windInk: "#006577",
  windSoft: "#dcf2f6",
  windBand: "rgba(0, 135, 158, 0.2)",
  price: "#7048c8",
  priceInk: "#5a34b0",
  load: "#475569",
  actual: "#0f172a",
  baseline: "#6b7789",
  grid: "#e3e7ee",
  axis: "#9aa6b6",
  positive: "#2166ac",
  positiveInk: "#1a5590",
  positiveSoft: "#dbe8f6",
  negative: "#c2304f",
  negativeInk: "#a3243f",
  negativeSoft: "#f8dfe5",
  neutralMid: "#e5e7eb",
  good: "#0f7b0f",
  warn: "#9a6200",
  bad: "#c0282d",
  info: "#1d5fa8",
  synthetic: "#8a4b00",
  real: "#0b6e3f",
  map: {
    land: "#f1f3f0",
    water: "#cfe3f1",
    border: "#6b7789",
    regionLine: "#8794a6",
    line400: "#b3361f",
    line220: "#d9822b",
    substation: "#1f2937",
    nuclear: "#7048c8",
    hydro: "#2166ac",
    solarPlant: "#c77700",
    windFarm: "#00879e",
    label: "#1f2937",
    labelHalo: "#ffffff",
  },
  ramps: {
    solar: ["#fdf0d9", "#f7d79a", "#eeb54f", "#d98f12", "#b06800", "#7a4600"],
    wind: ["#dcf2f6", "#a6dde7", "#62c0d1", "#1c9db3", "#00778c", "#004f5e"],
    siting: ["#e5f5ec", "#b6e2c7", "#7cc9a0", "#3ea873", "#0b8048", "#05532e"],
  },
};

const dark: ThemeColors = {
  mode: "dark",
  bg: "#0b0f14",
  surface: "#141a22",
  surface2: "#1b232e",
  surface3: "#253041",
  fg: "#f1f5f9",
  fgMuted: "#c8d0db",
  fgSubtle: "#9aa6b8",
  border: "#2a3544",
  borderStrong: "#4a586c",
  accent: "#3ecf8e",
  accentSoft: "#10322a",
  solar: "#c08410",
  solarInk: "#f0b54a",
  solarSoft: "#33260f",
  solarBand: "rgba(240, 181, 74, 0.22)",
  wind: "#1ea5b8",
  windInk: "#5cc9d8",
  windSoft: "#0f2f36",
  windBand: "rgba(30, 165, 184, 0.24)",
  price: "#9a7cf0",
  priceInk: "#b9a3f6",
  load: "#a7b2c2",
  actual: "#f1f5f9",
  baseline: "#8d99ab",
  grid: "#232d3a",
  axis: "#4a586c",
  positive: "#4a90d9",
  positiveInk: "#7fb3ea",
  positiveSoft: "#172b44",
  negative: "#e0587a",
  negativeInk: "#f08aa3",
  negativeSoft: "#3d1a25",
  neutralMid: "#374151",
  good: "#3cc13c",
  warn: "#f4b63f",
  bad: "#f07077",
  info: "#6aa8ec",
  synthetic: "#f5bd6b",
  real: "#6ee0aa",
  map: {
    land: "#1a212b",
    water: "#0e2233",
    border: "#8d99ab",
    regionLine: "#4a586c",
    line400: "#ef6a4c",
    line220: "#e9a255",
    substation: "#e5e7eb",
    nuclear: "#9a7cf0",
    hydro: "#4a90d9",
    solarPlant: "#f0b54a",
    windFarm: "#1ea5b8",
    label: "#e5e7eb",
    labelHalo: "#0b0f14",
  },
  ramps: {
    solar: ["#3a2a10", "#6b4a12", "#9c6c12", "#cf9420", "#f0b54a", "#ffd98a"],
    wind: ["#0f2f36", "#13505b", "#177684", "#1ea5b8", "#5cc9d8", "#a6e9f1"],
    siting: ["#0f2a20", "#14503a", "#1b7a55", "#2aa673", "#5fd39d", "#a8f0cb"],
  },
};

export const palettes: Record<ThemeMode, ThemeColors> = { light, dark };

/** Colour for an energy source (marks). */
export function sourceColor(source: "solar" | "wind", c: ThemeColors): string {
  return source === "solar" ? c.solar : c.wind;
}
/** Text-safe colour for an energy source. */
export function sourceInk(source: "solar" | "wind", c: ThemeColors): string {
  return source === "solar" ? c.solarInk : c.windInk;
}
/** p10–p90 band fill for an energy source. */
export function sourceBand(source: "solar" | "wind", c: ThemeColors): string {
  return source === "solar" ? c.solarBand : c.windBand;
}

/** Interpolate a ramp at t in [0, 1] (linear RGB interpolation between steps). */
export function rampColor(ramp: string[], t: number): string {
  const x = Math.min(1, Math.max(0, Number.isFinite(t) ? t : 0)) * (ramp.length - 1);
  const i = Math.min(ramp.length - 2, Math.floor(x));
  const f = x - i;
  const a = hexToRgb(ramp[i]);
  const b = hexToRgb(ramp[i + 1]);
  const mix = (p: number, q: number) => Math.round(p + (q - p) * f);
  return rgbToHex(mix(a[0], b[0]), mix(a[1], b[1]), mix(a[2], b[2]));
}

/**
 * MapLibre `interpolate` stops for a ramp over [min, max]:
 *   ["interpolate", ["linear"], ["get", "p50"], ...rampStops(c.ramps.solar, 0, 1000)]
 */
export function rampStops(ramp: string[], min: number, max: number): (number | string)[] {
  const out: (number | string)[] = [];
  ramp.forEach((col, i) => {
    out.push(min + ((max - min) * i) / (ramp.length - 1), col);
  });
  return out;
}

export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((ch) => ch + ch).join("") : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export function rgbToHex(r: number, g: number, b: number): string {
  return "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");
}
/** `#rrggbb` + alpha → `rgba(...)`. */
export function withAlpha(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// ---------------------------------------------------------------------------
// Theme resolution (data-theme attribute on <html>, falling back to OS setting)
// ---------------------------------------------------------------------------

export const THEME_STORAGE_KEY = "ge-theme";

/** Inline script for <head>: applies the stored preference before first paint. */
export const themeInitScript = `(function(){try{var t=localStorage.getItem('${THEME_STORAGE_KEY}');if(t==='light'||t==='dark'){document.documentElement.setAttribute('data-theme',t);}}catch(e){}})();`;

export { useResolvedTheme, useThemeColors, useThemePreference } from "./theme-hooks";
