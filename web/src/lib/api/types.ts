/**
 * API contract types. Mirrors docs/05-api-design.md (FastAPI, /v1, JSON).
 * Conventions: timestamps are ISO 8601 UTC strings; power in MW; ranges are
 * half-open [from, to). Field names are snake_case to match the backend JSON.
 *
 * Extensions beyond the doc (flagged so the backend can adopt them):
 *  - every response carries `provenance` ("synthetic" | "real") so the UI can label data honestly;
 *  - GET /v1/explain also accepts from&to (getExplanationSeries) for the day timeline;
 *  - GET /v1/pipeline (getPipelineGraph) describes the data/ML pipelines for the Pipeline view;
 *  - GET /v1/actuals accepts source=load.
 */

// ---------------------------------------------------------------------------
// Shared primitives
// ---------------------------------------------------------------------------

export type RegionCode = "RO";
export type EnergySource = "solar" | "wind";
/** Romania's 8 development regions (NUTS-2). */
export type DevRegionCode = "NE" | "SE" | "SM" | "SV" | "V" | "NV" | "C" | "BI";

export type Provenance = "synthetic" | "real";

/** ISO 8601 UTC timestamp, e.g. "2026-10-18T21:00:00Z". */
export type IsoTime = string;
/** Local (Europe/Bucharest) calendar date "YYYY-MM-DD". */
export type DateKey = string;

export interface DataSourceRef {
  id: string;
  name: string;
  license: string;
  url?: string;
  /** What this source contributes to the response. */
  role?: string;
}

export interface TimeRangeParams {
  region?: RegionCode;
  from: IsoTime;
  to: IsoTime;
}

/** Weather regime label of the hour (drives forecast uncertainty). */
export type WeatherRegime = "clear" | "partly_cloudy" | "overcast" | "front";

// ---------------------------------------------------------------------------
// Forecast / actuals / baselines
// ---------------------------------------------------------------------------

export interface ForecastPoint {
  time: IsoTime;
  p10: number;
  p50: number;
  p90: number;
}

/** Forecast point plus context the mock (and later the backend) can supply. */
export interface ForecastPointDetail extends ForecastPoint {
  /** p50 / installed capacity, 0-1. */
  capacity_factor: number;
  regime: WeatherRegime;
  /** Lead time in hours from issue time. */
  lead_hours: number;
  /** Solar only: true when the curtailment proxy (negative day-ahead price at midday) is active. */
  curtailed?: boolean;
}

export interface ForecastParams extends TimeRangeParams {
  source: EnergySource;
  /** Local issue date D. Defaults to the day before the local date of `from`. */
  issue_date?: DateKey;
}

export interface ForecastResponse {
  region: RegionCode;
  source: EnergySource;
  model_version: string;
  issued_at: IsoTime;
  data_sources: DataSourceRef[];
  unit: "MW";
  installed_capacity_mw: number;
  provenance: Provenance;
  points: ForecastPointDetail[];
}

export interface ActualPoint {
  time: IsoTime;
  mw: number;
}

export type ActualsSource = EnergySource | "load";

export interface ActualsParams extends TimeRangeParams {
  source: ActualsSource;
  /** "real" (default) uses public/data/actuals-ro.json when it covers the range; "synthetic" forces the mock. */
  prefer?: Provenance;
}

export interface Actuals {
  region: RegionCode;
  source: ActualsSource;
  unit: "MW";
  resolution_minutes: number;
  provenance: Provenance;
  data_sources: DataSourceRef[];
  /** e.g. "TSO-metered generation; excludes most rooftop solar". */
  note?: string;
  /** When provenance is real: time the file was fetched. */
  fetched_at?: IsoTime;
  points: ActualPoint[];
}

export interface BaselinesParams extends TimeRangeParams {
  source: EnergySource;
  issue_date?: DateKey;
}

export interface Baselines {
  region: RegionCode;
  source: EnergySource;
  unit: "MW";
  provenance: Provenance;
  /** Same local hour on the last complete day before issue (D-1). */
  persistence: ActualPoint[];
  /** Solar only: clear-sky output scaled by D-1's clear-sky index. null for wind. */
  clear_sky: ActualPoint[] | null;
  /** Seasonal climatology for the hour. */
  climatology: ActualPoint[];
  descriptions: { persistence: string; clear_sky: string | null; climatology: string };
}

// ---------------------------------------------------------------------------
// Weather
// ---------------------------------------------------------------------------

