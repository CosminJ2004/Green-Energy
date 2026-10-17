# 03 Architecture (High-Level Design)

Status: Draft | Updated: 2026-10-17

## Principles
1. Generic: configured by `(country, energy_source, location set)`; adding wind or a new country means config plus adapters, not new pipelines.
2. Point-in-time correctness: no feature may use information unavailable at forecast issue time.
3. Reproducible and observable: versioned data, models and runs; monitoring from the start.
4. Boring, free infrastructure first; swappable later (local files to S3-compatible, Compose to cloud).

## Data flow
```
Sources            Ingestion        Raw lake       Features        Training        Registry
ENTSO-E        -->  adapters   -->  Parquet   -->  feature    -->  LightGBM   -->  MLflow
Transelectrica      (typed,         (immutable,    store           (walk-forward)   model
Open-Meteo/ERA5     retries)        partitioned)   (PIT-correct)                    versions
OPCOM, OSM                                              |                              |
                                                        v                              v
                                                   Batch forecast  -->  Forecast tables (DuckDB/Postgres)
                                                                                |
Orchestration: Dagster (assets, schedules, backfills)                          v
Monitoring: freshness, error vs actuals, drift                     FastAPI  -->  Next.js UI (+ MapLibre/deck.gl)
```

## Components
| Component | Responsibility |
|---|---|
| `ingest` | Source adapters implementing `GenerationSource`, `WeatherSource`, `PriceSource`, `InfrastructureSource`; writes raw Parquet |
| `features` | Builds PIT-correct feature tables: solar geometry (pvlib), clear-sky index, wind at hub height, capacity factor, calendar features |
| `ml` | Training, backtesting, baselines, SHAP, model registry, batch inference |
| `api` | FastAPI service exposing forecasts, explanations, what-if, map data |
| `web` | Next.js app with charts and interactive maps |
| `infra` | Docker Compose, CI, later IaC |
| Orchestrator | Dagster: partitioned assets, schedules, backfills, data-quality checks |

## Generic model
- A `Region` (country or bidding zone) has `Location`s with weights (capacity-based) and an `EnergySource` config (solar, wind).
- Config declares: target series, weather variables, feature set, model type, horizon.
- Adapters normalise to common schemas (UTC timestamps, MW, standard variable names).
- See ADR-0003.

## Storage
- Raw and features: Parquet, queried with DuckDB (local first, S3-compatible later).
- Serving and geo: Postgres/PostGIS for infrastructure, forecasts and map layers. See ADR-0002.

## Deployment (v1)
- Local: Docker Compose (Dagster, MLflow, Postgres, API, web).
- Demo: free tiers (e.g. Vercel for web, a free container host for API); GitHub Actions for CI and, if needed, scheduled jobs. Final choice is open.

## Quality and engineering
uv, ruff, mypy, pytest, pre-commit, Pandera/Great Expectations for data checks, leakage tests in CI, contract tests for the API.

## Open
- Orchestrator final choice (Dagster proposed), hosting target. See [09](09-open-questions.md).
