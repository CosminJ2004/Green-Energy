/**
 * Solar geometry and clear-sky radiation.
 * Sun position: low-precision astronomical algorithm (Astronomical Almanac /
 * NOAA style, ~0.01° accuracy), good enough for hourly PV modelling.
 */

const RAD = Math.PI / 180;

export interface SunPosition {
  /** Elevation above the horizon, degrees (negative at night). */
  elevation: number;
  /** Azimuth, degrees clockwise from north. */
  azimuth: number;
  /** Cosine of the zenith angle (clamped >= 0 is NOT applied). */
  cosZenith: number;
}

export function sunPosition(timeMs: number, latDeg: number, lonDeg: number): SunPosition {
  const jd = timeMs / 86_400_000 + 2440587.5;
  const n = jd - 2451545.0;
  const L = mod360(280.46 + 0.9856474 * n);
  const g = mod360(357.528 + 0.9856003 * n) * RAD;
  const lambda = (L + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * RAD;
  const eps = (23.439 - 0.0000004 * n) * RAD;
  const ra = Math.atan2(Math.cos(eps) * Math.sin(lambda), Math.cos(lambda));
  const dec = Math.asin(Math.sin(eps) * Math.sin(lambda));
  const gmstHours = mod(18.697374558 + 24.06570982441908 * n, 24);
  const lst = (gmstHours * 15 + lonDeg) * RAD;
  const ha = lst - ra;
  const lat = latDeg * RAD;
  const sinEl = Math.sin(lat) * Math.sin(dec) + Math.cos(lat) * Math.cos(dec) * Math.cos(ha);
  const el = Math.asin(Math.max(-1, Math.min(1, sinEl)));
  const az = Math.atan2(-Math.sin(ha), Math.tan(dec) * Math.cos(lat) - Math.sin(lat) * Math.cos(ha));
  return { elevation: el / RAD, azimuth: mod360(az / RAD), cosZenith: sinEl };
}

/** Day of year 1..366 (UTC). */
export function dayOfYear(timeMs: number): number {
  const d = new Date(timeMs);
  const start = Date.UTC(d.getUTCFullYear(), 0, 1);
  return Math.floor((timeMs - start) / 86_400_000) + 1;
}

/** Extraterrestrial irradiance on a normal surface, W/m². */
export function extraterrestrial(timeMs: number): number {
  return 1361 * (1 + 0.033 * Math.cos((2 * Math.PI * dayOfYear(timeMs)) / 365));
}

/** Haurwitz clear-sky GHI, W/m². */
export function clearSkyGhi(cosZenith: number): number {
  if (cosZenith <= 0.01) return 0;
  return 1098 * cosZenith * Math.exp(-0.057 / cosZenith);
}

/** Kasten-Czeplak: all-sky GHI factor for cloud cover in % (0-100). */
export function cloudFactor(cloudPct: number): number {
  const c = Math.min(1, Math.max(0, cloudPct / 100));
  return 1 - 0.75 * Math.pow(c, 3.4);
}

/** Erbs diffuse fraction from the clearness index kt. */
export function erbsDiffuseFraction(kt: number): number {
  if (kt <= 0.22) return 1 - 0.09 * kt;
  if (kt <= 0.8) return 0.9511 - 0.1604 * kt + 4.388 * kt ** 2 - 16.638 * kt ** 3 + 12.336 * kt ** 4;
  return 0.165;
}

/** Split GHI into direct-horizontal and diffuse parts. */
export function splitRadiation(ghi: number, cosZenith: number, timeMs: number): { direct: number; diffuse: number } {
  if (ghi <= 0 || cosZenith <= 0.01) return { direct: 0, diffuse: 0 };
  const kt = Math.min(1, ghi / (extraterrestrial(timeMs) * cosZenith));
  const diffuse = ghi * erbsDiffuseFraction(kt);
  return { direct: Math.max(0, ghi - diffuse), diffuse };
}

function mod(x: number, m: number) {
  return ((x % m) + m) % m;
}
function mod360(x: number) {
  return mod(x, 360);
}
