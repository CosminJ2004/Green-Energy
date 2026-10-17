/**
 * EXACT Shapley values for the surrogate model, by enumerating all 2^n feature
 * coalitions (n = 6 for solar, 4 for wind).
 *
 * Interventional (baseline) Shapley: features outside a coalition take values
 * from a background set B = the seasonal climatology of the target's local day
 * (24 hourly points). For each background b:
 *   φ_i(b) = Σ_{S ⊆ N\{i}} |S|!(n−|S|−1)!/n! · [f(x_{S∪i}, b_rest) − f(x_S, b_rest)]
 * and φ_i = mean_b φ_i(b). By the efficiency axiom
 *   Σ_i φ_i = f(x) − mean_b f(b) = prediction − base_value   (exactly, up to float error).
 */

import type { EnergySource, FeatureContribution, ModelFeature, SolarFeature, WindFeature } from "@/lib/api/types";
import { HOUR_MS, localMidnightUtcMs, localDateKey } from "@/lib/time";
import { NATIONAL_POINT } from "./geo";
import { predictSolarFromInputs, predictWindFromInputs, type SolarInputs, type WindInputs } from "./model";
import { clamp } from "./prng";
import { clearSkyGhi, cloudFactor, sunPosition } from "./solar";
import { climatologyCloud, climatologyTemperature, climatologyWind, icingRisk, summerness } from "./weather";

export interface FeatureMeta {
  feature: ModelFeature;
  label: string;
  unit: string;
}

export const SOLAR_FEATURES: (FeatureMeta & { feature: SolarFeature })[] = [
  { feature: "shortwave_radiation", label: "Solar irradiance (GHI)", unit: "W/m²" },
  { feature: "cloud_cover_total", label: "Total cloud cover", unit: "%" },
  { feature: "temperature_2m", label: "Air temperature", unit: "°C" },
  { feature: "snow_depth", label: "Snow on panels", unit: "cm" },
  { feature: "solar_elevation", label: "Sun elevation (hour of day)", unit: "°" },
  { feature: "curtailment_flag", label: "Curtailment (negative price)", unit: "flag" },
];

export const WIND_FEATURES: (FeatureMeta & { feature: WindFeature })[] = [
  { feature: "wind_speed_100m", label: "Wind speed at 100 m", unit: "m/s" },
  { feature: "wind_direction_100m", label: "Wind direction at 100 m", unit: "°" },
  { feature: "temperature_2m", label: "Air temperature (air density)", unit: "°C" },
  { feature: "icing_risk", label: "Icing risk", unit: "0–1" },
];

export function featuresFor(source: EnergySource): FeatureMeta[] {
  return source === "solar" ? SOLAR_FEATURES : WIND_FEATURES;
}

// --------------------------------------------------------------------------
// Generic exact Shapley
// --------------------------------------------------------------------------

function factorial(n: number): number {
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}

/**
 * Exact interventional Shapley values of f at x against a background set.
 * Returns φ (one per key, in `keys` order) and the base value mean_b f(b).
 */
export function exactShapley<K extends string>(
  f: (v: Record<K, number>) => number,
  keys: readonly K[],
  x: Record<K, number>,
  backgrounds: Record<K, number>[],
): { phi: number[]; base: number; fx: number } {
  const n = keys.length;
  const nMasks = 1 << n;
  const weights: number[] = [];
  for (let s = 0; s < n; s++) weights[s] = (factorial(s) * factorial(n - s - 1)) / factorial(n);
  const popcount = (m: number) => {
    let c = 0;
    while (m) {
      m &= m - 1;
      c++;
    }
    return c;
  };
  const phi = new Array<number>(n).fill(0);
  let base = 0;
  const vals = new Array<number>(nMasks);
  for (const b of backgrounds) {
    for (let m = 0; m < nMasks; m++) {
      const v = {} as Record<K, number>;
      for (let i = 0; i < n; i++) v[keys[i]] = m & (1 << i) ? x[keys[i]] : b[keys[i]];
      vals[m] = f(v);
    }
    base += vals[0];
    for (let i = 0; i < n; i++) {
      const bit = 1 << i;
      let acc = 0;
      for (let m = 0; m < nMasks; m++) {
        if (m & bit) continue;
        acc += weights[popcount(m)] * (vals[m | bit] - vals[m]);
      }
      phi[i] += acc;
    }
  }
  const nb = backgrounds.length;
  return { phi: phi.map((p) => p / nb), base: base / nb, fx: f(x) };
}

// --------------------------------------------------------------------------
// Climatology backgrounds
// --------------------------------------------------------------------------

/** 24 hourly climatology points of the local day containing `timeMs` (solar inputs). */
export function solarBackground(timeMs: number): SolarInputs[] {
  const day = localDateKey(timeMs);
  const start = localMidnightUtcMs(day);
  const [lon, lat] = NATIONAL_POINT;
  const cloud = climatologyCloud(timeMs);
  const winterness = clamp((-summerness(timeMs) - 0.55) / 0.45);
  const out: SolarInputs[] = [];
  for (let h = 0; h < 24; h++) {
    const t = start + h * HOUR_MS;
    const sun = sunPosition(t, lat, lon);
    out.push({
      shortwave_radiation: clearSkyGhi(sun.cosZenith) * cloudFactor(cloud),
      cloud_cover_total: cloud,
      temperature_2m: climatologyTemperature(t, lat, lon, 250, cloud),
      snow_depth: 4 * winterness,
      solar_elevation: sun.elevation,
      curtailment_flag: 0,
    });
  }
  return out;
}

