# ADR-0004: Train on archived NWP forecasts

Status: Accepted (data availability pending spike S3) | Date: 2026-10-17

## Context
At prediction time we only have weather forecasts. Training on observed or reanalysis weather gives optimistic accuracy that real forecasts will not match.

## Decision
- Train and backtest on archived forecasts as issued (e.g. Open-Meteo Historical Forecast API, from ~2021) wherever possible.
- If only reanalysis (ERA5) is usable, state the optimism in all reported metrics, and start archiving live forecasts daily so a proper dataset accumulates.
- Features must be point-in-time correct; leakage tests run in CI.

## Consequences
Honest metrics and better real-world behaviour, at the cost of a shorter training history. Depends on the outcome of spike S3 in [02](../02-data-sources.md).
