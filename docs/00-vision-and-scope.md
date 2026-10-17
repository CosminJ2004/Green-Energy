# 00 Vision and Scope

Status: Draft | Updated: 2026-10-17

## Vision
Predict tomorrow's solar and wind production in Romania from weather, explain what drives each prediction, and turn the forecast into decisions: grid balancing, batteries, consumers, infrastructure planning and prices. The platform is built production-grade and generic so it can grow into a startup product.

## Meetup pitch (v1 driver)
> What if we could know tomorrow's solar and wind energy production before it happens? This talk explores how AI and weather-based Machine Learning forecasts can predict renewable-energy output and turn that knowledge into smarter decisions across the energy system.
>
> Better forecasts help smart grids balance supply and demand, stabilize energy prices, plan infrastructure more efficiently, and reduce the waste of clean energy. We will look at how a prediction made today can influence the electricity grid, batteries, consumers, and the green-energy system of tomorrow.
>
> As AI itself requires significant energy, can we use it wisely enough to make the future greener than the technology's footprint?

Demo story: 1) Forecast, 2) Explain, 3) Act (grid, batteries, prices), 4) The AI footprint angle (where to site data centres).

## Decisions
- Goal: portfolio/meetup showcase first, with startup potential kept open.
- Target: national Romania, hourly, day-ahead (24-48h), solar and wind.
- ML pipeline is production-grade from the start.
- Architecture is generic across country and energy source.
- Stack: Python backend, React/Next.js frontend, English UI.
- Free data and tools only for now.

## Roadmap
| Version | Scope |
|---|---|
| v1 (meetup) | Solar + wind national forecast, explainability, interactive map with grid infrastructure, descriptive price overlay, first data-centre siting layer |
| v2 | Day-ahead price model, regional and per-site forecasts, battery/dispatch what-ifs |
| v3 | Multi-country (Europe), nowcasting, external API and product features |

## Non-goals (v1)
- Price prediction (descriptive overlay only).
- Per-plant forecasts, intraday nowcasting from satellite imagery.
- Multi-country support in the UI (the architecture must allow it, though).
- Trading or financial advice.

## Success metrics
- Forecast beats persistence and clear-sky baselines in walk-forward backtests, with accuracy reported honestly (MAE, nMAE, skill score) for solar and wind.
- A live, reliable demo for the meetup.
- Pipeline runs unattended: scheduled ingestion, forecast, monitoring.
- Adding a new country or source needs config plus an adapter, not new pipelines.

## Open
- Meetup date, talk length and audience: see [09](09-open-questions.md).
