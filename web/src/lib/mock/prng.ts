/**
 * Deterministic randomness. Nothing here touches Math.random: every value is a
 * pure function of a string key (typically a date or "field:hourIndex"), so the
 * same date always produces the same demo data, on server and client alike.
 */

/** 32-bit FNV-1a hash of a string. */
export function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Mulberry32 PRNG: returns a function yielding floats in [0, 1). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** PRNG seeded by a key, e.g. rngFor("2026-10-17", "prices"). */
export function rngFor(...keys: (string | number)[]): () => number {
  return mulberry32(hashString(keys.join("|")));
}

/** A single uniform [0,1) value for a key (stateless). */
export function uniform(...keys: (string | number)[]): number {
  return rngFor(...keys)();
}

/** Standard normal via Box-Muller from a key. */
export function gaussian(...keys: (string | number)[]): number {
  const r = rngFor(...keys);
  const u = Math.max(1e-12, r());
  const v = r();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

const smootherstep = (x: number) => x * x * x * (x * (x * 6 - 15) + 10);

/**
 * Smooth 1-D value noise in [0,1] over a continuous coordinate `t` (hours),
 * with knots every `period` hours. Knot values are keyed by (field, period, knot index),
 * so any time range can be generated independently and consistently.
 */
export function valueNoise(field: string, t: number, period: number): number {
  const x = t / period;
  const k = Math.floor(x);
  const f = smootherstep(x - k);
  const a = uniform(field, period, k);
  const b = uniform(field, period, k + 1);
  return a + (b - a) * f;
}

/**
 * Fractal sum of value noise, normalised to roughly [0,1] with mean ~0.5.
 * `octaves` are [periodHours, weight] pairs.
 */
export function fbm(field: string, t: number, octaves: [number, number][]): number {
  let sum = 0;
  let wsum = 0;
  for (const [period, w] of octaves) {
    sum += w * valueNoise(field, t, period);
    wsum += w;
  }
  // Sum of uniforms concentrates around 0.5; stretch so the tails are reachable.
  const v = 0.5 + (sum / wsum - 0.5) * 1.6;
  return Math.min(1, Math.max(0, v));
}

export const clamp = (x: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, x));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Approximate inverse of the standard normal CDF (Acklam), for quantiles. */
export function normInv(p: number): number {
  const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239];
  const b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572];
  const c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416];
  const pl = 0.02425;
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  if (p < pl) {
    const q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  if (p > 1 - pl) {
    const q = Math.sqrt(-2 * Math.log(1 - p));
    return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  const q = p - 0.5;
  const r = q * q;
  return ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
}

/** Tiny memo cache (insertion-ordered LRU) for expensive mock computations. */
export function memo<T>(limit = 200) {
  const cache = new Map<string, T>();
  return (key: string, compute: () => T): T => {
    const hit = cache.get(key);
    if (hit !== undefined) {
      cache.delete(key);
      cache.set(key, hit);
      return hit;
    }
    const v = compute();
    cache.set(key, v);
    if (cache.size > limit) cache.delete(cache.keys().next().value as string);
    return v;
  };
}
