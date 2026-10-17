/**
 * Mock backend: implements every endpoint of docs/05-api-design.md in-process.
 * PRIVATE to src/lib/api — views must import from "@/lib/api", never from here.
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
  InfraLayer,
  MapForecastParams,
  MapForecastResponse,
  ModelsResponse,
  PipelineGraph,
  PriceParams,
  PriceSeries,
  SitingRequest,
  SitingResponse,
  WeatherParams,
  WeatherResponse,
  WhatIfRequest,
  WhatIfResponse,
} from "@/lib/api/types";
import { HOUR_MS, forecastWindow, toIso } from "@/lib/time";
import { DEV_REGIONS, ROMANIA_OUTLINE } from "./geo";
import {
  BASELINE_DESCRIPTIONS,
  capacityOf,
  clearSkySeries,
  climatologySeries,
  defaultIssueDate,
  explainHour,
  forecastSeries,
  hoursIn,
  modelVersionOf,
  persistenceSeries,
  regionalForecast,
  syntheticActualSeries,
  whatIf,
} from "./forecast";
import { featuresFor } from "./explain";
import { infrastructureFeatures } from "./infrastructure";
import { marketHour } from "./market";
import { SOURCES, health, modelInfo, pipelineGraph } from "./ops";
import { SITING_ASSUMPTIONS, SITING_CRITERIA, scoreSiting } from "./siting";
import { issueTimeMs, toWeatherPoint, weatherAt } from "./weather";

export { checkShapley } from "./explain";

/** Shape of public/data/actuals-ro.json written by scripts/fetch-actuals.mjs. */
export interface RealActualsFile {
  source: string;
  license: string;
  fetched_at: string;
  resolution_minutes: number;
  series: { solar: { time: string; mw: number }[]; wind: { time: string; mw: number }[]; load: { time: string; mw: number }[] };
}

export interface MockContext {
  now: number;
  realActuals: RealActualsFile | null;
}

const ms = (iso: string) => new Date(iso).getTime();

