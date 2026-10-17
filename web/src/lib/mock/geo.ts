/**
 * Approximate, illustrative geography of Romania for the demo.
 * Polygons are hand-simplified (a few dozen vertices) — fine for a national
 * overview map, NOT for any analytical use.
 */

import type { DevRegionCode, Position } from "@/lib/api/types";

export interface DevRegion {
  code: DevRegionCode;
  name: string;
  /** Approximate representative point used for weather (lon, lat). */
  centroid: Position;
  /** Share of national TSO-metered solar capacity (sums to 1). */
  solarShare: number;
  /** Share of national wind capacity (sums to 1). */
  windShare: number;
  /** Wind-resource multiplier at 100 m relative to the national mean. */
  windFactor: number;
  /** Mean elevation proxy (m) for temperature lapse. */
  elevation: number;
  polygon: Position[];
}

/** Coarse outline of Romania (lon, lat), clockwise from the western tip. */
export const ROMANIA_OUTLINE: Position[] = [
  [20.26, 46.12], [20.75, 46.5], [21.45, 46.68], [21.6, 47.05], [21.9, 47.6], [22.3, 47.8], [22.9, 47.95],
  [23.5, 48.0], [24.0, 47.95], [24.9, 47.73], [25.9, 47.95], [26.6, 48.26], [27.3, 48.05], [27.8, 47.45],
  [28.1, 46.95], [28.15, 46.4], [28.1, 46.1], [28.2, 45.47], [28.7, 45.25], [29.3, 45.4], [29.7, 45.2],
  [29.6, 44.85], [29.0, 44.6], [28.65, 44.3], [28.58, 43.74], [27.75, 43.95], [27.0, 44.15], [26.1, 43.95],
  [25.0, 43.68], [24.7, 43.72], [24.0, 43.72], [23.0, 43.83], [22.9, 43.95], [22.68, 44.25], [22.45, 44.5],
  [22.4, 44.7], [22.0, 44.62], [21.4, 44.78], [21.36, 45.0], [20.9, 45.45], [20.75, 45.75], [20.26, 46.12],
];

// Shared junction vertices so neighbouring regions line up.
const B: Position = [21.45, 46.68];
const C: Position = [22.7, 46.35];
const D: Position = [23.3, 45.35];
const E: Position = [22.4, 44.7];
const F: Position = [25.1, 47.2];
const G: Position = [25.9, 46.85];
const H: Position = [26.4, 46.1];
const J: Position = [26.1, 45.45];
const K: Position = [24.5, 45.5];
const L: Position = [28.1, 46.1];
const M: Position = [27.75, 43.95];
const N: Position = [24.7, 43.72];

const close = (ring: Position[]): Position[] => [...ring, ring[0]];