export interface WeatherPoint {
  time: IsoTime;
  /** Global horizontal irradiance, W/m². */
  shortwave_radiation: number;
  /** Direct (beam) radiation on the horizontal plane, W/m². */
  direct_radiation: number;
  /** Diffuse radiation, W/m². */
  diffuse_radiation: number;
  /** Clear-sky GHI for reference, W/m². */
  clear_sky_radiation: number;
  /** Cloud cover, % (0-100). */
  cloud_cover_low: number;
  cloud_cover_mid: number;
  cloud_cover_high: number;
  cloud_cover_total: number;
  /** °C at 2 m. */
  temperature_2m: number;
  /** m/s. */
  wind_speed_10m: number;
  wind_speed_100m: number;
  /** Degrees, meteorological (direction wind comes FROM, 0 = N). */
  wind_direction_100m: number;
  /** %, 0-100. */
  relative_humidity_2m: number;
  /** cm. */
  snow_depth: number;
  /** Derived: solar elevation in degrees (negative = night), at the capacity-weighted centroid. */
  solar_elevation: number;
  /** Derived: icing risk index 0-1 from temperature and humidity. */
  icing_risk: number;
  /** Derived: air density, kg/m³. */
  air_density: number;
  regime: WeatherRegime;
}

export interface WeatherParams extends TimeRangeParams {
  /** NWP run used (local issue date). Omit for the "analysis" (observed-like) weather. */
  issue_date?: DateKey;
  /** One development region instead of the capacity-weighted national aggregate. */
  dev_region?: DevRegionCode;
}

export interface WeatherResponse {
  region: RegionCode;
  dev_region?: DevRegionCode;
  kind: "forecast" | "analysis";
  issue_date?: DateKey;
  /** How the national aggregate is weighted. */
  aggregation: string;
  provenance: Provenance;
  data_sources: DataSourceRef[];
  points: WeatherPoint[];
}

/** Metadata for each weather variable (labels, units, ranges) for charts and sliders. */
export interface WeatherVariableInfo {
  key: keyof Omit<WeatherPoint, "time" | "regime">;
  label: string;
  unit: string;
  min: number;
  max: number;
  description: string;
  used_by: EnergySource[];
}

// ---------------------------------------------------------------------------
// Explanations (SHAP)
// ---------------------------------------------------------------------------

export type SolarFeature =
  | "shortwave_radiation"
  | "cloud_cover_total"
  | "temperature_2m"
  | "snow_depth"
  | "solar_elevation"
  | "curtailment_flag";
export type WindFeature = "wind_speed_100m" | "wind_direction_100m" | "temperature_2m" | "icing_risk";
export type ModelFeature = SolarFeature | WindFeature;

export interface FeatureContribution {
  feature: ModelFeature;
  label: string;
  unit: string;
  /** Feature value for this hour. */
  value: number;
  /** Mean background (climatology) value the contribution is measured against. */
  baseline_value: number;
  /** Shapley value in MW: how much this feature moved the forecast away from base_value. */
  contribution: number;
}

export interface ExplainParams {
  region?: RegionCode;
  source: EnergySource;
  time: IsoTime;
  issue_date?: DateKey;
}

export interface Explanation {
  region: RegionCode;
  source: EnergySource;
  time: IsoTime;
  model_version: string;
  /** Expected output under seasonal climatology (MW). */
  base_value: number;
  /** p50 forecast (MW) = base_value + sum(contributions). */
  prediction: number;
  unit: "MW";
  method: "exact-shapley-interventional";
  background: string;
  provenance: Provenance;
  /** Ordered by |contribution| descending. */
  contributions: FeatureContribution[];
}

export interface ExplainSeriesParams extends TimeRangeParams {
  source: EnergySource;
  issue_date?: DateKey;
}

export interface ExplanationSeries {
  region: RegionCode;
  source: EnergySource;
  model_version: string;
  unit: "MW";
  provenance: Provenance;
  /** Feature order (stable) for stacked charts. */
  features: { feature: ModelFeature; label: string; unit: string }[];
  points: Explanation[];
}

// ---------------------------------------------------------------------------
// What-if
// ---------------------------------------------------------------------------

export type WhatIfVariable = "cloud_cover_total" | "temperature_2m" | "wind_speed_100m" | "shortwave_radiation";

export interface WhatIfOverride {
  /** set = absolute value for every hour; add = offset; scale = multiplier. */
  mode: "set" | "add" | "scale";
  value: number;
}

export interface WhatIfRequest {
  region?: RegionCode;
  source: EnergySource;
  /** Base forecast: issue date D (covers D+1 and D+2) … */
  issue_date: DateKey;
  /** … optionally narrowed to [from, to). */
  from?: IsoTime;
  to?: IsoTime;
  overrides: Partial<Record<WhatIfVariable, WhatIfOverride>>;
  /**
   * When true (default) and cloud cover is overridden but radiation is not,
   * irradiance is recomputed from clear-sky with the Kasten-Czeplak relation,
   * so the inputs stay physically consistent.
   */
  couple_radiation_to_cloud?: boolean;
}

