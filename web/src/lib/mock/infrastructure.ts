/**
 * Illustrative Romanian energy infrastructure. Names refer to real assets, but
 * coordinates, capacities and line routes are APPROXIMATE and simplified for a
 * national overview map (not survey data). Replace with OSM / Transelectrica data later.
 */

import type { Feature, Geometry, InfrastructureProperties, InfraKind, InfraLayer, Position } from "@/lib/api/types";
import { regionAt } from "./geo";

const NOTE = "Approximate, illustrative location and size.";

interface PointAsset {
  id: string;
  name: string;
  kind: Exclude<InfraKind, "line">;
  at: Position;
  capacity_mw?: number;
  voltage_kv?: number;
  operator?: string;
}

export const POINT_ASSETS: PointAsset[] = [
  // Nuclear and large hydro
  { id: "npp-cernavoda", name: "Cernavoda Nuclear Power Plant", kind: "nuclear", at: [28.057, 44.322], capacity_mw: 1400, operator: "Nuclearelectrica" },
  { id: "hpp-portile-de-fier-1", name: "Portile de Fier I Hydro (RO side)", kind: "hydro", at: [22.53, 44.67], capacity_mw: 1166, operator: "Hidroelectrica" },
  { id: "hpp-lotru-ciunget", name: "Lotru-Ciunget Hydro", kind: "hydro", at: [23.87, 45.43], capacity_mw: 510, operator: "Hidroelectrica" },
  { id: "hpp-vidraru", name: "Vidraru Hydro", kind: "hydro", at: [24.63, 45.37], capacity_mw: 220, operator: "Hidroelectrica" },
  { id: "hpp-stejaru", name: "Stejaru (Bicaz) Hydro", kind: "hydro", at: [26.07, 46.93], capacity_mw: 210, operator: "Hidroelectrica" },

  // Wind (Dobrogea cluster plus a few elsewhere)
  { id: "wf-fantanele-cogealac", name: "Fantanele-Cogealac Wind Farm", kind: "wind_farm", at: [28.55, 44.57], capacity_mw: 600 },
  { id: "wf-pestera", name: "Pestera Wind Farm", kind: "wind_farm", at: [28.12, 44.17], capacity_mw: 90 },
  { id: "wf-cernavoda", name: "Cernavoda Wind Farms", kind: "wind_farm", at: [28.17, 44.36], capacity_mw: 138 },
  { id: "wf-mihai-viteazu", name: "Mihai Viteazu Wind Farm", kind: "wind_farm", at: [28.68, 44.58], capacity_mw: 80 },
  { id: "wf-casimcea", name: "Casimcea / Topolog wind cluster", kind: "wind_farm", at: [28.4, 44.75], capacity_mw: 250 },
  { id: "wf-babadag", name: "Babadag area wind cluster", kind: "wind_farm", at: [28.72, 44.9], capacity_mw: 160 },
  { id: "wf-tulcea-north", name: "Tulcea north wind cluster", kind: "wind_farm", at: [28.6, 45.12], capacity_mw: 120 },
  { id: "wf-moldova-south", name: "South Moldova wind cluster (Vaslui/Galati)", kind: "wind_farm", at: [27.85, 46.1], capacity_mw: 110 },
  { id: "wf-banat", name: "Banat wind cluster (Caras-Severin)", kind: "wind_farm", at: [21.9, 45.2], capacity_mw: 100 },

  // Large solar parks / clusters
  { id: "pv-ratesti", name: "Ratesti Solar Park (Arges)", kind: "solar_plant", at: [25.13, 44.73], capacity_mw: 155 },
  { id: "pv-dolj", name: "Dolj solar cluster (Craiova area)", kind: "solar_plant", at: [23.75, 44.25], capacity_mw: 220 },
  { id: "pv-olt", name: "Olt solar cluster", kind: "solar_plant", at: [24.4, 44.2], capacity_mw: 140 },
  { id: "pv-teleorman", name: "Teleorman solar cluster", kind: "solar_plant", at: [25.3, 44.0], capacity_mw: 120 },
  { id: "pv-giurgiu", name: "Giurgiu solar cluster", kind: "solar_plant", at: [25.95, 43.98], capacity_mw: 110 },
  { id: "pv-ialomita", name: "Ialomita solar cluster", kind: "solar_plant", at: [27.3, 44.55], capacity_mw: 100 },
  { id: "pv-constanta", name: "Constanta solar cluster", kind: "solar_plant", at: [28.3, 44.05], capacity_mw: 130 },
  { id: "pv-timis", name: "Timis / Arad solar cluster", kind: "solar_plant", at: [21.25, 45.95], capacity_mw: 95 },
  { id: "pv-bihor", name: "Bihor solar cluster", kind: "solar_plant", at: [21.95, 47.05], capacity_mw: 70 },

  // 400 kV substations (approximate)
  { id: "ss-cernavoda", name: "Cernavoda 400 kV", kind: "substation", at: [28.03, 44.34], voltage_kv: 400, operator: "Transelectrica" },
  { id: "ss-constanta-nord", name: "Constanta Nord 400 kV", kind: "substation", at: [28.6, 44.22], voltage_kv: 400, operator: "Transelectrica" },
  { id: "ss-medgidia-sud", name: "Medgidia Sud 400 kV", kind: "substation", at: [28.27, 44.23], voltage_kv: 400, operator: "Transelectrica" },
  { id: "ss-tariverde", name: "Tariverde 400 kV", kind: "substation", at: [28.6, 44.6], voltage_kv: 400, operator: "Transelectrica" },
  { id: "ss-isaccea", name: "Isaccea 400 kV", kind: "substation", at: [28.45, 45.27], voltage_kv: 400, operator: "Transelectrica" },
  { id: "ss-smardan", name: "Smardan 400 kV", kind: "substation", at: [28.0, 45.48], voltage_kv: 400, operator: "Transelectrica" },
  { id: "ss-gutinas", name: "Gutinas 400 kV", kind: "substation", at: [26.85, 46.6], voltage_kv: 400, operator: "Transelectrica" },
  { id: "ss-suceava", name: "Suceava 400 kV", kind: "substation", at: [26.25, 47.65], voltage_kv: 400, operator: "Transelectrica" },
  { id: "ss-bucuresti-sud", name: "Bucuresti Sud 400 kV", kind: "substation", at: [26.15, 44.36], voltage_kv: 400, operator: "Transelectrica" },
  { id: "ss-domnesti", name: "Domnesti 400 kV", kind: "substation", at: [25.94, 44.42], voltage_kv: 400, operator: "Transelectrica" },
  { id: "ss-brazi-vest", name: "Brazi Vest 400 kV", kind: "substation", at: [25.97, 44.86], voltage_kv: 400, operator: "Transelectrica" },
  { id: "ss-brasov", name: "Brasov 400 kV", kind: "substation", at: [25.6, 45.67], voltage_kv: 400, operator: "Transelectrica" },
  { id: "ss-sibiu-sud", name: "Sibiu Sud 400 kV", kind: "substation", at: [24.13, 45.75], voltage_kv: 400, operator: "Transelectrica" },
  { id: "ss-iernut", name: "Iernut 400 kV", kind: "substation", at: [24.25, 46.45], voltage_kv: 400, operator: "Transelectrica" },
  { id: "ss-cluj-est", name: "Cluj Est 400 kV", kind: "substation", at: [23.65, 46.77], voltage_kv: 400, operator: "Transelectrica" },
  { id: "ss-rosiori", name: "Rosiori 400 kV", kind: "substation", at: [22.4, 47.25], voltage_kv: 400, operator: "Transelectrica" },
  { id: "ss-mintia", name: "Mintia 400 kV", kind: "substation", at: [22.85, 45.9], voltage_kv: 400, operator: "Transelectrica" },
  { id: "ss-arad", name: "Arad 400 kV", kind: "substation", at: [21.3, 46.2], voltage_kv: 400, operator: "Transelectrica" },
  { id: "ss-portile-de-fier", name: "Portile de Fier 400 kV", kind: "substation", at: [22.55, 44.65], voltage_kv: 400, operator: "Transelectrica" },
  { id: "ss-urechesti", name: "Urechesti 400 kV", kind: "substation", at: [23.2, 44.83], voltage_kv: 400, operator: "Transelectrica" },
  { id: "ss-tantareni", name: "Tantareni 400 kV", kind: "substation", at: [23.55, 44.6], voltage_kv: 400, operator: "Transelectrica" },
  { id: "ss-slatina", name: "Slatina 400 kV", kind: "substation", at: [24.37, 44.43], voltage_kv: 400, operator: "Transelectrica" },
];

