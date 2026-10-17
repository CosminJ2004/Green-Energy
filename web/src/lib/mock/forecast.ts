/**
 * Mock forecast service: forecasts, synthetic actuals, baselines, explanations,
 * what-if and regional map forecasts — all from the surrogate model on the
 * synthetic weather, so every number on screen is mutually consistent.
 */

import type {
  ActualPoint,
  ActualsSource,
  DevRegionCode,
  EnergySource,
  Explanation,
  ForecastPoint,
  ForecastPointDetail,
  RegionForecastProperties,
  WeatherPoint,
  WhatIfRequest,
} from "@/lib/api/types";
import { HOUR_MS, addDays, localDateKey, localMidnightUtcMs, localParts, toIso } from "@/lib/time";
import { DEV_REGIONS } from "./geo";
import { isCurtailed, loadMw } from "./market";
import {
  SOLAR_CAPACITY_MW,
  SOLAR_MODEL_VERSION,
  WIND_CAPACITY_MW,
  WIND_MODEL_VERSION,
  predictSolarFromInputs,
  predictWindFromInputs,
  solarInputsFrom,
  solarQuantiles,
  windInputsFrom,
  windQuantiles,
  type Quantiles,
} from "./model";
import { BACKGROUND_DESCRIPTION, explainSolar, explainWind, solarBackground, windBackground } from "./explain";
import { clamp, gaussian, memo } from "./prng";
import { cloudFactor, splitRadiation, sunPosition } from "./solar";
import { airDensity, classifyRegime, icingRisk, issueTimeMs, nationalWeather, regionalWeather, toWeatherPoint, type RawWeather } from "./weather";

export const capacityOf = (s: EnergySource) => (s === "solar" ? SOLAR_CAPACITY_MW : WIND_CAPACITY_MW);
export const modelVersionOf = (s: EnergySource) => (s === "solar" ? SOLAR_MODEL_VERSION : WIND_MODEL_VERSION);

/** Default NWP run for a target instant: the local day before. */
export function defaultIssueDate(timeMs: number): string {
  return addDays(localDateKey(timeMs), -1);
}

export function hoursIn(fromMs: number, toMs: number): number[] {
  const out: number[] = [];
  for (let t = Math.floor(fromMs / HOUR_MS) * HOUR_MS; t < toMs; t += HOUR_MS) out.push(t);
  return out;
}

const r1 = (x: number) => Math.round(x * 10) / 10;

// --------------------------------------------------------------------------
// Forecast
// --------------------------------------------------------------------------

function quantilesFor(source: EnergySource, w: RawWeather, timeMs: number, leadHours: number): { q: Quantiles; curtailed: boolean } {
  if (source === "solar") {
    const curtailed = isCurtailed(timeMs, w.solar_elevation);
    return { q: solarQuantiles(w, curtailed, leadHours), curtailed };
  }
  return { q: windQuantiles(w, leadHours), curtailed: false };
}

const fcCache = memo<ForecastPointDetail>(8000);

export function forecastHour(source: EnergySource, timeMs: number, issueDate: string): ForecastPointDetail {
  return fcCache(`${source}|${timeMs}|${issueDate}`, () => {
    const w = nationalWeather(timeMs, issueDate);
    const lead = (timeMs - issueTimeMs(issueDate)) / HOUR_MS;
    const { q, curtailed } = quantilesFor(source, w, timeMs, lead);
    const cap = capacityOf(source);
    const point: ForecastPointDetail = {
      time: toIso(timeMs),
      p10: r1(q.p10),
      p50: r1(q.p50),
      p90: r1(q.p90),
      capacity_factor: Math.round((q.p50 / cap) * 1000) / 1000,
      regime: w.regime,
      lead_hours: Math.round(lead),
    };
    if (source === "solar") point.curtailed = curtailed;
    return point;
  });
}

export function forecastSeries(source: EnergySource, fromMs: number, toMs: number, issueDate?: string): ForecastPointDetail[] {
  return hoursIn(fromMs, toMs).map((t) => forecastHour(source, t, issueDate ?? defaultIssueDate(t)));
}

// --------------------------------------------------------------------------
// Synthetic actuals ("truth" weather through the same physics + metering noise)
// --------------------------------------------------------------------------

export function syntheticActual(source: ActualsSource, timeMs: number): number {
  if (source === "load") return loadMw(timeMs);
  const w = nationalWeather(timeMs);
  const h = Math.floor(timeMs / HOUR_MS);
  if (source === "solar") {
    const mw = predictSolarFromInputs(solarInputsFrom(w, isCurtailed(timeMs, w.solar_elevation)));
    return mw <= 0 ? 0 : Math.max(0, mw * (1 + 0.025 * gaussian("act-solar", h)));
  }
  const mw = predictWindFromInputs(windInputsFrom(w));
  return Math.max(0, mw * (1 + 0.04 * gaussian("act-wind", h)) + 15 * gaussian("act-wind-abs", h));
}