export interface WhatIfResponse {
  region: RegionCode;
  source: EnergySource;
  model_version: string;
  unit: "MW";
  provenance: Provenance;
  base: ForecastPoint[];
  modified: ForecastPoint[];
  /** modified.p50 - base.p50 per hour. */
  delta: ActualPoint[];
  /** Energy totals over the window, MWh. */
  totals: { base_mwh: number; modified_mwh: number; delta_mwh: number; delta_pct: number };
  base_weather: WeatherPoint[];
  modified_weather: WeatherPoint[];
  note: string;
}

// ---------------------------------------------------------------------------
// Market
// ---------------------------------------------------------------------------

export interface PricePoint {
  time: IsoTime;
  /** Hourly mean, EUR/MWh. */
  price: number;
  /** The four 15-minute clearing prices of the hour (Romania moved to 15-min MTU in 2025). */
  quarter_hours: number[];
  /** Context used by the merit-order mock (MW). */
  load_mw?: number;
  solar_mw?: number;
  wind_mw?: number;
  /** (solar + wind) / load, 0-1+. */
  renewable_share?: number;
}

export type PriceParams = TimeRangeParams;

export interface PriceSeries {
  region: RegionCode;
  market: string;
  currency: "EUR";
  unit: "EUR/MWh";
  resolution_minutes: 60;
  source_resolution_minutes: 15;
  provenance: Provenance;
  data_sources: DataSourceRef[];
  points: PricePoint[];
}

// ---------------------------------------------------------------------------
// GeoJSON (minimal, dependency-free)
// ---------------------------------------------------------------------------

export type Position = [number, number];
export type PointGeometry = { type: "Point"; coordinates: Position };
export type LineStringGeometry = { type: "LineString"; coordinates: Position[] };
export type PolygonGeometry = { type: "Polygon"; coordinates: Position[][] };
export type Geometry = PointGeometry | LineStringGeometry | PolygonGeometry;

export interface Feature<G extends Geometry = Geometry, P = Record<string, unknown>> {
  type: "Feature";
  id?: string | number;
  geometry: G;
  properties: P;
}

export interface FeatureCollection<G extends Geometry = Geometry, P = Record<string, unknown>> {
  type: "FeatureCollection";
  features: Feature<G, P>[];
}

// ---------------------------------------------------------------------------
// Infrastructure
// ---------------------------------------------------------------------------

export type InfraKind = "solar_plant" | "wind_farm" | "nuclear" | "hydro" | "substation" | "line";
export type InfraLayer = "plants" | "substations" | "lines";

export interface InfrastructureProperties {
  id: string;
  name: string;
  kind: InfraKind;
  capacity_mw?: number;
  voltage_kv?: number;
  operator?: string;
  dev_region?: DevRegionCode;
  /** Always true in v1: positions and sizes are approximate. */
  approximate: true;
  note: string;
}

export interface InfrastructureParams {
  region?: RegionCode;
  layer?: InfraLayer | InfraLayer[];
  /** [minLon, minLat, maxLon, maxLat] */
  bbox?: [number, number, number, number];
}

export interface InfrastructureFeatureCollection extends FeatureCollection<Geometry, InfrastructureProperties> {
  provenance: Provenance;
  disclaimer: string;
  data_sources: DataSourceRef[];
}

// ---------------------------------------------------------------------------
// Regional forecast map
// ---------------------------------------------------------------------------

export interface RegionForecastProperties {
  code: DevRegionCode;
  name: string;
  centroid: Position;
  source: EnergySource;
  installed_capacity_mw: number;
  /** MW (scaled so regions sum to the national p50). */
  p50: number;
  p10: number;
  p90: number;
  capacity_factor: number;
  share_of_national: number;
  cloud_cover_total: number;
  shortwave_radiation: number;
  wind_speed_100m: number;
  temperature_2m: number;
}

export interface MapForecastParams {
  region?: RegionCode;
  source: EnergySource;
  time: IsoTime;
  issue_date?: DateKey;
}

export interface MapForecastResponse {
  region: RegionCode;
  source: EnergySource;
  time: IsoTime;
  issued_at: IsoTime;
  model_version: string;
  national_p50: number;
  provenance: Provenance;
  geometry_note: string;
  regions: FeatureCollection<PolygonGeometry, RegionForecastProperties>;
  /** Coarse national outline, for a base layer. */
  outline: Feature<PolygonGeometry, { name: string }>;
}

// ---------------------------------------------------------------------------
// Siting assistant (docs/07)
// ---------------------------------------------------------------------------

export type SitingCriterion =
  | "grid_proximity"
  | "renewable_supply"
  | "supply_variability"
  | "cooling_climate"
  | "connectivity"
  | "water_hazard";

