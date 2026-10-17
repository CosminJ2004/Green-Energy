/**
 * Mock operational endpoints: data-source references, model registry with a
 * live walk-forward backtest on synthetic data, health/freshness, and the
 * pipeline graph shown on /pipeline.
 */

import type {
  DataSourceRef,
  EnergySource,
  Health,
  ModelInfo,
  PipelineEdge,
  PipelineGraph,
  PipelineId,
  PipelineNode,
  PipelineNodeStatus,
  SourceHealth,
} from "@/lib/api/types";
import { HOUR_MS, addDays, localDateKey, localMidnightUtcMs, toIso } from "@/lib/time";
import { backtest } from "./forecast";
import { SOLAR_CAPACITY_MW, SOLAR_MODEL_VERSION, WIND_CAPACITY_MW, WIND_MODEL_VERSION } from "./model";
import { SOLAR_FEATURES, WIND_FEATURES } from "./explain";

export const SOURCES: Record<"synthetic" | "openMeteo" | "energyCharts" | "entsoe" | "osm" | "transelectrica", DataSourceRef> = {
  synthetic: { id: "synthetic", name: "Synthetic demo data (Green Energy RO mock backend)", license: "Demo only", role: "Generates weather, model output and prices for this prototype" },
  openMeteo: { id: "open-meteo", name: "Open-Meteo", license: "CC BY 4.0", url: "https://open-meteo.com", role: "NWP weather forecasts (planned input; synthetic stand-in in this demo)" },
  energyCharts: { id: "energy-charts", name: "Energy-Charts.info (Fraunhofer ISE)", license: "CC BY 4.0", url: "https://www.energy-charts.info", role: "Public net generation and load for Romania (v1 target source)" },
  entsoe: { id: "entsoe", name: "ENTSO-E Transparency Platform", license: "ENTSO-E terms of use", url: "https://transparency.entsoe.eu", role: "Generation cross-check and day-ahead prices (token pending)" },
  osm: { id: "osm", name: "OpenStreetMap contributors", license: "ODbL", url: "https://www.openstreetmap.org/copyright", role: "Power infrastructure (planned; illustrative hand-made list in this demo)" },
  transelectrica: { id: "transelectrica", name: "Transelectrica (SEN)", license: "Terms to verify", url: "https://www.transelectrica.ro", role: "Validation of generation figures (planned)" },
};

// --------------------------------------------------------------------------
// Models
// --------------------------------------------------------------------------

export function modelInfo(source: EnergySource, nowMs: number): ModelInfo {
  const bt = backtest(source, nowMs);
  const cap = source === "solar" ? SOLAR_CAPACITY_MW : WIND_CAPACITY_MW;
  const today = localDateKey(nowMs);
  const r = (x: number, d = 1) => Math.round(x * 10 ** d) / 10 ** d;
  return {
    id: `${source}-model`,
    name: source === "solar" ? "Solar day-ahead model" : "Wind day-ahead model",
    source,
    version: source === "solar" ? SOLAR_MODEL_VERSION : WIND_MODEL_VERSION,
    algorithm: "Transparent physics surrogate (demo) — production plan: LightGBM quantile regression",
    objective: "Quantiles p10 / p50 / p90 of national generation (MW), via capacity factor",
    trained_at: toIso(localMidnightUtcMs(addDays(today, -2)) + 3 * HOUR_MS),
    training_window: { from: "2023-01-01", to: addDays(today, -40) },
    features: (source === "solar" ? SOLAR_FEATURES : WIND_FEATURES).map((f) => f.feature),
    installed_capacity_mw: cap,
    backtest: {
      method: "Walk-forward, day-ahead (D+1) issues at 10:00 Bucharest time; synthetic actuals",
      window: { from: bt.from, to: bt.to },
      overall: {
        mae_mw: r(bt.mae),
        rmse_mw: r(bt.rmse),
        nmae_pct: r((bt.mae / cap) * 100, 2),
        skill_vs_persistence: r(1 - bt.mae / bt.persistenceMae, 3),
        skill_vs_clear_sky: bt.clearSkyMae ? r(1 - bt.mae / bt.clearSkyMae, 3) : undefined,
        coverage_p10_p90: r(bt.coverage, 3),
        pinball_mw: r(bt.pinball),
        n_hours: bt.n,
      },
      baselines: { persistence_mae_mw: r(bt.persistenceMae), clear_sky_mae_mw: bt.clearSkyMae ? r(bt.clearSkyMae) : undefined },
      mae_by_hour: bt.maeByHour,
    },
    provenance: "synthetic",
    notes: [
      "SYNTHETIC: metrics are computed on synthetic weather and synthetic actuals; they show the evaluation method, not real-world accuracy.",
      "Solar figures are TSO-metered generation (most rooftop solar is not included).",
    ],
  };
}