export function syntheticActualSeries(source: ActualsSource, fromMs: number, toMs: number, nowMs: number): ActualPoint[] {
  return hoursIn(fromMs, toMs)
    .filter((t) => t + HOUR_MS <= nowMs)
    .map((t) => ({ time: toIso(t), mw: r1(syntheticActual(source, t)) }));
}

// --------------------------------------------------------------------------
// Baselines
// --------------------------------------------------------------------------

/** Same local hour on day `dateKey`. */
function sameLocalHourOn(dateKey: string, timeMs: number): number {
  return localMidnightUtcMs(dateKey) + localParts(timeMs).hour * HOUR_MS;
}

export function persistenceSeries(source: EnergySource, fromMs: number, toMs: number, issueDate?: string): ActualPoint[] {
  return hoursIn(fromMs, toMs).map((t) => {
    const d = issueDate ?? defaultIssueDate(t);
    return { time: toIso(t), mw: r1(syntheticActual(source, sameLocalHourOn(addDays(d, -1), t))) };
  });
}

function clearSkyOutput(w: RawWeather): number {
  return predictSolarFromInputs({
    shortwave_radiation: w.clear_sky_radiation,
    cloud_cover_total: 0,
    temperature_2m: w.temperature_2m,
    snow_depth: w.snow_depth,
    solar_elevation: w.solar_elevation,
    curtailment_flag: 0,
  });
}

export function clearSkySeries(fromMs: number, toMs: number, issueDate?: string): ActualPoint[] {
  const indexCache = new Map<string, number>();
  const csIndex = (d: string) => {
    const hit = indexCache.get(d);
    if (hit !== undefined) return hit;
    const day = addDays(d, -1);
    const start = localMidnightUtcMs(day);
    const end = localMidnightUtcMs(addDays(day, 1));
    let act = 0;
    let cs = 0;
    for (const t of hoursIn(start, end)) {
      act += syntheticActual("solar", t);
      cs += clearSkyOutput(nationalWeather(t));
    }
    const k = cs > 0 ? clamp(act / cs, 0.05, 1.1) : 0.5;
    indexCache.set(d, k);
    return k;
  };
  return hoursIn(fromMs, toMs).map((t) => {
    const d = issueDate ?? defaultIssueDate(t);
    return { time: toIso(t), mw: r1(csIndex(d) * clearSkyOutput(nationalWeather(t, d))) };
  });
}

export function climatologySeries(source: EnergySource, fromMs: number, toMs: number): ActualPoint[] {
  return hoursIn(fromMs, toMs).map((t) => {
    if (source === "solar") {
      const bg = solarBackground(t);
      const h = localParts(t).hour;
      return { time: toIso(t), mw: r1(predictSolarFromInputs(bg[Math.min(23, h)])) };
    }
    const bg = windBackground(t);
    return { time: toIso(t), mw: r1(bg.reduce((a, b) => a + predictWindFromInputs(b), 0) / bg.length) };
  });
}

export const BASELINE_DESCRIPTIONS = {
  persistence: "Same local hour on the last complete day before the forecast was issued (D-1).",
  clear_sky: "Clear-sky solar output scaled by D-1's clear-sky index (actual / clear-sky energy).",
  climatology: "Seasonal climatology for the hour of day.",
};

// --------------------------------------------------------------------------
// Explanations
// --------------------------------------------------------------------------

const exCache = memo<Explanation>(2000);

export function explainHour(source: EnergySource, timeMs: number, issueDate?: string): Explanation {
  const d = issueDate ?? defaultIssueDate(timeMs);
  return exCache(`${source}|${timeMs}|${d}`, () => {
    const w = nationalWeather(timeMs, d);
    const r =
      source === "solar"
        ? explainSolar(solarInputsFrom(w, isCurtailed(timeMs, w.solar_elevation)), timeMs)
        : explainWind(windInputsFrom(w), timeMs);
    return {
      region: "RO",
      source,
      time: toIso(timeMs),
      model_version: modelVersionOf(source),
      base_value: r.base,
      prediction: r.prediction,
      unit: "MW",
      method: "exact-shapley-interventional",
      background: BACKGROUND_DESCRIPTION,
      provenance: "synthetic",
      contributions: r.contributions,
    };
  });
}