export interface SitingRequest {
  region?: RegionCode;
  /** Relative weights (any non-negative scale; normalised server-side). */
  weights: Record<SitingCriterion, number>;
  constraints?: {
    exclude_protected?: boolean;
    exclude_flood_zones?: boolean;
  };
  /** Return the top N cells in `top`. Default 10. */
  top_n?: number;
}

export interface SitingCellProperties {
  id: string;
  centroid: Position;
  /** Weighted score 0-1 (0 when excluded). */
  score: number;
  /** 1 = best; null when excluded. */
  rank: number | null;
  excluded: boolean;
  exclusion_reason?: string;
  /** Normalised 0-1 criterion scores (1 = favourable). */
  criteria: Record<SitingCriterion, number>;
  /** Weighted contributions that sum to `score`. */
  contributions: Record<SitingCriterion, number>;
  nearest_substation: string;
  nearest_substation_km: number;
  nearest_city: string;
}

export interface SitingCriterionInfo {
  key: SitingCriterion;
  label: string;
  description: string;
  data_basis: string;
}

export interface SitingResponse {
  region: RegionCode;
  provenance: Provenance;
  cell_size_deg: [number, number];
  weights_normalised: Record<SitingCriterion, number>;
  criteria: SitingCriterionInfo[];
  assumptions: string[];
  cells: FeatureCollection<PolygonGeometry, SitingCellProperties>;
  top: SitingCellProperties[];
}

// ---------------------------------------------------------------------------
// Models, health, pipeline
// ---------------------------------------------------------------------------

export interface BacktestMetrics {
  mae_mw: number;
  rmse_mw: number;
  /** MAE / installed capacity, %. */
  nmae_pct: number;
  /** 1 - MAE_model / MAE_persistence. */
  skill_vs_persistence: number;
  /** Solar only. */
  skill_vs_clear_sky?: number;
  /** Share of actuals inside [p10, p90]; nominal 0.80. */
  coverage_p10_p90: number;
  /** Mean pinball loss over p10/p50/p90, MW. */
  pinball_mw: number;
  n_hours: number;
}

export interface ModelInfo {
  id: string;
  name: string;
  source: EnergySource;
  version: string;
  algorithm: string;
  objective: string;
  trained_at: IsoTime;
  training_window: { from: DateKey; to: DateKey };
  features: ModelFeature[];
  installed_capacity_mw: number;
  backtest: {
    method: string;
    window: { from: DateKey; to: DateKey };
    overall: BacktestMetrics;
    baselines: { persistence_mae_mw: number; clear_sky_mae_mw?: number };
    /** MAE by local hour of day (0-23). */
    mae_by_hour: { hour: number; mae_mw: number }[];
  };
  provenance: Provenance;
  notes: string[];
}

export interface ModelsResponse {
  models: ModelInfo[];
  provenance: Provenance;
}

export type FreshnessStatus = "fresh" | "stale" | "pending" | "error" | "planned";

export interface SourceHealth {
  id: string;
  name: string;
  status: FreshnessStatus;
  last_updated: IsoTime | null;
  expected_interval_minutes: number | null;
  lag_minutes: number | null;
  provenance: Provenance;
  note?: string;
}

export interface Health {
  status: "ok" | "degraded" | "down";
  checked_at: IsoTime;
  api_version: string;
  mode: "mock" | "live";
  sources: SourceHealth[];
}

export type PipelineNodeKind = "source" | "ingest" | "feature" | "model" | "output";
export type PipelineId = "solar" | "wind" | "shared";
export type PipelineNodeStatus = "ok" | "stale" | "pending" | "error" | "planned";

export interface PipelineNode {
  id: string;
  kind: PipelineNodeKind;
  label: string;
  description: string;
  status: PipelineNodeStatus;
  freshness: { last_updated: IsoTime | null; lag_minutes: number | null } | null;
  /** Which pipeline(s) own/use the node. */
  pipelines: PipelineId[];
  /** Feature nodes: ids of model nodes that consume the feature. */
  consumed_by?: string[];
  /** Feature nodes: matching WeatherPoint / model feature key. */
  feature_key?: string;
  unit?: string;
  /** Feature nodes used directly by the transparent surrogate (and so have SHAP values). */
  explained?: boolean;
  /** Route in this app that shows the node's data. */
  view?: string;
  provenance: Provenance;
}

export interface PipelineEdge {
  id: string;
  from: string;
  to: string;
  pipelines: PipelineId[];
  label?: string;
}

export interface PipelineGraph {
  generated_at: IsoTime;
  provenance: Provenance;
  nodes: PipelineNode[];
  edges: PipelineEdge[];
  /** Column order for layout. */
  stages: { kind: PipelineNodeKind; label: string }[];
}

// ---------------------------------------------------------------------------
// Errors (RFC 7807)
// ---------------------------------------------------------------------------

export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail?: string;
  instance?: string;
}
