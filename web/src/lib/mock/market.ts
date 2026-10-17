/**
 * Synthetic load and day-ahead prices (merit-order style).
 *
 * Load: ~5.0–8.5 GW with night trough, morning ramp, evening peak, weekend dip,
 * winter heating and mild summer cooling.
 * Price: residual load (load − solar − wind − nuclear − hydro − must-run) mapped
 * through a smooth merit-order curve; deep surpluses (sunny, windy weekends)
 * clear below zero. Computed at 15-minute resolution, aggregated to hourly.
 */

import { HOUR_MS, localParts } from "@/lib/time";
import { gaussian, memo } from "./prng";
import { predictSolar, predictWind } from "./model";
import { nationalWeather, summerness } from "./weather";

export const NUCLEAR_MW = 1300;
export const MUST_RUN_MW = 350;

/** Synthetic national load, MW (hourly mean). */
export function loadMw(timeMs: number): number {
  const p = localParts(timeMs);
  const s = summerness(timeMs);
  const h = p.hour + p.minute / 60;
  const base = 6500 + 750 * Math.max(0, -s) + 300 * Math.max(0, s) ** 2;
  const night = -1150 * Math.exp(-(((h - 4) / 3.2) ** 2));
  const morning = 420 * Math.exp(-(((h - 10.5) / 3) ** 2));
  const evening = (380 + 520 * Math.max(0, -s)) * Math.exp(-(((h - 19.5) / 2.2) ** 2));
  const weekend = p.weekday === 0 ? -750 : p.weekday === 6 ? -500 : 0;
  const noise = 110 * gaussian("load", Math.floor(timeMs / HOUR_MS));
  return base + night + morning + evening + weekend + noise;
}

/** Hydro output, MW: spring snow-melt high, late-summer low, follows the evening peak. */
export function hydroMw(timeMs: number): number {
  const p = localParts(timeMs);
  const spring = Math.cos((2 * Math.PI * ((timeMs / 86_400_000) % 365.25 - 130)) / 365.25);
  const evening = 450 * Math.exp(-(((p.hour - 19.5) / 2.5) ** 2));
  return 1650 + 350 * spring + evening;
}

/** Smooth merit-order curve: residual load (MW) → price (EUR/MWh). */
export function meritOrderPrice(residualMw: number): number {
  const r = residualMw;
  return 85 + 95 * Math.tanh((r - 900) / 1100) - 0.03 * Math.max(0, -600 - r);
}

export interface MarketHour {
  timeMs: number;
  price: number;
  quarterHours: number[];
  loadMw: number;
  solarMw: number;
  windMw: number;
}

const marketCache = memo<MarketHour>(6000);

/** Market state of one hour, from the analysis ("truth") weather. */
export function marketHour(timeMs: number): MarketHour {
  return marketCache(String(timeMs), () => {
    const quarters: number[] = [];
    let solarSum = 0;
    let windSum = 0;
    let loadSum = 0;
    const w0 = nationalWeather(timeMs);
    const w1 = nationalWeather(timeMs + HOUR_MS);
    const s0 = predictSolar(w0);
    const s1 = predictSolar(w1);
    const v0 = predictWind(w0);
    const v1 = predictWind(w1);
    const l0 = loadMw(timeMs);
    const l1 = loadMw(timeMs + HOUR_MS);
    const hyd = hydroMw(timeMs);
    for (let q = 0; q < 4; q++) {
      const f = (q + 0.5) / 4;
      const solar = s0 + (s1 - s0) * f;
      const wind = v0 + (v1 - v0) * f;
      const load = l0 + (l1 - l0) * f;
      const residual = load - solar - wind - NUCLEAR_MW - hyd - MUST_RUN_MW;
      const noise = 5 * gaussian("price-q", Math.floor(timeMs / HOUR_MS), q);
      quarters.push(Math.round((meritOrderPrice(residual) + noise) * 100) / 100);
      solarSum += solar;
      windSum += wind;
      loadSum += load;
    }
    const price = quarters.reduce((a, b) => a + b, 0) / 4;
    return {
      timeMs,
      price: Math.round(price * 100) / 100,
      quarterHours: quarters,
      loadMw: loadSum / 4,
      solarMw: solarSum / 4,
      windMw: windSum / 4,
    };
  });
}

/** Curtailment proxy: negative day-ahead price while the sun is reasonably high. */
export function isCurtailed(timeMs: number, solarElevation: number): boolean {
  return solarElevation > 15 && marketHour(timeMs).price < 0;
}