// --------------------------------------------------------------------------
// What-if
// --------------------------------------------------------------------------

function applyOverrides(w: RawWeather, req: WhatIfRequest, timeMs: number): RawWeather {
  const o = req.overrides;
  const apply = (v: number, ov: { mode: "set" | "add" | "scale"; value: number } | undefined) =>
    !ov ? v : ov.mode === "set" ? ov.value : ov.mode === "add" ? v + ov.value : v * ov.value;
  const m: RawWeather = { ...w };

  if (o.cloud_cover_total) {
    m.cloud_cover_total = clamp(apply(w.cloud_cover_total, o.cloud_cover_total), 0, 100);
    const k = w.cloud_cover_total > 0 ? m.cloud_cover_total / w.cloud_cover_total : 1;
    m.cloud_cover_low = clamp(w.cloud_cover_total > 0 ? w.cloud_cover_low * k : m.cloud_cover_total, 0, 100);
    m.cloud_cover_mid = clamp(w.cloud_cover_total > 0 ? w.cloud_cover_mid * k : m.cloud_cover_total * 0.5, 0, 100);
    m.cloud_cover_high = clamp(w.cloud_cover_total > 0 ? w.cloud_cover_high * k : m.cloud_cover_total * 0.5, 0, 100);
    if ((req.couple_radiation_to_cloud ?? true) && !o.shortwave_radiation) {
      m.shortwave_radiation = w.shortwave_radiation * (cloudFactor(m.cloud_cover_total) / cloudFactor(w.cloud_cover_total));
    }
  }
  if (o.shortwave_radiation) {
    const v = apply(w.shortwave_radiation, o.shortwave_radiation);
    m.shortwave_radiation = w.solar_elevation > 0 ? clamp(v, 0, Math.max(w.clear_sky_radiation * 1.05, 0)) : 0;
  }
  if (o.temperature_2m) {
    m.temperature_2m = clamp(apply(w.temperature_2m, o.temperature_2m), -30, 45);
  }
  if (o.wind_speed_100m) {
    m.wind_speed_100m = clamp(apply(w.wind_speed_100m, o.wind_speed_100m), 0, 40);
    m.wind_speed_10m = w.wind_speed_100m > 0 ? w.wind_speed_10m * (m.wind_speed_100m / w.wind_speed_100m) : m.wind_speed_100m * 0.65;
  }
  const sun = sunPosition(timeMs, 45.9, 25.0);
  const split = splitRadiation(m.shortwave_radiation, sun.cosZenith, timeMs);
  m.direct_radiation = split.direct;
  m.diffuse_radiation = split.diffuse;
  m.icing_risk = icingRisk(m.temperature_2m, m.relative_humidity_2m);
  m.air_density = airDensity(m.temperature_2m, 150);
  m.regime = classifyRegime(m.cloud_cover_total, w.front);
  return m;
}

export function whatIf(req: WhatIfRequest, fromMs: number, toMs: number) {
  const base: ForecastPoint[] = [];
  const modified: ForecastPoint[] = [];
  const delta: ActualPoint[] = [];
  const baseWeather: WeatherPoint[] = [];
  const modWeather: WeatherPoint[] = [];
  for (const t of hoursIn(fromMs, toMs)) {
    const w = nationalWeather(t, req.issue_date);
    const mw = applyOverrides(w, req, t);
    const lead = (t - issueTimeMs(req.issue_date)) / HOUR_MS;
    const qb = quantilesFor(req.source, w, t, lead).q;
    const qm = quantilesFor(req.source, mw, t, lead).q;
    const time = toIso(t);
    base.push({ time, p10: r1(qb.p10), p50: r1(qb.p50), p90: r1(qb.p90) });
    modified.push({ time, p10: r1(qm.p10), p50: r1(qm.p50), p90: r1(qm.p90) });
    delta.push({ time, mw: r1(qm.p50 - qb.p50) });
    baseWeather.push(toWeatherPoint(w));
    modWeather.push(toWeatherPoint(mw));
  }
  const baseMwh = base.reduce((a, p) => a + p.p50, 0);
  const modMwh = modified.reduce((a, p) => a + p.p50, 0);
  return {
    base,
    modified,
    delta,
    baseWeather,
    modWeather,
    totals: {
      base_mwh: Math.round(baseMwh),
      modified_mwh: Math.round(modMwh),
      delta_mwh: Math.round(modMwh - baseMwh),
      delta_pct: baseMwh > 0 ? Math.round(((modMwh - baseMwh) / baseMwh) * 1000) / 10 : 0,
    },
  };
}

// --------------------------------------------------------------------------
// Regional map forecast
// --------------------------------------------------------------------------

