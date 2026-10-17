# 08 Roadmap and Milestones

Status: Draft | Updated: 2026-10-17

Timeline depends on the meetup date (unknown, see [09](09-open-questions.md)). Milestones are ordered; dates are to be set.

## Phases
| Phase | Content | Exit criteria |
|---|---|---|
| 0 Foundations | Repo skeleton, tooling, CI, Docker Compose, ADRs; ENTSO-E token requested; spikes S1-S5 | Spike outcomes recorded in [02](02-data-sources.md) |
| 1 Data | Source adapters (ENTSO-E, Open-Meteo, OSM), raw lake, quality checks, backfill 2+ years | Idempotent backfill; quality checks pass |
| 2 Model | Features, baselines, LightGBM solar then wind, walk-forward backtest, MLflow | Beats persistence; report in docs |
| 3 Serving | Scheduled forecast, FastAPI, SHAP and what-if endpoints | Contract tests pass |
| 4 UI | Forecast, explain, what-if views | Demo-able end to end |
| 5 Map | Energy map with infrastructure, regional heat, price overlay | Demo-able |
| 6 Siting and polish | Siting prototype, monitoring dashboard, meetup rehearsal | Talk-ready |
| v2 | Price model, regional forecasts, battery what-ifs | |
| v3 | Multi-country, nowcasting, product features | |

## Scope cut list (drop from the bottom if time runs short)
1. Keep: solar forecast, explain, what-if, basic map.
2. Next: wind forecast.
3. Next: infrastructure layers, price overlay.
4. Next: siting assistant.
5. Last: monitoring dashboard, live Transelectrica panel.

## Risks
| Risk | Mitigation |
|---|---|
| ENTSO-E token approval delay | Request immediately; use Transelectrica or ERA5-based exploration meanwhile |
| Open-Meteo forecast archive not free | Fall back to ERA5 with documented optimism, or collect forecasts daily from now |
| Transelectrica feed unofficial or unstable | Treat as optional; do not depend on it for training |
| Scope too large for the meetup | Follow the cut list; v1 stays national and hourly |
| TSO data omits rooftop solar | State clearly in the UI |

## Task checklist
- [ ] Get ENTSO-E token (account exists; used for cross-check, not blocking)
- [x] Spike S0: Energy-Charts backfill check (usable; see docs/10)
- [ ] Spikes S1-S5
- [ ] Repo skeleton and CI
- [ ] Data adapters and backfill
- [ ] Baselines and LightGBM
- [ ] API
- [ ] UI views
- [ ] Map
- [ ] Siting prototype
- [ ] Meetup rehearsal