// --------------------------------------------------------------------------
// Health
// --------------------------------------------------------------------------

export function health(nowMs: number, realActualsFetchedAt?: string | null): Health {
  const lag = (iso: string | null) => (iso ? Math.round((nowMs - new Date(iso).getTime()) / 60000) : null);
  const lastHour = toIso(Math.floor(nowMs / HOUR_MS) * HOUR_MS - HOUR_MS);
  const nwpRun = toIso(Math.floor((nowMs - 4 * HOUR_MS) / (6 * HOUR_MS)) * 6 * HOUR_MS + 4 * HOUR_MS);
  const ecLag = lag(realActualsFetchedAt ?? null);
  const sources: SourceHealth[] = [
    {
      id: "energy-charts",
      name: SOURCES.energyCharts.name,
      status: realActualsFetchedAt ? (ecLag !== null && ecLag > 36 * 60 ? "stale" : "fresh") : "pending",
      last_updated: realActualsFetchedAt ?? null,
      expected_interval_minutes: 60,
      lag_minutes: ecLag,
      provenance: realActualsFetchedAt ? "real" : "synthetic",
      note: realActualsFetchedAt ? "Snapshot from scripts/fetch-actuals.mjs (npm run data:actuals)." : "No snapshot yet: run `npm run data:actuals`. Synthetic actuals are shown instead.",
    },
    { id: "open-meteo", name: SOURCES.openMeteo.name, status: "fresh", last_updated: nwpRun, expected_interval_minutes: 360, lag_minutes: lag(nwpRun), provenance: "synthetic", note: "Synthetic stand-in for the NWP run (6-hourly)." },
    { id: "entsoe", name: SOURCES.entsoe.name, status: "pending", last_updated: null, expected_interval_minutes: 60, lag_minutes: null, provenance: "synthetic", note: "API token pending; prices are synthetic." },
    { id: "osm", name: SOURCES.osm.name, status: "planned", last_updated: null, expected_interval_minutes: null, lag_minutes: null, provenance: "synthetic", note: "Spike S5 not done; illustrative asset list in use." },
    { id: "transelectrica", name: SOURCES.transelectrica.name, status: "planned", last_updated: null, expected_interval_minutes: null, lag_minutes: null, provenance: "synthetic", note: "Validation source (spike S2)." },
    { id: "forecast", name: "Forecast job (day-ahead, 10:00)", status: "fresh", last_updated: lastHour, expected_interval_minutes: 1440, lag_minutes: lag(lastHour), provenance: "synthetic" },
  ];
  return {
    status: sources.some((s) => s.status === "error") ? "down" : sources.some((s) => s.status === "stale") ? "degraded" : "ok",
    checked_at: toIso(nowMs),
    api_version: "v1",
    mode: "mock",
    sources,
  };
}

// --------------------------------------------------------------------------
// Pipeline graph
// --------------------------------------------------------------------------

interface FeatureDef {
  key: string;
  label: string;
  unit: string;
  pipelines: PipelineId[];
  description: string;
  derived?: boolean;
  from?: "weather" | "prices" | "generation" | "calendar";
}

