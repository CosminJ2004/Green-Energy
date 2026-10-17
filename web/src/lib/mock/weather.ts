/**
 * Synthetic, physically plausible hourly weather for Romania.
 *
 * - Synoptic "fields" (cloudiness, windiness, fronts, temperature anomaly) are
 *   smooth deterministic noise over time, lagged west→east (~1.8 h per degree of
 *   longitude) so fronts sweep across the country.
 * - Seasonal and diurnal cycles: temperature climatology by latitude/elevation,
 *   cloud-dependent diurnal range, windier winters, nocturnal low-level jet,
 *   winter snow cover.
 * - Solar geometry is computed properly (see solar.ts); GHI = Haurwitz clear-sky
 *   × Kasten-Czeplak cloud factor; direct/diffuse split by Erbs.
 * - An NWP *forecast* issued on date D is the "truth" (analysis) perturbed by
 *   errors keyed by D that grow with lead time, including front timing errors.
 * - National aggregates are capacity-weighted over the 8 development regions
 *   (solar weights for radiation/cloud/temperature/snow, wind weights for wind).
 */

import type { DevRegionCode, WeatherPoint, WeatherRegime } from "@/lib/api/types";
import { HOUR_MS, localMidnightUtcMs, toIso } from "@/lib/time";
import { DEV_REGIONS, NATIONAL_POINT, REGION_BY_CODE, type DevRegion } from "./geo";
import { clamp, fbm, memo, uniform } from "./prng";
import { clearSkyGhi, cloudFactor, dayOfYear, splitRadiation, sunPosition } from "./solar";

export interface RawWeather extends WeatherPoint {
  /** 0-1 intensity of a frontal passage. */
  front: number;
}

/** Forecast issue instant for issue date D: 10:00 Bucharest time (before the 13:00 EET day-ahead gate closure). */
export function issueTimeMs(issueDate: string): number {
  return localMidnightUtcMs(issueDate) + 10 * HOUR_MS;
}

/** Seasonal index: +1 mid-July, -1 mid-January. */
export function summerness(timeMs: number): number {
  return Math.cos((2 * Math.PI * (dayOfYear(timeMs) - 196)) / 365);
}

function solarHour(timeMs: number, lon: number): number {
  const h = (timeMs / HOUR_MS) % 24;
  return (((h + lon / 15) % 24) + 24) % 24;
}

/** Climatological 2 m temperature (no weather noise). */
export function climatologyTemperature(timeMs: number, lat: number, lon: number, elevation: number, cloudPct = 55): number {
  const s = summerness(timeMs);
  const annual = 11.2 - (lat - 44.5) * 0.9 - elevation * 0.0065;
  const seasonal = annual + 12 * s;
  const amp = (3 + 6 * (1 - cloudPct / 100)) * (0.8 + 0.2 * s);
  return seasonal + (amp / 2) * Math.cos((2 * Math.PI * (solarHour(timeMs, lon) - 14.5)) / 24);
}

/** Climatological mean total cloud cover, % (cloudier in winter). */
export function climatologyCloud(timeMs: number): number {
  return 52 - 17 * summerness(timeMs);
}

/** Climatological mean 100 m wind speed, m/s, for a region. */
export function climatologyWind(timeMs: number, windFactor: number): number {
  return (5.9 + 0.9 * -summerness(timeMs)) * windFactor;
}

export function airDensity(tempC: number, elevationM = 100): number {
  return 1.225 * (288.15 / (tempC + 273.15)) * Math.exp(-(elevationM + 100) / 8434);
}

/** Icing risk 0-1: near-freezing, saturated air. */
export function icingRisk(tempC: number, rh: number): number {
  return clamp((1.5 - tempC) / 3) * clamp((tempC + 9) / 4) * clamp((rh - 85) / 12);
}

export function classifyRegime(cloudTotal: number, front: number): WeatherRegime {
  if (front > 0.35) return "front";
  if (cloudTotal < 20) return "clear";
  if (cloudTotal > 75) return "overcast";
  return "partly_cloudy";
}

const W = (period: number, w: number): [number, number] => [period, w];

