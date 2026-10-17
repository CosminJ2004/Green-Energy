/**
 * TRANSPARENT SURROGATE MODEL (stands in for the planned LightGBM quantile models).
 * Every equation is visible here and documented in web/FRONTEND.md.
 *
 * The functions take a small named feature vector so explain.ts can compute
 * exact Shapley values over exactly these inputs.
 */

import type { SolarFeature, WeatherPoint, WeatherRegime, WindFeature } from "@/lib/api/types";
import { clamp, normInv } from "./prng";

/** Installed capacities (TSO-metered, illustrative). */
export const SOLAR_CAPACITY_MW = 3500;
export const WIND_CAPACITY_MW = 3100;

export const SOLAR_MODEL_VERSION = "solar-surrogate-0.3.0 (stand-in for solar-lgbm-q)";
export const WIND_MODEL_VERSION = "wind-surrogate-0.3.0 (stand-in for wind-lgbm-q)";

// --------------------------------------------------------------------------
// Solar
// --------------------------------------------------------------------------

export type SolarInputs = Record<SolarFeature, number>;

export const SOLAR_PARAMS = {
  capacity: SOLAR_CAPACITY_MW,
  performanceRatio: 0.8,
  tiltDeg: 30,
  /** Cell temperature rise per W/m² of plane-of-array irradiance (NOCT-style). */
  cellTempCoeff: 0.028,
  /** Power temperature coefficient, per °C of cell temperature above 25 °C. */
  tempCoeff: -0.004,
  /** Max share of output lost when panels are fully snow-covered. */
  snowMaxLoss: 0.85,
  /** Snow depth (cm) at which the snow loss saturates. */
  snowSaturationCm: 15,
  /** Output cap when the negative-price curtailment proxy is active (share of capacity). */
  curtailmentCap: 0.55,
};

/**
 * Solar fleet output in MW.
 *   POA ≈ GHI·[(1−kd)·g_beam(e) + kd·(1+cos β)/2 + ρ_g(1−cos β)/2],  kd = 0.15 + 0.8·cloud
 *   g_beam(e) = min(2.2, sin(e+β)/sin e)    (south-facing, tilt β = 30°)
 *   IAM(e)   = 1 − exp(−sin e / 0.08)        (low-sun reflection/air-mass loss)
 *   T_cell   = T_air + 0.028·POA;  f_T = 1 − 0.004·max(0, T_cell − 25)
 *   f_snow   = 1 − 0.85·min(1, snow/15 cm)
 *   P        = C · PR · POA/1000 · IAM · f_T · f_snow;  if curtailed: P = min(P, 0.55·C)
 */
export function predictSolarFromInputs(x: SolarInputs): number {
  const p = SOLAR_PARAMS;
  const e = x.solar_elevation;
  const ghi = Math.max(0, x.shortwave_radiation);
  if (e <= 0 || ghi <= 0) return 0;
  const er = (e * Math.PI) / 180;
  const beta = (p.tiltDeg * Math.PI) / 180;
  const sinE = Math.max(0.02, Math.sin(er));
  const gBeam = Math.max(0, Math.min(2.2, Math.sin(er + beta) / sinE));
  const kd = 0.15 + 0.8 * clamp(x.cloud_cover_total / 100);
  const poa = ghi * ((1 - kd) * gBeam + kd * ((1 + Math.cos(beta)) / 2) + 0.2 * ((1 - Math.cos(beta)) / 2));
  const iam = 1 - Math.exp(-sinE / 0.08);
  const tCell = x.temperature_2m + p.cellTempCoeff * poa;
  const fT = 1 + p.tempCoeff * Math.max(0, tCell - 25);
  const fSnow = 1 - p.snowMaxLoss * clamp(x.snow_depth / p.snowSaturationCm);
  let mw = p.capacity * p.performanceRatio * (poa / 1000) * iam * fT * fSnow;
  if (x.curtailment_flag >= 0.5) mw = Math.min(mw, p.curtailmentCap * p.capacity);
  return Math.max(0, Math.min(p.capacity, mw));
}

export function solarInputsFrom(w: WeatherPoint, curtailed: boolean): SolarInputs {
  return {
    shortwave_radiation: w.shortwave_radiation,
    cloud_cover_total: w.cloud_cover_total,
    temperature_2m: w.temperature_2m,
    snow_depth: w.snow_depth,
    solar_elevation: w.solar_elevation,
    curtailment_flag: curtailed ? 1 : 0,
  };
}

/** Convenience: solar MW from a weather point (hour is implied by w.time via solar_elevation). */
export function predictSolar(w: WeatherPoint, curtailed = false): number {
  return predictSolarFromInputs(solarInputsFrom(w, curtailed));
}

// --------------------------------------------------------------------------
// Wind
// --------------------------------------------------------------------------

export type WindInputs = Record<WindFeature, number>;

export const WIND_PARAMS = {
  capacity: WIND_CAPACITY_MW,
  cutIn: 3,
  rated: 12,
  cutOut: 25,
  /** Fleet availability and electrical losses. */
  availability: 0.93,
  /** Max loss at full icing risk. */
  icingMaxLoss: 0.15,
  /** Best-aligned wind direction for the Dobrogea fleet (deg, NW). */
  bestDirection: 315,
  directionAmplitude: 0.045,
};

/**
 * Aggregated fleet power curve, 0-1 of capacity, on air-density-corrected speed.
 * Logistic shape anchored to 0 at cut-in and ~1 at rated; fleet-smoothed
 * high-wind shutdown from 23 m/s to 28 m/s (individual turbines cut out at 25 m/s).
 */