const FEATURE_DEFS: FeatureDef[] = [
  { key: "shortwave_radiation", label: "Shortwave radiation (GHI)", unit: "W/m²", pipelines: ["solar"], description: "Total sunlight on a horizontal surface; the main solar driver.", from: "weather" },
  { key: "direct_radiation", label: "Direct radiation", unit: "W/m²", pipelines: ["solar"], description: "Beam component; tilted panels gain most from it.", from: "weather" },
  { key: "diffuse_radiation", label: "Diffuse radiation", unit: "W/m²", pipelines: ["solar"], description: "Scattered sky light; dominates under cloud.", from: "weather" },
  { key: "cloud_cover_low", label: "Cloud cover low", unit: "%", pipelines: ["solar"], description: "Low stratus/fog; strongest dimming.", from: "weather" },
  { key: "cloud_cover_mid", label: "Cloud cover mid", unit: "%", pipelines: ["solar"], description: "Mid-level cloud.", from: "weather" },
  { key: "cloud_cover_high", label: "Cloud cover high", unit: "%", pipelines: ["solar"], description: "Thin cirrus; mild dimming.", from: "weather" },
  { key: "cloud_cover_total", label: "Cloud cover total", unit: "%", pipelines: ["solar"], description: "Sets the diffuse share and how much tilt gain panels get.", from: "weather" },
  { key: "temperature_2m", label: "Temperature 2 m", unit: "°C", pipelines: ["solar", "wind"], description: "Hot panels lose ~0.4%/°C; cold air is denser and carries more wind power.", from: "weather" },
  { key: "relative_humidity_2m", label: "Relative humidity", unit: "%", pipelines: ["wind"], description: "With near-freezing temperature, drives the icing risk.", from: "weather" },
  { key: "snow_depth", label: "Snow depth", unit: "cm", pipelines: ["solar"], description: "Snow on panels blocks light until it slides or melts.", from: "weather" },
  { key: "wind_speed_10m", label: "Wind speed 10 m", unit: "m/s", pipelines: ["wind"], description: "Surface wind; used for shear and gust context.", from: "weather" },
  { key: "wind_speed_100m", label: "Wind speed 100 m", unit: "m/s", pipelines: ["wind"], description: "Hub-height wind; power rises ~cubically between cut-in and rated speed.", from: "weather" },
  { key: "wind_direction_100m", label: "Wind direction 100 m", unit: "°", pipelines: ["wind"], description: "Off-axis directions cause more wake losses in the Dobrogea farms.", from: "weather" },
  { key: "solar_elevation", label: "Sun elevation (derived)", unit: "°", pipelines: ["solar"], description: "Solar geometry from time and location (pvlib in production).", derived: true, from: "calendar" },
  { key: "clear_sky_index", label: "Clear-sky index (derived)", unit: "ratio", pipelines: ["solar"], description: "GHI / clear-sky GHI; normalises away the daily sun cycle.", derived: true, from: "weather" },
  { key: "air_density", label: "Air density (derived)", unit: "kg/m³", pipelines: ["wind"], description: "From temperature and pressure; scales wind power.", derived: true, from: "weather" },
  { key: "icing_risk", label: "Icing risk (derived)", unit: "0–1", pipelines: ["wind"], description: "Near-freezing, saturated air ices blades and cuts output.", derived: true, from: "weather" },
  { key: "calendar", label: "Calendar (hour, day of year, holiday)", unit: "", pipelines: ["solar", "wind"], description: "Seasonality and daily cycle.", derived: true, from: "calendar" },
  { key: "curtailment_flag", label: "Curtailment flag (negative price)", unit: "flag", pipelines: ["solar"], description: "Midday negative day-ahead prices trigger curtailment of solar output.", derived: true, from: "prices" },
  { key: "capacity_factor_target", label: "Target: capacity factor", unit: "0–1", pipelines: ["solar", "wind"], description: "Generation / installed capacity; the training target (converted back to MW).", derived: true, from: "generation" },
];

const EXPLAINED = new Set<string>([...SOLAR_FEATURES.map((f) => f.feature), ...WIND_FEATURES.map((f) => f.feature)]);