/** Weather for one development region at one hour. `issueDate` = NWP run (omit for analysis/"truth"). */
export function regionalWeather(region: DevRegion, timeMs: number, issueDate?: string): RawWeather {
  const [lon, lat] = region.centroid;
  const th = timeMs / HOUR_MS;
  let tl = th - (lon - 25) * 1.8;

  let leadDays = 0;
  if (issueDate) {
    leadDays = Math.max(0, (timeMs - issueTimeMs(issueDate)) / (24 * HOUR_MS));
    // Front/timing error: the whole synoptic pattern arrives early or late.
    const shift = (uniform("e-shift", issueDate) - 0.5) * 2 * (2 + 2 * leadDays);
    tl += shift;
  }

  const s = summerness(timeMs);
  let cloudRaw = fbm("cloud", tl, [W(72, 0.5), W(24, 0.32), W(8, 0.18)]);
  let windRaw = fbm("wind", tl, [W(60, 0.5), W(20, 0.35), W(6, 0.15)]);
  const frontRaw = fbm("front", tl, [W(40, 0.7), W(12, 0.3)]);
  let tAnom = fbm("tanom", tl, [W(96, 0.6), W(36, 0.4)]) - 0.5;
  const dirRaw = fbm("dir", tl, [W(48, 0.6), W(16, 0.4)]);

  if (issueDate) {
    const amp = 0.17 + 0.06 * leadDays;
    cloudRaw += (fbm(`e-cloud|${issueDate}`, tl, [W(14, 0.6), W(5, 0.4)]) - 0.5) * 2 * amp;
    windRaw *= 1 + (fbm(`e-wind|${issueDate}`, tl, [W(18, 0.6), W(6, 0.4)]) - 0.5) * 2 * (0.26 + 0.08 * leadDays);
    tAnom += (fbm(`e-temp|${issueDate}`, tl, [W(24, 1)]) - 0.5) * 0.25;
  }

  const front = clamp((frontRaw - (0.9 + 0.02 * s)) / 0.08);

  // Clouds
  const cBase = cloudRaw + 0.1 * -s + 0.55 * front;
  const total = 100 * Math.pow(clamp((cBase - 0.24) / 0.58), 1.1);
  const rl = 0.25 + 0.75 * valueNoiseSafe(`cl-low|${region.code}`, tl, 30) + 0.25 * -s;
  const rm = 0.25 + 0.75 * valueNoiseSafe(`cl-mid|${region.code}`, tl, 26) + 0.3 * front;
  const rh_ = 0.25 + 0.75 * valueNoiseSafe(`cl-high|${region.code}`, tl, 20) + 0.1 * s;
  const rmax = Math.max(rl, rm, rh_);
  const low = total * clamp(rl / rmax, 0, 1);
  const mid = total * clamp(rm / rmax, 0, 1);
  const high = total * clamp(rh_ / rmax, 0, 1);

  // Temperature and humidity
  const tClim = climatologyTemperature(timeMs, lat, lon, region.elevation, total);
  const temperature = tClim + tAnom * 11 - 3.5 * front;
  const sh = solarHour(timeMs, lon);
  const diurnal = Math.cos((2 * Math.PI * (sh - 14.5)) / 24);
  const humidity = clamp(58 + 28 * (total / 100) - 12 * diurnal + 6 * -s + 10 * front, 22, 100);

  // Wind
  const vMean = climatologyWind(timeMs, region.windFactor);
  const jet = 0.7 * Math.cos((2 * Math.PI * (sh - 2)) / 24);
  const v100 = clamp(vMean * (0.15 + 1.6 * windRaw) + 7 * front + jet, 0.3, 32);
  const alpha = 0.17 + 0.09 * Math.cos((2 * Math.PI * (sh - 2)) / 24);
  const v10 = v100 * Math.pow(0.1, alpha);
  const direction = (((300 + (dirRaw - 0.5) * 220 - 50 * front) % 360) + 360) % 360;

  // Snow (Dec-Feb mostly; more in hills)
  const winterness = clamp((-s - 0.55) / 0.45);
  const snowField = clamp((fbm("snow", th, [W(150, 0.6), W(50, 0.4)]) - 0.42) / 0.25);
  const melt = temperature < 2 ? 1 : clamp(1 - (temperature - 2) / 6);
  const snow = 28 * winterness * snowField * melt * (1 + region.elevation / 800);

  // Radiation
  const sun = sunPosition(timeMs, lat, lon);
  const cs = clearSkyGhi(sun.cosZenith);
  let ghi = cs * cloudFactor(total) * (1 - 0.12 * front);
  if (issueDate) {
    // NWP irradiance error: largest under broken cloud, grows with lead time.
    const e = (fbm(`e-ghi|${issueDate}`, tl, [W(9, 0.6), W(3, 0.4)]) - 0.5) * 2;
    const amp = (0.22 + 0.06 * leadDays) * (0.35 + 0.65 * Math.sin((Math.PI * total) / 100) + 0.3 * (total / 100));
    ghi = Math.min(cs, ghi * clamp(1 + e * amp, 0.15, 1.6));
  }
  const { direct, diffuse } = splitRadiation(ghi, sun.cosZenith, timeMs);

  return {
    time: toIso(timeMs),
    shortwave_radiation: ghi,
    direct_radiation: direct,
    diffuse_radiation: diffuse,
    clear_sky_radiation: cs,
    cloud_cover_low: low,
    cloud_cover_mid: mid,
    cloud_cover_high: high,
    cloud_cover_total: total,
    temperature_2m: temperature,
    wind_speed_10m: v10,
    wind_speed_100m: v100,
    wind_direction_100m: direction,
    relative_humidity_2m: humidity,
    snow_depth: snow,
    solar_elevation: sun.elevation,
    icing_risk: icingRisk(temperature, humidity),
    air_density: airDensity(temperature, region.elevation),
    regime: classifyRegime(total, front),
    front,
  };
}

