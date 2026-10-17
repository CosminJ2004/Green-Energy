/**
 * Typed API client — the ONLY way views get data.
 *
 * Mode: if NEXT_PUBLIC_API_BASE_URL is set, every call goes to the real FastAPI
 * backend (`${base}/v1/...`, docs/05-api-design.md). Otherwise an in-browser mock
 * backend (src/lib/mock, lazily loaded) answers with synthetic data.
 *
 * Call these from client components (e.g. via useApi). Real actuals are read
 * from /data/actuals-ro.json (written by `npm run data:actuals`) when present.
 */

import type {
  Actuals,
  ActualsParams,
  Baselines,
  BaselinesParams,
  ExplainParams,
  ExplainSeriesParams,
  Explanation,
  ExplanationSeries,
  ForecastParams,
  ForecastResponse,
  Health,
  InfrastructureFeatureCollection,
  InfrastructureParams,
  MapForecastParams,
  MapForecastResponse,
  ModelsResponse,
  PipelineGraph,
  PriceParams,
  PriceSeries,
  ProblemDetails,
  SitingRequest,
  SitingResponse,
  WeatherParams,
  WeatherResponse,
  WhatIfRequest,
  WhatIfResponse,
} from "./types";
import type { MockApi, MockContext, RealActualsFile } from "@/lib/mock";

const BASE = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").replace(/\/+$/, "");
const MOCK_LATENCY_MS = Number(process.env.NEXT_PUBLIC_MOCK_LATENCY_MS ?? 60);

/** "live" when NEXT_PUBLIC_API_BASE_URL is set, otherwise "mock". */
export const API_MODE: "live" | "mock" = BASE ? "live" : "mock";

export class ApiError extends Error {
  readonly status: number;
  readonly problem?: ProblemDetails;
  constructor(message: string, status: number, problem?: ProblemDetails) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.problem = problem;
  }
}

// ---------------------------------------------------------------------------
// Transport
// ---------------------------------------------------------------------------

type QueryValue = string | number | boolean | undefined | null | (string | number)[];

function buildQuery(params: object): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params) as [string, QueryValue][]) {
    if (v === undefined || v === null) continue;
    q.set(k, Array.isArray(v) ? v.join(",") : String(v));
  }
  const s = q.toString();
  return s ? `?${s}` : "";
}

