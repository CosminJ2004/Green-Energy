# 05 API Design

Status: Draft | Updated: 2026-10-17

FastAPI, JSON, OpenAPI schema published, versioned under `/v1`. Timestamps are ISO 8601 UTC. Power in MW. All endpoints take `region` (default `RO`) and `source` (`solar` | `wind`).

| Endpoint | Purpose |
|---|---|
| `GET /v1/forecast?region&source&from&to` | Forecast with quantiles (p10/p50/p90), model version, issue time |
| `GET /v1/actuals?region&source&from&to` | Observed generation |
| `GET /v1/baselines?region&source&from&to` | Persistence and clear-sky baselines |
| `GET /v1/explain?region&source&time` | Feature contributions (SHAP) for an hour |
| `POST /v1/whatif` | Body: base time plus overridden weather inputs; returns modified forecast and delta |
| `GET /v1/weather?region&from&to` | Weather inputs used by the model |
| `GET /v1/prices?region&from&to` | Day-ahead prices (descriptive, v1) |
| `GET /v1/infrastructure?region&layer&bbox` | GeoJSON: plants, substations, lines |
| `GET /v1/map/forecast?region&time` | Regional forecast heat data |
| `POST /v1/siting/score` | Body: criteria weights; returns scored locations (GeoJSON) |
| `GET /v1/models` | Model versions and metrics |
| `GET /v1/health` | Data freshness and service status |

## Conventions
- Errors: RFC 7807 problem details.
- Forecast responses always include `model_version`, `issued_at`, `data_sources` for attribution.
- Contract tests generated from the OpenAPI schema.
- Breaking changes require a new version prefix.

## Open
- Auth/rate limiting (not needed for v1 demo; needed for a product).
