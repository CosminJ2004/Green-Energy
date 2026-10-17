# 04 ML Pipeline

Status: Draft | Updated: 2026-10-17

## Problem
Forecast hourly Romanian solar and wind generation (MW, and capacity factor) for the next 24-48h, issued daily before the day-ahead market closes, with prediction intervals.

## Targets
- Solar and wind generation from ENTSO-E (primary); Transelectrica for validation (see [02](02-data-sources.md)).
- Model on capacity factor (generation / installed capacity), convert back to MW. Capacity growth is a feature or normaliser.

## Features (all point-in-time correct)
- Solar: shortwave, direct and diffuse radiation, cloud cover (low/mid/high), temperature, clear-sky index and solar geometry (pvlib), snow, humidity.
- Wind: wind speed and direction at 80/120/180 m, gusts, pressure, temperature (air density).
- Calendar: hour, day of year, holiday.
- Spatial: weather at several locations weighted by regional capacity, not one national point.
- Market/curtailment proxies (later): day-ahead price, negative-price flags.
- Lagged actuals only if available at issue time.

## Training data policy
Train on archived NWP forecasts (what was predicted at issue time), not observed or reanalysis weather. If only reanalysis is available, document the optimism in reported accuracy. See ADR-0004.

## Models
1. Baselines: persistence (same hour yesterday), clear-sky-scaled persistence, climatology.
2. Main: LightGBM, quantile objectives (e.g. 10/50/90).
3. Later: neural sequence models, ensembles of multiple NWP sources.

## Evaluation
- Walk-forward (expanding window) backtests, never random splits.
- Metrics: MAE, RMSE, nMAE (by capacity), skill score vs persistence, interval coverage and pinball loss; reported per horizon, hour of day and season.
- Ramp/extreme-event analysis for the meetup story.

## Explainability
- SHAP values per prediction and aggregated per hour.
- What-if: re-run inference with user-modified weather inputs (counterfactual endpoint). Make clear that features are correlated, so what-if is illustrative.

## MLOps
- Experiment tracking and model registry: MLflow.
- Scheduled pipeline (Dagster): ingest, features, forecast, evaluate vs actuals.
- Retraining: scheduled plus trigger on drift or error threshold.
- Monitoring: data freshness, schema and range checks, error vs actuals, feature drift.
- Tests: unit tests, leakage tests (no future data in features), idempotency tests.

## Risks
- Missing rooftop solar in TSO data; curtailment distorts midday solar.
- Short archive of NWP forecasts limits training length.
- Capacity growth non-stationarity.
