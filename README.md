# Green Energy: Romania Solar + Wind Forecast Platform

Weather-driven ML forecasts of solar and wind electricity generation in Romania (24-48h ahead, hourly), with explainability, interactive grid maps and, later, market-price modelling. Designed to be production-grade and generic enough to extend to other countries and energy sources.

**Status:** planning (docs only, no code yet). Last updated 2026-10-17.

**First milestone:** a v1 demo for a meetup talk, "Know tomorrow's solar and wind output before it happens".

## Documentation (source of truth)

| Doc | Purpose |
|---|---|
| [00 Vision and scope](docs/00-vision-and-scope.md) | Goals, pitch, roadmap, non-goals, success metrics |
| [01 Requirements](docs/01-requirements.md) | Functional and non-functional requirements (IDs) |
| [02 Data sources](docs/02-data-sources.md) | APIs and datasets, licences, limits, verification status |
| [03 Architecture (HLD)](docs/03-architecture-hld.md) | Components, data flow, generic adapter model, stack |
| [04 ML pipeline](docs/04-ml-pipeline.md) | Features, models, backtesting, MLOps, monitoring |
| [05 API design](docs/05-api-design.md) | Endpoints and schemas |
| [06 UI design](docs/06-ui-design.md) | Views, wireframes, interactions |
| [07 Siting assistant](docs/07-siting-assistant.md) | AI data-centre siting method |
| [08 Roadmap and milestones](docs/08-roadmap-and-milestones.md) | Phases, scope cuts, risks |
| [09 Open questions](docs/09-open-questions.md) | Unresolved questions and spikes |
| [10 Implementation log](docs/10-implementation-log.md) | Chronological record of every build step |
| [ADRs](docs/adr/) | Architecture decision records |

Rules for contributors (and for Claude) are in [CLAUDE.md](CLAUDE.md): the docs are authoritative, and decisions are changed in the docs first.
