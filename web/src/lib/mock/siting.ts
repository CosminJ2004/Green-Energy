/**
 * Siting assistant (docs/07): multi-criteria scoring on a ~0.3° × 0.2° grid
 * (~25 × 22 km) of candidate cells inside Romania. Every criterion is a
 * transparent, normalised 0–1 proxy computed from the illustrative geography
 * below. Indicative only — not engineering advice.
 */

import type { Feature, PolygonGeometry, Position, SitingCellProperties, SitingCriterion, SitingCriterionInfo, SitingRequest } from "@/lib/api/types";
import { ROMANIA_OUTLINE, distanceToLineKm, haversineKm, pointInPolygon } from "./geo";
import { POINT_ASSETS, SUBSTATIONS, LINE_ROUTES, lineGeometry } from "./infrastructure";
import { clamp, memo } from "./prng";

export const SITING_CRITERIA: SitingCriterionInfo[] = [
  { key: "grid_proximity", label: "Grid proximity", description: "Closeness to 400 kV substations and lines (proxy only: node headroom is not public).", data_basis: "Approximate 400 kV substations/lines (OSM/Transelectrica planned)" },
  { key: "renewable_supply", label: "Renewable supply", description: "Nearby solar and wind capacity plus solar resource (south is sunnier).", data_basis: "Illustrative plant list; latitude-based solar resource" },
  { key: "supply_variability", label: "Supply stability", description: "Higher = steadier supply: mixed solar/wind and nearby dispatchable hydro.", data_basis: "Synthetic proxy (later: this platform's backtests)" },
  { key: "cooling_climate", label: "Cooling climate", description: "Cooler annual mean temperature lowers cooling energy (hills and north score higher).", data_basis: "Latitude + Carpathian elevation proxy (later: ERA5)" },
  { key: "connectivity", label: "Connectivity", description: "Closeness to major fibre hubs / internet exchange cities.", data_basis: "City list proxy (later: IXP lists, OSM)" },
  { key: "water_hazard", label: "Water & hazard", description: "Water availability from major rivers, penalised for floodplain hazard.", data_basis: "Simplified river lines; Danube floodplain buffer" },
];

export const SITING_ASSUMPTIONS = [
  "Synthetic demo data: all criteria are simplified proxies on approximate geography.",
  "Grid capacity headroom is not public at node level, so grid proximity is only a proxy.",
  "Hard constraints (when enabled): protected areas (approximate Natura 2000 / national parks) and the Danube floodplain are excluded.",
  "Weights are relative and normalised to sum to 1; the score is the weighted sum of 0–1 criteria.",
  "Indicative decision support for a talk, not engineering or investment advice.",
];

const CITIES: { name: string; at: Position; hub: number }[] = [
  { name: "Bucharest", at: [26.1, 44.43], hub: 1 },
  { name: "Cluj-Napoca", at: [23.6, 46.77], hub: 0.85 },
  { name: "Timisoara", at: [21.23, 45.75], hub: 0.8 },
  { name: "Iasi", at: [27.6, 47.16], hub: 0.75 },
  { name: "Constanta", at: [28.63, 44.17], hub: 0.75 },
  { name: "Brasov", at: [25.6, 45.65], hub: 0.7 },
  { name: "Craiova", at: [23.8, 44.32], hub: 0.65 },
  { name: "Oradea", at: [21.92, 47.05], hub: 0.6 },
  { name: "Sibiu", at: [24.15, 45.79], hub: 0.6 },
  { name: "Galati", at: [28.05, 45.43], hub: 0.6 },
  { name: "Ploiesti", at: [26.02, 44.94], hub: 0.6 },
  { name: "Pitesti", at: [24.87, 44.86], hub: 0.55 },
  { name: "Bacau", at: [26.91, 46.57], hub: 0.5 },
  { name: "Suceava", at: [26.25, 47.65], hub: 0.5 },
  { name: "Targu Mures", at: [24.56, 46.54], hub: 0.5 },
  { name: "Baia Mare", at: [23.58, 47.66], hub: 0.45 },
];

const CARPATHIANS: Position[] = [
  [22.6, 45.3], [23.5, 45.4], [24.5, 45.5], [25.5, 45.45], [26.2, 45.7], [26.3, 46.4], [25.8, 47.0], [25.3, 47.6], [24.6, 47.7],
];
const APUSENI: Position = [22.8, 46.5];