export function regionalForecast(source: EnergySource, timeMs: number, issueDate?: string): RegionForecastProperties[] {
  const d = issueDate ?? defaultIssueDate(timeMs);
  const national = forecastHour(source, timeMs, d);
  const cap = capacityOf(source);
  const curtailed = source === "solar" && !!national.curtailed;
  const raw = DEV_REGIONS.map((r) => {
    const w = regionalWeather(r, timeMs, d);
    const share = source === "solar" ? r.solarShare : r.windShare;
    const cf = source === "solar" ? predictSolarFromInputs(solarInputsFrom(w, curtailed)) / cap : predictWindFromInputs(windInputsFrom(w)) / cap;
    return { r, w, share, mw: cf * cap * share };
  });
  const sum = raw.reduce((a, x) => a + x.mw, 0);
  const k = sum > 0 ? national.p50 / sum : 0;
  const lo = national.p50 > 0 ? national.p10 / national.p50 : 0;
  const hi = national.p50 > 0 ? national.p90 / national.p50 : 0;
  return raw.map(({ r, w, share, mw }) => {
    const p50 = mw * k;
    const installed = cap * share;
    return {
      code: r.code as DevRegionCode,
      name: r.name,
      centroid: r.centroid,
      source,
      installed_capacity_mw: Math.round(installed),
      p50: r1(p50),
      p10: r1(p50 * lo),
      p90: r1(p50 * hi),
      capacity_factor: installed > 0 ? Math.round((p50 / installed) * 1000) / 1000 : 0,
      share_of_national: national.p50 > 0 ? Math.round((p50 / national.p50) * 1000) / 1000 : 0,
      cloud_cover_total: r1(w.cloud_cover_total),
      shortwave_radiation: r1(w.shortwave_radiation),
      wind_speed_100m: r1(w.wind_speed_100m),
      temperature_2m: r1(w.temperature_2m),
    };
  });
}

// --------------------------------------------------------------------------
// Walk-forward backtest on synthetic data (feeds getModels)
// --------------------------------------------------------------------------

export interface BacktestResult {
  from: string;
  to: string;
  mae: number;
  rmse: number;
  coverage: number;
  pinball: number;
  persistenceMae: number;
  clearSkyMae?: number;
  n: number;
  maeByHour: { hour: number; mae_mw: number }[];
}

const btCache = memo<BacktestResult>(8);

/** Day-ahead (D+1) backtest over `days` issue dates ending two days before `nowMs`. */
export function backtest(source: EnergySource, nowMs: number, days = 28): BacktestResult {
  const today = localDateKey(nowMs);
  return btCache(`${source}|${today}|${days}`, () => {
    let ae = 0;
    let se = 0;
    let cover = 0;
    let pin = 0;
    let pae = 0;
    let cae = 0;
    let n = 0;
    const byHour = new Array(24).fill(0);
    const byHourN = new Array(24).fill(0);
    const firstIssue = addDays(today, -(days + 1));
    for (let i = 0; i < days; i++) {
      const d = addDays(firstIssue, i);
      const start = localMidnightUtcMs(addDays(d, 1));
      const end = localMidnightUtcMs(addDays(d, 2));
      const pers = persistenceSeries(source, start, end, d);
      const cs = source === "solar" ? clearSkySeries(start, end, d) : null;
      hoursIn(start, end).forEach((t, j) => {
        const f = forecastHour(source, t, d);
        const a = syntheticActual(source, t);
        const err = f.p50 - a;
        ae += Math.abs(err);
        se += err * err;
        if (a >= f.p10 - 1e-6 && a <= f.p90 + 1e-6) cover++;
        const pb = (q: number, tau: number) => (a >= q ? tau * (a - q) : (1 - tau) * (q - a));
        pin += (pb(f.p10, 0.1) + pb(f.p50, 0.5) + pb(f.p90, 0.9)) / 3;
        pae += Math.abs(pers[j].mw - a);
        if (cs) cae += Math.abs(cs[j].mw - a);
        const h = localParts(t).hour;
        byHour[h] += Math.abs(err);
        byHourN[h]++;
        n++;
      });
    }
    return {
      from: addDays(firstIssue, 1),
      to: addDays(firstIssue, days),
      mae: ae / n,
      rmse: Math.sqrt(se / n),
      coverage: cover / n,
      pinball: pin / n,
      persistenceMae: pae / n,
      clearSkyMae: source === "solar" ? cae / n : undefined,
      n,
      maeByHour: byHour.map((v, h) => ({ hour: h, mae_mw: r1(byHourN[h] ? v / byHourN[h] : 0) })),
    };
  });
}