export function fleetPowerCurve(v: number): number {
  const p = WIND_PARAMS;
  if (v <= p.cutIn) return 0;
  const lg = (u: number) => 1 / (1 + Math.exp(-(u - 8.2) / 1.25));
  const lo = lg(p.cutIn);
  const hi = lg(p.rated + 3);
  let cf = clamp((lg(v) - lo) / (hi - lo));
  if (v > p.cutOut - 2) cf *= clamp(1 - (v - (p.cutOut - 2)) / 5);
  return cf;
}

/**
 * Wind fleet output in MW.
 *   ρ = 1.225·(288.15/(T+273.15))·e^(−200/8434);  v_eq = v100·(ρ/1.225)^(1/3)
 *   f_dir = 1 − 0.045·(1 − cos(dir − 315°))      (wake/terrain losses off the prevailing NW)
 *   f_ice = 1 − 0.15·icing_risk
 *   P = C · availability · curve(v_eq) · f_dir · f_ice
 */
export function predictWindFromInputs(x: WindInputs): number {
  const p = WIND_PARAMS;
  const rho = 1.225 * (288.15 / (x.temperature_2m + 273.15)) * Math.exp(-200 / 8434);
  const vEq = Math.max(0, x.wind_speed_100m) * Math.cbrt(rho / 1.225);
  const fDir = 1 - p.directionAmplitude * (1 - Math.cos(((x.wind_direction_100m - p.bestDirection) * Math.PI) / 180));
  const fIce = 1 - p.icingMaxLoss * clamp(x.icing_risk);
  return Math.max(0, p.capacity * p.availability * fleetPowerCurve(vEq) * fDir * fIce);
}

export function windInputsFrom(w: WeatherPoint): WindInputs {
  return {
    wind_speed_100m: w.wind_speed_100m,
    wind_direction_100m: w.wind_direction_100m,
    temperature_2m: w.temperature_2m,
    icing_risk: w.icing_risk,
  };
}

export function predictWind(w: WeatherPoint): number {
  return predictWindFromInputs(windInputsFrom(w));
}

// --------------------------------------------------------------------------
// Quantiles (regime-dependent spread, growing with lead time)
// --------------------------------------------------------------------------

const Z90 = normInv(0.9); // 1.2816

/** Relative GHI uncertainty (1σ) by regime. */
export const SOLAR_SPREAD: Record<WeatherRegime, number> = {
  clear: 0.06,
  partly_cloudy: 0.2,
  overcast: 0.3,
  front: 0.36,
};
/** Relative 100 m wind-speed uncertainty (1σ) by regime, plus 0.5 m/s floor. */
export const WIND_SPREAD: Record<WeatherRegime, number> = {
  clear: 0.1,
  partly_cloudy: 0.12,
  overcast: 0.14,
  front: 0.2,
};

function leadFactor(leadHours: number): number {
  return 1 + 0.12 * Math.max(0, leadHours / 24 - 0.5);
}

export interface Quantiles {
  p10: number;
  p50: number;
  p90: number;
}

/**
 * Solar quantiles: re-run the model with irradiance perturbed by ±z·σ (σ by regime);
 * the upside is bounded by clear-sky irradiance; cloud moves with irradiance.
 */
export function solarQuantiles(w: WeatherPoint, curtailed: boolean, leadHours: number): Quantiles {
  const base = solarInputsFrom(w, curtailed);
  const p50 = predictSolarFromInputs(base);
  if (p50 <= 0) return { p10: 0, p50: 0, p90: 0 };
  const s = SOLAR_SPREAD[w.regime] * leadFactor(leadHours);
  const hiGhi = Math.min(Math.max(w.clear_sky_radiation, w.shortwave_radiation), w.shortwave_radiation * (1 + Z90 * s * 1.1));
  const loGhi = w.shortwave_radiation * Math.max(0.05, 1 - Z90 * s);
  const p90 = predictSolarFromInputs({ ...base, shortwave_radiation: hiGhi, cloud_cover_total: Math.max(0, base.cloud_cover_total - 100 * s) });
  const p10 = predictSolarFromInputs({ ...base, shortwave_radiation: loGhi, cloud_cover_total: Math.min(100, base.cloud_cover_total + 100 * s) });
  return { p10: Math.min(p10, p50), p50, p90: Math.max(p90, p50) };
}

/**
 * Wind quantiles: propagate a normal wind-speed error through the non-linear
 * power curve (21-point quadrature, empirical 10th/90th percentiles).
 */
export function windQuantiles(w: WeatherPoint, leadHours: number): Quantiles {
  const base = windInputsFrom(w);
  const p50 = predictWindFromInputs(base);
  const sigma = (WIND_SPREAD[w.regime] * w.wind_speed_100m + 0.5) * leadFactor(leadHours);
  const samples: number[] = [];
  for (let i = 0; i < 21; i++) {
    const z = normInv((i + 0.5) / 21);
    samples.push(predictWindFromInputs({ ...base, wind_speed_100m: Math.max(0, w.wind_speed_100m + z * sigma) }));
  }
  samples.sort((a, b) => a - b);
  const q = (p: number) => samples[Math.min(20, Math.max(0, Math.round(p * 20)))];
  return { p10: Math.min(q(0.1), p50), p50, p90: Math.max(q(0.9), p50) };
}