export const DEV_REGIONS: DevRegion[] = [
  {
    code: "NE",
    name: "North-East",
    centroid: [26.8, 47.15],
    solarShare: 0.07,
    windShare: 0.06,
    windFactor: 0.9,
    elevation: 350,
    polygon: close([F, [24.9, 47.73], [25.9, 47.95], [26.6, 48.26], [27.3, 48.05], [27.8, 47.45], [28.1, 46.95], [28.15, 46.4], L, [27.3, 46.1], H, G]),
  },
  {
    code: "SE",
    name: "South-East (Dobrogea)",
    centroid: [28.3, 44.9],
    solarShare: 0.15,
    windShare: 0.8,
    windFactor: 1.1,
    elevation: 100,
    polygon: close([L, [28.2, 45.47], [28.7, 45.25], [29.3, 45.4], [29.7, 45.2], [29.6, 44.85], [29.0, 44.6], [28.65, 44.3], [28.58, 43.74], M, [27.9, 44.3], [27.4, 44.75], [26.5, 45.0], J, H, [27.3, 46.1]]),
  },
  {
    code: "SM",
    name: "South-Muntenia",
    centroid: [25.7, 44.4],
    solarShare: 0.2,
    windShare: 0.03,
    windFactor: 0.85,
    elevation: 150,
    polygon: close([J, [26.5, 45.0], [27.4, 44.75], [27.9, 44.3], M, [27.0, 44.15], [26.1, 43.95], [25.0, 43.68], N, [24.75, 44.3], [24.6, 44.9], K, [25.2, 45.4]]),
  },
  {
    code: "SV",
    name: "South-West Oltenia",
    centroid: [23.8, 44.4],
    solarShare: 0.22,
    windShare: 0.04,
    windFactor: 0.85,
    elevation: 200,
    polygon: close([D, K, [24.6, 44.9], [24.75, 44.3], N, [24.0, 43.72], [23.0, 43.83], [22.9, 43.95], [22.68, 44.25], [22.45, 44.5], E]),
  },
  {
    code: "V",
    name: "West",
    centroid: [21.8, 45.75],
    solarShare: 0.12,
    windShare: 0.05,
    windFactor: 0.85,
    elevation: 200,
    polygon: close([[20.26, 46.12], [20.75, 46.5], B, C, D, E, [22.0, 44.62], [21.4, 44.78], [21.36, 45.0], [20.9, 45.45], [20.75, 45.75]]),
  },
  {
    code: "NV",
    name: "North-West",
    centroid: [23.2, 47.15],
    solarShare: 0.08,
    windShare: 0.01,
    windFactor: 0.8,
    elevation: 400,
    polygon: close([B, [21.6, 47.05], [21.9, 47.6], [22.3, 47.8], [22.9, 47.95], [23.5, 48.0], [24.0, 47.95], [24.9, 47.73], F, [24.6, 46.95], [24.1, 46.75], [23.5, 46.3], C]),
  },
  {
    code: "C",
    name: "Centre",
    centroid: [24.9, 46.1],
    solarShare: 0.1,
    windShare: 0.01,
    windFactor: 0.8,
    elevation: 550,
    polygon: close([C, [23.5, 46.3], [24.1, 46.75], [24.6, 46.95], F, G, H, J, [25.2, 45.4], K, D]),
  },
  {
    code: "BI",
    name: "Bucharest-Ilfov",
    centroid: [26.1, 44.45],
    solarShare: 0.06,
    windShare: 0.0,
    windFactor: 0.8,
    elevation: 80,
    polygon: close([[25.85, 44.6], [26.25, 44.75], [26.45, 44.45], [26.2, 44.25], [25.9, 44.3]]),
  },
];

export const REGION_BY_CODE: Record<DevRegionCode, DevRegion> = Object.fromEntries(
  DEV_REGIONS.map((r) => [r.code, r]),
) as Record<DevRegionCode, DevRegion>;

/** Capacity-weighted centroid used for national solar geometry (~45.9N 25E guidance, shifted south by solar siting). */
export const NATIONAL_POINT: Position = [25.0, 45.9];

/** Ray-casting point-in-polygon. */
export function pointInPolygon([x, y]: Position, ring: Position[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Great-circle distance in km. */
export function haversineKm([lon1, lat1]: Position, [lon2, lat2]: Position): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/** Distance (km) from a point to a polyline (planar approximation, fine at this scale). */
export function distanceToLineKm(p: Position, line: Position[]): number {
  let best = Infinity;
  const kx = 111.32 * Math.cos((p[1] * Math.PI) / 180);
  const ky = 110.57;
  for (let i = 0; i < line.length - 1; i++) {
    const ax = (line[i][0] - p[0]) * kx;
    const ay = (line[i][1] - p[1]) * ky;
    const bx = (line[i + 1][0] - p[0]) * kx;
    const by = (line[i + 1][1] - p[1]) * ky;
    const dx = bx - ax;
    const dy = by - ay;
    const len2 = dx * dx + dy * dy;
    const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, -(ax * dx + ay * dy) / len2));
    const cx = ax + t * dx;
    const cy = ay + t * dy;
    best = Math.min(best, Math.hypot(cx, cy));
  }
  return best;
}

/** Which development region a point falls in (BI checked first; falls back to nearest centroid). */
export function regionAt(p: Position): DevRegionCode {
  const order: DevRegionCode[] = ["BI", "NE", "SE", "SM", "SV", "V", "NV", "C"];
  for (const code of order) if (pointInPolygon(p, REGION_BY_CODE[code].polygon)) return code;
  let best: DevRegionCode = "C";
  let bestD = Infinity;
  for (const r of DEV_REGIONS) {
    const d = haversineKm(p, r.centroid);
    if (d < bestD) {
      bestD = d;
      best = r.code;
    }
  }
  return best;
}