/** Simplified 400 kV corridors between the substations above (straight segments). */
export const LINE_ROUTES: { id: string; name: string; via: string[] }[] = [
  { id: "l-cernavoda-constanta", name: "Cernavoda - Constanta Nord", via: ["ss-cernavoda", "ss-medgidia-sud", "ss-constanta-nord"] },
  { id: "l-dobrogea-north", name: "Medgidia Sud - Tariverde - Isaccea", via: ["ss-medgidia-sud", "ss-tariverde", "ss-isaccea"] },
  { id: "l-isaccea-smardan", name: "Isaccea - Smardan - Gutinas", via: ["ss-isaccea", "ss-smardan", "ss-gutinas"] },
  { id: "l-gutinas-suceava", name: "Gutinas - Suceava", via: ["ss-gutinas", "ss-suceava"] },
  { id: "l-cernavoda-bucuresti", name: "Cernavoda - Bucuresti Sud", via: ["ss-cernavoda", "ss-bucuresti-sud"] },
  { id: "l-bucuresti-ring", name: "Bucuresti Sud - Domnesti - Brazi Vest", via: ["ss-bucuresti-sud", "ss-domnesti", "ss-brazi-vest"] },
  { id: "l-brazi-brasov", name: "Brazi Vest - Brasov", via: ["ss-brazi-vest", "ss-brasov"] },
  { id: "l-brasov-gutinas", name: "Brasov - Gutinas", via: ["ss-brasov", "ss-gutinas"] },
  { id: "l-brasov-sibiu-iernut", name: "Brasov - Sibiu Sud - Iernut", via: ["ss-brasov", "ss-sibiu-sud", "ss-iernut"] },
  { id: "l-iernut-cluj-rosiori", name: "Iernut - Cluj Est - Rosiori", via: ["ss-iernut", "ss-cluj-est", "ss-rosiori"] },
  { id: "l-sibiu-mintia-arad", name: "Sibiu Sud - Mintia - Arad", via: ["ss-sibiu-sud", "ss-mintia", "ss-arad"] },
  { id: "l-south-corridor", name: "Portile de Fier - Urechesti - Tantareni - Slatina - Bucuresti Sud", via: ["ss-portile-de-fier", "ss-urechesti", "ss-tantareni", "ss-slatina", "ss-domnesti"] },
  { id: "l-tantareni-sibiu", name: "Tantareni - Sibiu Sud", via: ["ss-tantareni", "ss-sibiu-sud"] },
  { id: "l-portile-arad", name: "Portile de Fier - Mintia", via: ["ss-portile-de-fier", "ss-mintia"] },
];