/** 24 climatology points (Weibull k=2 wind-speed quantiles, uniform directions) for wind inputs. */
export function windBackground(timeMs: number): WindInputs[] {
  const day = localDateKey(timeMs);
  const start = localMidnightUtcMs(day);
  const mean = climatologyWind(timeMs, 1.1);
  const scale = mean / 0.8862; // Weibull k=2: mean = c·Γ(1.5)
  const out: WindInputs[] = [];
  for (let i = 0; i < 24; i++) {
    const t = start + i * HOUR_MS;
    const p = (i + 0.5) / 24;
    const temp = climatologyTemperature(t, 44.9, 28.3, 100);
    out.push({
      wind_speed_100m: scale * Math.sqrt(-Math.log(1 - p)),
      wind_direction_100m: ((i * 7) % 24) * 15,
      temperature_2m: temp,
      icing_risk: icingRisk(temp, 82),
    });
  }
  return out;
}

export const BACKGROUND_DESCRIPTION =
  "Seasonal climatology of the same local day (24 hourly points): mean cloud cover and temperature, climatological irradiance; for wind, Weibull (k=2) speed quantiles around the seasonal mean with uniform directions.";

// --------------------------------------------------------------------------
// Model-specific explanations
// --------------------------------------------------------------------------

export interface ShapResult {
  base: number;
  prediction: number;
  contributions: FeatureContribution[];
}

export function explainSolar(x: SolarInputs, timeMs: number): ShapResult {
  const keys = SOLAR_FEATURES.map((f) => f.feature as SolarFeature);
  const bg = solarBackground(timeMs);
  const { phi, base, fx } = exactShapley(predictSolarFromInputs, keys, x, bg);
  return assemble(SOLAR_FEATURES, keys, x, bg, phi, base, fx);
}

export function explainWind(x: WindInputs, timeMs: number): ShapResult {
  const keys = WIND_FEATURES.map((f) => f.feature as WindFeature);
  const bg = windBackground(timeMs);
  const { phi, base, fx } = exactShapley(predictWindFromInputs, keys, x, bg);
  return assemble(WIND_FEATURES, keys, x, bg, phi, base, fx);
}

function assemble<K extends string>(
  meta: FeatureMeta[],
  keys: K[],
  x: Record<K, number>,
  bg: Record<K, number>[],
  phi: number[],
  base: number,
  fx: number,
): ShapResult {
  const contributions: FeatureContribution[] = keys.map((k, i) => ({
    feature: meta[i].feature,
    label: meta[i].label,
    unit: meta[i].unit,
    value: x[k],
    baseline_value: bg.reduce((a, b) => a + b[k], 0) / bg.length,
    contribution: phi[i],
  }));
  contributions.sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));
  return { base, prediction: fx, contributions };
}

// --------------------------------------------------------------------------
// Self-check (unit-free)
// --------------------------------------------------------------------------

export interface ShapleySelfCheck {
  ok: boolean;
  /** Largest |Σφ − (f(x) − base)| / max(1, |f(x)|, |base|) over all cases. */
  maxRelativeError: number;
  /** Analytic case f = x1·x2 + 3·x3 with zero background must give φ = (5, 5, 3, 0). */
  analyticOk: boolean;
  cases: number;
}

/**
 * Verifies (1) exactness on an analytic function with known Shapley values,
 * including symmetry and the dummy axiom, and (2) efficiency (additivity) for the
 * solar and wind surrogates over a spread of random-ish inputs.
 */
export function checkShapley(sampleTimesMs?: number[]): ShapleySelfCheck {
  const tol = 1e-9;
  // (1) analytic
  type AK = "a" | "b" | "c" | "d";
  const fa = (v: Record<AK, number>) => v.a * v.b + 3 * v.c;
  const ra = exactShapley(fa, ["a", "b", "c", "d"] as const, { a: 2, b: 5, c: 1, d: 7 }, [{ a: 0, b: 0, c: 0, d: 0 }]);
  const expected = [5, 5, 3, 0];
  const analyticOk = ra.phi.every((p, i) => Math.abs(p - expected[i]) < tol);

  // (2) efficiency on the surrogates
  const times = sampleTimesMs ?? [Date.UTC(2026, 0, 15, 10), Date.UTC(2026, 3, 20, 9), Date.UTC(2026, 6, 10, 11), Date.UTC(2026, 9, 18, 7)];
  let maxRel = 0;
  let cases = 0;
  for (const t of times) {
    for (const [ghi, cloud, temp, snow, curt] of [
      [850, 5, 31, 0, 0],
      [300, 80, 12, 0, 0],
      [600, 30, 22, 0, 1],
      [150, 95, -3, 20, 0],
    ]) {
      const sun = sunPosition(t, NATIONAL_POINT[1], NATIONAL_POINT[0]);
      const x: SolarInputs = { shortwave_radiation: ghi, cloud_cover_total: cloud, temperature_2m: temp, snow_depth: snow, solar_elevation: sun.elevation, curtailment_flag: curt };
      const r = explainSolar(x, t);
      maxRel = Math.max(maxRel, relErr(r));
      cases++;
    }
    for (const [v, dir, temp, ice] of [
      [4, 120, 15, 0],
      [9, 315, 5, 0],
      [14, 30, -2, 0.8],
      [26, 290, 0, 0.2],
    ]) {
      const r = explainWind({ wind_speed_100m: v, wind_direction_100m: dir, temperature_2m: temp, icing_risk: ice }, t);
      maxRel = Math.max(maxRel, relErr(r));
      cases++;
    }
  }
  return { ok: analyticOk && maxRel < 1e-9, maxRelativeError: maxRel, analyticOk, cases };
}

function relErr(r: ShapResult): number {
  const sum = r.contributions.reduce((a, c) => a + c.contribution, 0);
  return Math.abs(sum - (r.prediction - r.base)) / Math.max(1, Math.abs(r.prediction), Math.abs(r.base));
}