async function http<T>(path: string, init?: { query?: object; body?: unknown }): Promise<T> {
  const url = `${BASE}/v1${path}${init?.query ? buildQuery(init.query) : ""}`;
  const res = await fetch(url, {
    method: init?.body !== undefined ? "POST" : "GET",
    headers: init?.body !== undefined ? { "Content-Type": "application/json", Accept: "application/json" } : { Accept: "application/json" },
    body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
  if (!res.ok) {
    let problem: ProblemDetails | undefined;
    try {
      problem = (await res.json()) as ProblemDetails;
    } catch {
      /* not RFC 7807 */
    }
    throw new ApiError(problem?.title ?? `API ${res.status} on ${path}`, res.status, problem);
  }
  return (await res.json()) as T;
}

// ---------------------------------------------------------------------------
// Mock plumbing
// ---------------------------------------------------------------------------

let mockModule: Promise<typeof import("@/lib/mock")> | null = null;
function loadMock() {
  mockModule ??= import("@/lib/mock");
  return mockModule;
}

let realActualsPromise: Promise<RealActualsFile | null> | null = null;

/** Loads public/data/actuals-ro.json once (browser only). Resolves to null when absent or invalid. */
export function loadRealActuals(): Promise<RealActualsFile | null> {
  if (typeof window === "undefined") return Promise.resolve(null);
  realActualsPromise ??= fetch("/data/actuals-ro.json", { cache: "no-store" })
    .then(async (r) => {
      if (!r.ok) return null;
      const j = (await r.json()) as RealActualsFile;
      return j && j.series && Array.isArray(j.series.solar) ? j : null;
    })
    .catch(() => null);
  return realActualsPromise;
}

async function withMock<T>(fn: (api: MockApi, ctx: MockContext) => T): Promise<T> {
  const [{ mockApi }, realActuals] = await Promise.all([loadMock(), loadRealActuals()]);
  if (MOCK_LATENCY_MS > 0) await new Promise((r) => setTimeout(r, MOCK_LATENCY_MS));
  return fn(mockApi, { now: Date.now(), realActuals });
}

// ---------------------------------------------------------------------------
// Endpoints (names follow docs/05-api-design.md)
// ---------------------------------------------------------------------------

/** GET /v1/forecast — quantile forecast for [from, to). */
export function getForecast(params: ForecastParams): Promise<ForecastResponse> {
  if (BASE) return http("/forecast", { query: { region: "RO", ...params } });
  return withMock((api) => api.getForecast(params));
}

/** GET /v1/actuals — observed generation (or load). Real Energy-Charts data when the snapshot covers the range. */
export function getActuals(params: ActualsParams): Promise<Actuals> {
  if (BASE) return http("/actuals", { query: { region: "RO", ...params } });
  return withMock((api, ctx) => api.getActuals(params, ctx));
}

/** GET /v1/baselines — persistence, clear-sky (solar) and climatology. */
export function getBaselines(params: BaselinesParams): Promise<Baselines> {
  if (BASE) return http("/baselines", { query: { region: "RO", ...params } });
  return withMock((api) => api.getBaselines(params));
}

/** GET /v1/explain?time — Shapley feature contributions for one hour. */
export function getExplanation(params: ExplainParams): Promise<Explanation> {
  if (BASE) return http("/explain", { query: { region: "RO", ...params } });
  return withMock((api) => api.getExplanation(params));
}

/** GET /v1/explain?from&to — contributions for every hour (extension, for the day timeline). */
export function getExplanationSeries(params: ExplainSeriesParams): Promise<ExplanationSeries> {
  if (BASE) return http("/explain", { query: { region: "RO", ...params } });
  return withMock((api) => api.getExplanationSeries(params));
}

/** POST /v1/whatif — re-run the model with overridden weather inputs. */
export function postWhatIf(body: WhatIfRequest): Promise<WhatIfResponse> {
  if (BASE) return http("/whatif", { body });
  return withMock((api) => api.postWhatIf(body));
}

/** GET /v1/weather — weather inputs (NWP forecast for issue_date, or analysis). */
export function getWeather(params: WeatherParams): Promise<WeatherResponse> {
  if (BASE) return http("/weather", { query: { region: "RO", ...params } });
  return withMock((api) => api.getWeather(params));
}

/** GET /v1/prices — day-ahead prices (hourly mean of 15-minute results). */
export function getPrices(params: PriceParams): Promise<PriceSeries> {
  if (BASE) return http("/prices", { query: { region: "RO", ...params } });
  return withMock((api) => api.getPrices(params));
}

/** GET /v1/infrastructure — GeoJSON plants, substations, lines. */
export function getInfrastructure(params: InfrastructureParams = {}): Promise<InfrastructureFeatureCollection> {
  if (BASE) return http("/infrastructure", { query: { region: "RO", layer: params.layer, bbox: params.bbox } });
  return withMock((api) => api.getInfrastructure(params));
}

/** GET /v1/map/forecast — regional forecast heat for one hour. */
export function getMapForecast(params: MapForecastParams): Promise<MapForecastResponse> {
  if (BASE) return http("/map/forecast", { query: { region: "RO", ...params } });
  return withMock((api) => api.getMapForecast(params));
}

/** POST /v1/siting/score — weighted multi-criteria scores (GeoJSON cells). */
export function postSitingScore(body: SitingRequest): Promise<SitingResponse> {
  if (BASE) return http("/siting/score", { body });
  return withMock((api) => api.postSitingScore(body));
}

/** GET /v1/models — model versions and backtest metrics. */
export function getModels(): Promise<ModelsResponse> {
  if (BASE) return http("/models");
  return withMock((api, ctx) => api.getModels(ctx));
}

/** GET /v1/health — data freshness per source. */
export function getHealth(): Promise<Health> {
  if (BASE) return http("/health");
  return withMock((api, ctx) => api.getHealth(ctx));
}

/** GET /v1/pipeline — data/ML pipeline graph (extension). */
export function getPipelineGraph(): Promise<PipelineGraph> {
  if (BASE) return http("/pipeline");
  return withMock((api, ctx) => api.getPipelineGraph(ctx));
}