function valueNoiseSafe(field: string, t: number, period: number): number {
  return fbm(field, t, [W(period, 1)]);
}

const nationalCache = memo<RawWeather>(6000);

/**
 * Capacity-weighted national weather at one hour.
 * Radiation, cloud, temperature, humidity and snow use solar-capacity weights;
 * wind speed/direction, icing and air density use wind-capacity weights.
 * Solar elevation is evaluated at the solar-weighted centroid (~45.9N 25E).
 */
export function nationalWeather(timeMs: number, issueDate?: string): RawWeather {
  return nationalCache(`${timeMs}|${issueDate ?? "a"}`, () => {
    const regs = DEV_REGIONS.map((r) => ({ r, w: regionalWeather(r, timeMs, issueDate) }));
    const ws = (f: (x: RawWeather) => number) => regs.reduce((acc, { r, w }) => acc + r.solarShare * f(w), 0);
    const ww = (f: (x: RawWeather) => number) => regs.reduce((acc, { r, w }) => acc + r.windShare * f(w), 0);
    const sx = ww((w) => Math.sin((w.wind_direction_100m * Math.PI) / 180));
    const cx = ww((w) => Math.cos((w.wind_direction_100m * Math.PI) / 180));
    const dir = (((Math.atan2(sx, cx) * 180) / Math.PI) % 360 + 360) % 360;
    const [lon, lat] = NATIONAL_POINT;
    const sun = sunPosition(timeMs, lat, lon);
    const total = ws((w) => w.cloud_cover_total);
    const front = Math.max(ws((w) => w.front), ww((w) => w.front));
    return {
      time: toIso(timeMs),
      shortwave_radiation: ws((w) => w.shortwave_radiation),
      direct_radiation: ws((w) => w.direct_radiation),
      diffuse_radiation: ws((w) => w.diffuse_radiation),
      clear_sky_radiation: ws((w) => w.clear_sky_radiation),
      cloud_cover_low: ws((w) => w.cloud_cover_low),
      cloud_cover_mid: ws((w) => w.cloud_cover_mid),
      cloud_cover_high: ws((w) => w.cloud_cover_high),
      cloud_cover_total: total,
      temperature_2m: ws((w) => w.temperature_2m),
      wind_speed_10m: ww((w) => w.wind_speed_10m),
      wind_speed_100m: ww((w) => w.wind_speed_100m),
      wind_direction_100m: dir,
      relative_humidity_2m: ws((w) => w.relative_humidity_2m),
      snow_depth: ws((w) => w.snow_depth),
      solar_elevation: sun.elevation,
      icing_risk: ww((w) => w.icing_risk),
      air_density: ww((w) => w.air_density),
      regime: classifyRegime(total, front),
      front,
    };
  });
}

/** Weather for a development region or the national aggregate. */
export function weatherAt(timeMs: number, opts: { issueDate?: string; devRegion?: DevRegionCode } = {}): RawWeather {
  if (opts.devRegion) return regionalWeather(REGION_BY_CODE[opts.devRegion], timeMs, opts.issueDate);
  return nationalWeather(timeMs, opts.issueDate);
}

/** Strip internal fields for API output (rounded for readability). */
export function toWeatherPoint(w: RawWeather): WeatherPoint {
  const r1 = (x: number) => Math.round(x * 10) / 10;
  const r3 = (x: number) => Math.round(x * 1000) / 1000;
  return {
    time: w.time,
    shortwave_radiation: r1(w.shortwave_radiation),
    direct_radiation: r1(w.direct_radiation),
    diffuse_radiation: r1(w.diffuse_radiation),
    clear_sky_radiation: r1(w.clear_sky_radiation),
    cloud_cover_low: r1(w.cloud_cover_low),
    cloud_cover_mid: r1(w.cloud_cover_mid),
    cloud_cover_high: r1(w.cloud_cover_high),
    cloud_cover_total: r1(w.cloud_cover_total),
    temperature_2m: r1(w.temperature_2m),
    wind_speed_10m: r1(w.wind_speed_10m),
    wind_speed_100m: r1(w.wind_speed_100m),
    wind_direction_100m: Math.round(w.wind_direction_100m),
    relative_humidity_2m: r1(w.relative_humidity_2m),
    snow_depth: r1(w.snow_depth),
    solar_elevation: r1(w.solar_elevation),
    icing_risk: r3(w.icing_risk),
    air_density: r3(w.air_density),
    regime: w.regime,
  };
}