const BY_ID = new Map(POINT_ASSETS.map((a) => [a.id, a]));

export const SUBSTATIONS = POINT_ASSETS.filter((a) => a.kind === "substation");

export function lineGeometry(route: { via: string[] }): Position[] {
  return route.via.map((id) => BY_ID.get(id)!.at);
}

const LAYER_KINDS: Record<InfraLayer, InfraKind[]> = {
  plants: ["solar_plant", "wind_farm", "nuclear", "hydro"],
  substations: ["substation"],
  lines: ["line"],
};

export function infrastructureFeatures(layers: InfraLayer[], bbox?: [number, number, number, number]): Feature<Geometry, InfrastructureProperties>[] {
  const kinds = new Set(layers.flatMap((l) => LAYER_KINDS[l]));
  const inBox = (p: Position) => !bbox || (p[0] >= bbox[0] && p[0] <= bbox[2] && p[1] >= bbox[1] && p[1] <= bbox[3]);
  const out: Feature<Geometry, InfrastructureProperties>[] = [];
  for (const a of POINT_ASSETS) {
    if (!kinds.has(a.kind) || !inBox(a.at)) continue;
    out.push({
      type: "Feature",
      id: a.id,
      geometry: { type: "Point", coordinates: a.at },
      properties: {
        id: a.id,
        name: a.name,
        kind: a.kind,
        capacity_mw: a.capacity_mw,
        voltage_kv: a.voltage_kv,
        operator: a.operator,
        dev_region: regionAt(a.at),
        approximate: true,
        note: NOTE,
      },
    });
  }
  if (kinds.has("line")) {
    for (const l of LINE_ROUTES) {
      const coords = lineGeometry(l);
      if (bbox && !coords.some(inBox)) continue;
      out.push({
        type: "Feature",
        id: l.id,
        geometry: { type: "LineString", coordinates: coords },
        properties: { id: l.id, name: `${l.name} (400 kV)`, kind: "line", voltage_kv: 400, operator: "Transelectrica", approximate: true, note: "Simplified straight-segment corridor, illustrative only." },
      });
    }
  }
  return out;
}