export const mockApi = {
  getForecast(p: ForecastParams): ForecastResponse {
    const from = ms(p.from);
    const issue = p.issue_date ?? defaultIssueDate(from);
    return {
      region: "RO",
      source: p.source,
      model_version: modelVersionOf(p.source),
      issued_at: toIso(issueTimeMs(issue)),
      data_sources: [SOURCES.synthetic, SOURCES.openMeteo],
      unit: "MW",
      installed_capacity_mw: capacityOf(p.source),
      provenance: "synthetic",
      points: forecastSeries(p.source, from, ms(p.to), issue),
    };
  },

  getActuals(p: ActualsParams, ctx: MockContext): Actuals {
    const from = ms(p.from);
    const to = ms(p.to);
    const note =
      p.source === "load" ? "National consumption (load)." : p.source === "solar" ? "TSO-metered generation; most rooftop/prosumer solar is not included." : "TSO-metered onshore wind generation.";
    const real = ctx.realActuals;
    if ((p.prefer ?? "real") === "real" && real) {
      const pts = real.series[p.source].filter((x) => {
        const t = ms(x.time);
        return t >= from && t < to;
      });
      if (pts.length > 0) {
        return {
          region: "RO",
          source: p.source,
          unit: "MW",
          resolution_minutes: 60,
          provenance: "real",
          data_sources: [SOURCES.energyCharts],
          note,
          fetched_at: real.fetched_at,
          points: pts,
        };
      }
    }
    return {
      region: "RO",
      source: p.source,
      unit: "MW",
      resolution_minutes: 60,
      provenance: "synthetic",
      data_sources: [SOURCES.synthetic],
      note: `${note} Synthetic stand-in.`,
      points: syntheticActualSeries(p.source, from, to, ctx.now),
    };
  },

  getBaselines(p: BaselinesParams): Baselines {
    const from = ms(p.from);
    const to = ms(p.to);
    return {
      region: "RO",
      source: p.source,
      unit: "MW",
      provenance: "synthetic",
      persistence: persistenceSeries(p.source, from, to, p.issue_date),
      clear_sky: p.source === "solar" ? clearSkySeries(from, to, p.issue_date) : null,
      climatology: climatologySeries(p.source, from, to),
      descriptions: {
        persistence: BASELINE_DESCRIPTIONS.persistence,
        clear_sky: p.source === "solar" ? BASELINE_DESCRIPTIONS.clear_sky : null,
        climatology: BASELINE_DESCRIPTIONS.climatology,
      },
    };
  },

  getExplanation(p: ExplainParams): Explanation {
    const t = Math.floor(ms(p.time) / HOUR_MS) * HOUR_MS;
    return explainHour(p.source, t, p.issue_date);
  },

  getExplanationSeries(p: ExplainSeriesParams): ExplanationSeries {
    const points = hoursIn(ms(p.from), ms(p.to)).map((t) => explainHour(p.source, t, p.issue_date));
    return {
      region: "RO",
      source: p.source,
      model_version: modelVersionOf(p.source),
      unit: "MW",
      provenance: "synthetic",
      features: featuresFor(p.source),
      points,
    };
  },

  postWhatIf(req: WhatIfRequest): WhatIfResponse {
    const win = forecastWindow(req.issue_date);
    const from = ms(req.from ?? win.from);
    const to = ms(req.to ?? win.to);
    const r = whatIf(req, from, to);
    return {
      region: "RO",
      source: req.source,
      model_version: modelVersionOf(req.source),
      unit: "MW",
      provenance: "synthetic",
      base: r.base,
      modified: r.modified,
      delta: r.delta,
      totals: r.totals,
      base_weather: r.baseWeather,
      modified_weather: r.modWeather,
      note:
        "Illustrative: real weather inputs are correlated (e.g. more cloud also means less irradiance and a cooler afternoon). Changing one input at a time shows the model's sensitivity, not a physically complete scenario.",
    };
  },

  getWeather(p: WeatherParams): WeatherResponse {
    const from = ms(p.from);
    const points = hoursIn(from, ms(p.to)).map((t) => toWeatherPoint(weatherAt(t, { issueDate: p.issue_date, devRegion: p.dev_region })));
    return {
      region: "RO",
      dev_region: p.dev_region,
      kind: p.issue_date ? "forecast" : "analysis",
      issue_date: p.issue_date,
      aggregation: p.dev_region
        ? "Single development-region point."
        : "Capacity-weighted over 8 development regions: solar weights for radiation, cloud, temperature, humidity, snow; wind weights for wind, icing and air density.",
      provenance: "synthetic",
      data_sources: [SOURCES.synthetic, SOURCES.openMeteo],
      points,
    };
  },

  getPrices(p: PriceParams): PriceSeries {
    const points = hoursIn(ms(p.from), ms(p.to)).map((t) => {
      const m = marketHour(t);
      return {
        time: toIso(t),
        price: m.price,
        quarter_hours: m.quarterHours,
        load_mw: Math.round(m.loadMw),
        solar_mw: Math.round(m.solarMw),
        wind_mw: Math.round(m.windMw),
        renewable_share: Math.round(((m.solarMw + m.windMw) / m.loadMw) * 1000) / 1000,
      };
    });
    return {
      region: "RO",
      market: "Day-ahead (PZU), Romania",
      currency: "EUR",
      unit: "EUR/MWh",
      resolution_minutes: 60,
      source_resolution_minutes: 15,
      provenance: "synthetic",
      data_sources: [SOURCES.synthetic],
      points,
    };
  },

  getInfrastructure(p: InfrastructureParams): InfrastructureFeatureCollection {
    const layers: InfraLayer[] = p.layer ? (Array.isArray(p.layer) ? p.layer : [p.layer]) : ["plants", "substations", "lines"];
    return {
      type: "FeatureCollection",
      features: infrastructureFeatures(layers, p.bbox),
      provenance: "synthetic",
      disclaimer: "Approximate, illustrative: real asset names, but positions, capacities and line routes are simplified.",
      data_sources: [SOURCES.osm],
    };
  },

  getMapForecast(p: MapForecastParams): MapForecastResponse {
    const t = Math.floor(ms(p.time) / HOUR_MS) * HOUR_MS;
    const issue = p.issue_date ?? defaultIssueDate(t);
    const props = regionalForecast(p.source, t, issue);
    const polyBy = new Map(DEV_REGIONS.map((r) => [r.code, r.polygon]));
    return {
      region: "RO",
      source: p.source,
      time: toIso(t),
      issued_at: toIso(issueTimeMs(issue)),
      model_version: modelVersionOf(p.source),
      national_p50: Math.round(props.reduce((a, r) => a + r.p50, 0) * 10) / 10,
      provenance: "synthetic",
      geometry_note: "Development-region polygons are coarse hand-drawn approximations (illustrative).",
      regions: {
        type: "FeatureCollection",
        features: props.map((r) => ({ type: "Feature", id: r.code, geometry: { type: "Polygon", coordinates: [polyBy.get(r.code)!] }, properties: r })),
      },
      outline: { type: "Feature", geometry: { type: "Polygon", coordinates: [ROMANIA_OUTLINE] }, properties: { name: "Romania (approximate outline)" } },
    };
  },

  postSitingScore(req: SitingRequest): SitingResponse {
    const r = scoreSiting(req);
    return {
      region: "RO",
      provenance: "synthetic",
      cell_size_deg: r.cellSize,
      weights_normalised: r.weights,
      criteria: SITING_CRITERIA,
      assumptions: SITING_ASSUMPTIONS,
      cells: { type: "FeatureCollection", features: r.features },
      top: r.top,
    };
  },

  getModels(ctx: MockContext): ModelsResponse {
    return { models: [modelInfo("solar", ctx.now), modelInfo("wind", ctx.now)], provenance: "synthetic" };
  },

  getHealth(ctx: MockContext): Health {
    return health(ctx.now, ctx.realActuals?.fetched_at ?? null);
  },

  getPipelineGraph(ctx: MockContext): PipelineGraph {
    return pipelineGraph(ctx.now, ctx.realActuals?.fetched_at ?? null);
  },
};

export type MockApi = typeof mockApi;
