# 01 Requirements

Status: Draft | Updated: 2026-10-17

Priority: M = must for v1, S = should, C = could / later.

## Functional
| ID | Requirement | Pri |
|---|---|---|
| FR-01 | Ingest hourly (or finer) solar and wind generation for Romania | M |
| FR-02 | Ingest weather forecasts and history for a configurable set of locations | M |
| FR-03 | Produce a 24-48h hourly forecast for solar and wind with uncertainty (quantiles) | M |
| FR-04 | Show forecast against actuals and baselines | M |
| FR-05 | Explain each prediction by feature (SHAP-style) | M |
| FR-06 | What-if: change weather inputs and see the predicted output react | M |
| FR-07 | Interactive map with plants, substations, transmission lines, weather grid | M |
| FR-08 | Descriptive day-ahead price overlay vs production, negative-price hours | S |
| FR-09 | Data-centre siting assistant with adjustable weights | S |
| FR-10 | Live "now" panel from Transelectrica data | C |
| FR-11 | Day-ahead price model | C (v2) |
| FR-12 | Multi-country support | C (v3) |

## Non-functional
| ID | Requirement | Pri |
|---|---|---|
| NFR-01 | Genericity: behaviour configured by (country, source, locations); sources behind adapters | M |
| NFR-02 | Point-in-time-correct features, with automated leakage tests | M |
| NFR-03 | Reproducibility: versioned data, code, models; experiments tracked | M |
| NFR-04 | Idempotent, backfillable ingestion with retries and data-quality checks | M |
| NFR-05 | Monitoring of data freshness, forecast error and drift | S |
| NFR-06 | CI: lint, types, tests on every change | M |
| NFR-07 | Runs locally via Docker Compose; demo on free hosting tiers | M |
| NFR-08 | Secrets never committed | M |
| NFR-09 | Data licences respected and attributed in the UI | M |
| NFR-10 | UI responsive and usable on a projector at a meetup | S |