const DANUBE: Position[] = [
  [22.4, 44.7], [22.68, 44.25], [22.9, 43.95], [23.0, 43.83], [24.0, 43.72], [25.0, 43.68], [26.1, 43.95], [27.0, 44.15],
  [27.9, 44.15], [28.0, 44.6], [27.95, 45.2], [28.2, 45.45], [28.7, 45.25], [29.7, 45.2],
];
const RIVERS: Position[][] = [
  DANUBE,
  [[21.3, 46.15], [22.9, 45.95], [24.3, 46.5]], // Mures
  [[24.4, 43.75], [24.3, 44.6], [24.27, 45.5], [25.2, 45.8], [25.8, 46.3]], // Olt
  [[26.2, 47.9], [26.9, 46.9], [27.4, 46.2], [28.0, 45.45]], // Siret
  [[23.0, 47.6], [23.6, 47.2], [23.9, 46.9]], // Somes
  [[23.5, 44.0], [23.8, 44.5], [23.4, 45.0]], // Jiu
];

const PROTECTED: { name: string; at: Position; km: number }[] = [
  { name: "Retezat National Park", at: [22.85, 45.35], km: 22 },
  { name: "Fagaras Mountains", at: [24.7, 45.6], km: 26 },
  { name: "Piatra Craiului / Bucegi", at: [25.4, 45.42], km: 18 },
  { name: "Rodna Mountains", at: [24.8, 47.55], km: 20 },
  { name: "Apuseni Natural Park", at: [22.75, 46.55], km: 22 },
  { name: "Macin Mountains", at: [28.3, 45.2], km: 14 },
  { name: "Ceahlau / Bicaz Gorges", at: [25.95, 46.95], km: 15 },
];

function inDanubeDelta([lon, lat]: Position): boolean {
  return lon > 28.65 && lat > 44.8 && lat < 45.5;
}

const CELL: [number, number] = [0.3, 0.2];

interface CellBase {
  id: string;
  centroid: Position;
  polygon: Position[];
  criteria: Record<SitingCriterion, number>;
  protectedReason?: string;
  floodReason?: string;
  nearestSubstation: string;
  nearestSubstationKm: number;
  nearestCity: string;
}

const gridCache = memo<CellBase[]>(2);

function buildGrid(): CellBase[] {
  return gridCache("grid", () => {
    const lines = LINE_ROUTES.map(lineGeometry);
    const renewables = POINT_ASSETS.filter((a) => a.kind === "solar_plant" || a.kind === "wind_farm");
    const hydro = POINT_ASSETS.filter((a) => a.kind === "hydro");
    const cells: CellBase[] = [];
    const raw: { supply: number; solarLocal: number; windLocal: number }[] = [];
    for (let lat = 43.7; lat < 48.3; lat += CELL[1]) {
      for (let lon = 20.3; lon < 29.7; lon += CELL[0]) {
        const c: Position = [round(lon + CELL[0] / 2), round(lat + CELL[1] / 2)];
        if (!pointInPolygon(c, ROMANIA_OUTLINE)) continue;
        // Grid proximity
        let nearest = SUBSTATIONS[0];
        let dSub = Infinity;
        for (const s of SUBSTATIONS) {
          const d = haversineKm(c, s.at);
          if (d < dSub) {
            dSub = d;
            nearest = s;
          }
        }
        const dLine = Math.min(...lines.map((l) => distanceToLineKm(c, l)));
        const grid = clamp(0.65 * Math.exp(-dSub / 30) + 0.35 * Math.exp(-dLine / 15));
        // Supply
        let solarLocal = 0;
        let windLocal = 0;
        for (const a of renewables) {
          const k = (a.capacity_mw ?? 0) * Math.exp(-haversineKm(c, a.at) / 70);
          if (a.kind === "solar_plant") solarLocal += k;
          else windLocal += k;
        }
        const solarResource = clamp((48.4 - c[1]) / 4.6);
        raw.push({ supply: solarLocal + windLocal, solarLocal, windLocal });
        // Cooling
        const dArc = Math.min(distanceToLineKm(c, CARPATHIANS), haversineKm(c, APUSENI));
        const elevation = 1000 * Math.exp(-((dArc / 45) ** 2));
        const meanT = 11.2 - (c[1] - 44.5) * 0.9 - elevation * 0.0065;
        const cooling = clamp((12 - meanT) / 7);
        // Connectivity
        let conn = 0;
        let nearestCity = CITIES[0].name;
        let dCityBest = Infinity;
        for (const city of CITIES) {
          const d = haversineKm(c, city.at);
          conn = Math.max(conn, city.hub * Math.exp(-d / 55));
          if (d < dCityBest) {
            dCityBest = d;
            nearestCity = city.name;
          }
        }
        // Water and hazard
        const dRiver = Math.min(...RIVERS.map((r) => distanceToLineKm(c, r)));
        const dDanube = distanceToLineKm(c, DANUBE);
        const water = Math.exp(-dRiver / 25);
        const hazard = Math.max(Math.exp(-dDanube / 8), inDanubeDelta(c) ? 1 : 0);
        const waterHazard = clamp(0.65 * water + 0.35 * (1 - hazard));
        // Constraints
        let protectedReason: string | undefined;
        if (inDanubeDelta(c)) protectedReason = "Danube Delta Biosphere Reserve";
        else for (const p of PROTECTED) if (haversineKm(c, p.at) < p.km) protectedReason = p.name;
        const floodReason = dDanube < 7 ? "Danube floodplain (approximate buffer)" : undefined;

        const dHydro = Math.min(...hydro.map((h) => haversineKm(c, h.at)));
        cells.push({
          id: `cell-${c[0].toFixed(2)}-${c[1].toFixed(2)}`,
          centroid: c,
          polygon: [
            [round(c[0] - CELL[0] / 2), round(c[1] - CELL[1] / 2)],
            [round(c[0] + CELL[0] / 2), round(c[1] - CELL[1] / 2)],
            [round(c[0] + CELL[0] / 2), round(c[1] + CELL[1] / 2)],
            [round(c[0] - CELL[0] / 2), round(c[1] + CELL[1] / 2)],
            [round(c[0] - CELL[0] / 2), round(c[1] - CELL[1] / 2)],
          ],
          criteria: {
            grid_proximity: grid,
            renewable_supply: solarResource, // completed below once supply is normalised
            supply_variability: Math.exp(-dHydro / 90), // completed below
            cooling_climate: cooling,
            connectivity: clamp(conn),
            water_hazard: waterHazard,
          },
          protectedReason,
          floodReason,
          nearestSubstation: nearest.name,
          nearestSubstationKm: Math.round(dSub),
          nearestCity,
        });
      }
    }
    const maxSupply = Math.max(...raw.map((r) => r.supply));
    cells.forEach((cell, i) => {
      const r = raw[i];
      const supplyNorm = Math.sqrt(r.supply / maxSupply);
      cell.criteria.renewable_supply = clamp(0.6 * supplyNorm + 0.4 * cell.criteria.renewable_supply);
      const total = r.solarLocal + r.windLocal;
      const mix = total > 0 ? 1 - Math.abs(r.solarLocal - r.windLocal) / total : 0.5;
      cell.criteria.supply_variability = clamp(0.3 + 0.4 * cell.criteria.supply_variability + 0.3 * mix);
    });
    return cells;
  });
}