export function pipelineGraph(nowMs: number, realActualsFetchedAt?: string | null): PipelineGraph {
  const h = health(nowMs, realActualsFetchedAt);
  const sh = (id: string) => h.sources.find((s) => s.id === id)!;
  const fromHealth = (id: string): { status: PipelineNodeStatus; freshness: PipelineNode["freshness"] } => {
    const s = sh(id);
    const status: PipelineNodeStatus = s.status === "fresh" ? "ok" : s.status === "stale" ? "stale" : s.status === "error" ? "error" : s.status === "pending" ? "pending" : "planned";
    return { status, freshness: { last_updated: s.last_updated, lag_minutes: s.lag_minutes } };
  };
  const nodes: PipelineNode[] = [];
  const edges: PipelineEdge[] = [];
  const edge = (from: string, to: string, pipelines: PipelineId[], label?: string) => edges.push({ id: `${from}->${to}`, from, to, pipelines, label });
  const ecReal = !!realActualsFetchedAt;

  // Sources
  nodes.push(
    { id: "src-energy-charts", kind: "source", label: "Energy-Charts.info", description: "Romanian public net generation (solar, wind) and load. v1 target source (ADR-0005).", ...fromHealth("energy-charts"), pipelines: ["solar", "wind"], provenance: ecReal ? "real" : "synthetic", view: "/forecast" },
    { id: "src-open-meteo", kind: "source", label: "Open-Meteo NWP", description: "Hourly weather forecasts per location. Demo: synthetic stand-in.", ...fromHealth("open-meteo"), pipelines: ["solar", "wind"], provenance: "synthetic", view: "/explain" },
    { id: "src-entsoe", kind: "source", label: "ENTSO-E (pending)", description: "Generation cross-check and day-ahead prices. API token pending.", ...fromHealth("entsoe"), pipelines: ["shared"], provenance: "synthetic", view: "/market" },
    { id: "src-osm", kind: "source", label: "OpenStreetMap", description: "Power plants, substations, lines (planned; illustrative list in demo).", ...fromHealth("osm"), pipelines: ["shared"], provenance: "synthetic", view: "/map" },
    { id: "src-transelectrica", kind: "source", label: "Transelectrica (validation)", description: "SEN production by source, used to validate targets (planned).", ...fromHealth("transelectrica"), pipelines: ["shared"], provenance: "synthetic" },
  );

  // Ingest
  nodes.push(
    { id: "ing-generation", kind: "ingest", label: "Generation ingest", description: "GenerationSource adapter → raw Parquet (UTC, MW, hourly).", ...fromHealth("energy-charts"), pipelines: ["solar", "wind"], provenance: ecReal ? "real" : "synthetic" },
    { id: "ing-weather", kind: "ingest", label: "Weather ingest", description: "WeatherSource adapter: NWP at 8 regional points, capacity-weighted national aggregate.", ...fromHealth("open-meteo"), pipelines: ["solar", "wind"], provenance: "synthetic" },
    { id: "ing-prices", kind: "ingest", label: "Price ingest", description: "PriceSource adapter: day-ahead prices (15-min → hourly).", status: "pending", freshness: null, pipelines: ["shared"], provenance: "synthetic" },
    { id: "ing-infrastructure", kind: "ingest", label: "Infrastructure ingest", description: "InfrastructureSource adapter → PostGIS layers.", status: "planned", freshness: null, pipelines: ["shared"], provenance: "synthetic" },
    { id: "ing-validation", kind: "ingest", label: "Validation ingest", description: "Transelectrica SEN feed for target validation.", status: "planned", freshness: null, pipelines: ["shared"], provenance: "synthetic" },
  );
  edge("src-energy-charts", "ing-generation", ["solar", "wind"]);
  edge("src-open-meteo", "ing-weather", ["solar", "wind"]);
  edge("src-entsoe", "ing-prices", ["shared"]);
  edge("src-osm", "ing-infrastructure", ["shared"]);
  edge("src-transelectrica", "ing-validation", ["shared"]);

  // Models
  nodes.push(
    { id: "model-solar", kind: "model", label: "Solar LightGBM (p10/p50/p90)", description: "Demo runs a transparent physics surrogate with exact Shapley explanations.", status: "ok", freshness: { last_updated: toIso(localMidnightUtcMs(localDateKey(nowMs)) + 10 * HOUR_MS), lag_minutes: null }, pipelines: ["solar"], provenance: "synthetic", view: "/forecast" },
    { id: "model-wind", kind: "model", label: "Wind LightGBM (p10/p50/p90)", description: "Demo runs a transparent power-curve surrogate with exact Shapley explanations.", status: "ok", freshness: { last_updated: toIso(localMidnightUtcMs(localDateKey(nowMs)) + 10 * HOUR_MS), lag_minutes: null }, pipelines: ["wind"], provenance: "synthetic", view: "/forecast" },
  );

  // Features
  for (const f of FEATURE_DEFS) {
    const consumed = f.pipelines.map((p) => `model-${p}`);
    const id = `feat-${f.key}`;
    const upstream = f.from === "prices" ? "ing-prices" : f.from === "generation" ? "ing-generation" : f.from === "calendar" ? null : "ing-weather";
    nodes.push({
      id,
      kind: "feature",
      label: f.label,
      description: f.description,
      status: "ok",
      freshness: null,
      pipelines: f.pipelines,
      consumed_by: consumed,
      feature_key: f.key,
      unit: f.unit,
      explained: EXPLAINED.has(f.key),
      view: EXPLAINED.has(f.key) ? "/explain" : undefined,
      provenance: f.from === "generation" && ecReal ? "real" : "synthetic",
    });
    if (upstream) edge(upstream, id, f.from === "prices" ? ["solar"] : f.pipelines, f.from === "prices" ? "synthetic prices until ENTSO-E is connected" : undefined);
    for (const m of consumed) edge(id, m, [m === "model-solar" ? "solar" : "wind"], f.key === "capacity_factor_target" ? "training target" : undefined);
  }

  // Outputs
  const outputs: { id: string; label: string; description: string; view: string; from: string[]; pipelines: PipelineId[] }[] = [
    { id: "out-forecast", label: "Forecast (p10–p90)", description: "48 h national curves with uncertainty band and baselines.", view: "/forecast", from: ["model-solar", "model-wind"], pipelines: ["solar", "wind"] },
    { id: "out-explain", label: "Explanations (SHAP)", description: "Per-hour feature contributions in MW.", view: "/explain", from: ["model-solar", "model-wind"], pipelines: ["solar", "wind"] },
    { id: "out-whatif", label: "What-if", description: "Re-run inference with user-modified weather.", view: "/what-if", from: ["model-solar", "model-wind"], pipelines: ["solar", "wind"] },
    { id: "out-map", label: "Energy map", description: "Regional forecast heat plus grid infrastructure.", view: "/map", from: ["model-solar", "model-wind", "ing-infrastructure"], pipelines: ["solar", "wind", "shared"] },
    { id: "out-market", label: "Market overlay", description: "Production against day-ahead price (descriptive).", view: "/market", from: ["model-solar", "model-wind", "ing-prices"], pipelines: ["solar", "wind", "shared"] },
    { id: "out-siting", label: "Data-centre siting", description: "Multi-criteria scoring of candidate cells.", view: "/siting", from: ["out-forecast", "ing-infrastructure"], pipelines: ["shared"] },
  ];
  for (const o of outputs) {
    nodes.push({ id: o.id, kind: "output", label: o.label, description: o.description, status: "ok", freshness: null, pipelines: o.pipelines, view: o.view, provenance: "synthetic" });
    for (const f of o.from) edge(f, o.id, f === "model-solar" ? ["solar"] : f === "model-wind" ? ["wind"] : ["shared"]);
  }
  edge("ing-validation", "feat-capacity_factor_target", ["shared"], "validation");

  return {
    generated_at: toIso(nowMs),
    provenance: "synthetic",
    nodes,
    edges,
    stages: [
      { kind: "source", label: "Sources" },
      { kind: "ingest", label: "Ingest" },
      { kind: "feature", label: "Features" },
      { kind: "model", label: "Models" },
      { kind: "output", label: "Outputs" },
    ],
  };
}
