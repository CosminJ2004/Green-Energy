# 09 Open Questions

Status: Living | Updated: 2026-10-17

Move items to the relevant doc or an ADR once resolved.

## Product
- Meetup date? It sets the v1 scope and the cut list in [08](08-roadmap-and-milestones.md).
- Talk length and audience (technical or general)?
- Is the siting assistant in v1 or a labelled prototype? (Currently: labelled prototype.)

## Data (see spikes in [02](02-data-sources.md))
- Does Transelectrica expose usable, permitted historical data (widget feed or DAMAS II), and at what resolution?
- Is the Open-Meteo Historical Forecast archive free to use for this project?
- Can OPCOM prices be obtained in bulk, and under what terms? Or is ENTSO-E enough?

## Technical
- Orchestrator: Dagster (proposed) vs Prefect vs plain scripts at first.
- Hosting target for the demo.
- Chart and map library final choices.
- Spatial sampling: how many weather locations, and how weighted?

- Is Energy-Charts' Romanian generation identical to ENTSO-E's, and is its generation-data licence fine for a commercial product? (ADR-0005, spikes S0-S1)

## Resolved
- v1 generation source: Energy-Charts (ADR-0005).
- Goal: portfolio/meetup first, startup potential. Scope: Romania national hourly, day-ahead, solar and wind. UI English only. Free data only. Price model in v2/v3.