function round(x: number) {
  return Math.round(x * 1000) / 1000;
}

export function normaliseWeights(w: Record<SitingCriterion, number>): Record<SitingCriterion, number> {
  const keys = SITING_CRITERIA.map((c) => c.key);
  const sum = keys.reduce((a, k) => a + Math.max(0, w[k] ?? 0), 0);
  return Object.fromEntries(keys.map((k) => [k, sum > 0 ? Math.max(0, w[k] ?? 0) / sum : 1 / keys.length])) as Record<SitingCriterion, number>;
}

export function scoreSiting(req: SitingRequest) {
  const weights = normaliseWeights(req.weights);
  const exProtected = req.constraints?.exclude_protected ?? true;
  const exFlood = req.constraints?.exclude_flood_zones ?? true;
  const keys = SITING_CRITERIA.map((c) => c.key);
  const scored = buildGrid().map((c) => {
    const reason = (exProtected && c.protectedReason) || (exFlood && c.floodReason) || undefined;
    const contributions = Object.fromEntries(keys.map((k) => [k, round(weights[k] * c.criteria[k])])) as Record<SitingCriterion, number>;
    const score = reason ? 0 : keys.reduce((a, k) => a + weights[k] * c.criteria[k], 0);
    return { c, reason, contributions, score };
  });
  const ranked = scored.filter((s) => !s.reason).sort((a, b) => b.score - a.score);
  const rankOf = new Map(ranked.map((s, i) => [s.c.id, i + 1]));
  const features: Feature<PolygonGeometry, SitingCellProperties>[] = scored.map(({ c, reason, contributions, score }) => ({
    type: "Feature",
    id: c.id,
    geometry: { type: "Polygon", coordinates: [c.polygon] },
    properties: {
      id: c.id,
      centroid: c.centroid,
      score: round(score),
      rank: rankOf.get(c.id) ?? null,
      excluded: !!reason,
      exclusion_reason: reason || undefined,
      criteria: Object.fromEntries(keys.map((k) => [k, round(c.criteria[k])])) as Record<SitingCriterion, number>,
      contributions,
      nearest_substation: c.nearestSubstation,
      nearest_substation_km: c.nearestSubstationKm,
      nearest_city: c.nearestCity,
    },
  }));
  const topN = req.top_n ?? 10;
  const top = ranked.slice(0, topN).map((s) => features.find((f) => f.properties.id === s.c.id)!.properties);
  return { weights, features, top, cellSize: CELL };
}
