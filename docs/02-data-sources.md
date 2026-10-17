# 02 Data Sources

Status: Draft | Updated: 2026-10-17

Verification status: `searched` = found via web search only, details not confirmed by calling the source; `to-verify` = unclear or conflicting, must be confirmed before use; `verified` = confirmed by a working call (none yet).

## Generation (targets)
**Decision (ADR-0005): v1 uses Energy-Charts as the primary generation source.** ENTSO-E is a planned cross-check and the likely long-term primary. Both sit behind the `GenerationSource` adapter.

| Source | What | Access | Status |
|---|---|---|---|
| **Energy-Charts API (Fraunhofer ISE), v1 primary** | Public net generation by type for RO: Solar, Wind onshore, Nuclear, Hydro, Gas, Coal, Biomass, Battery; plus Load and cross-border trading. Also installed power, day-ahead price endpoints | `https://api.energy-charts.info/public_power?country=ro&start=&end=`. No key. Limits: 2 requests/min per endpoint (burst 4). Licence CC BY 4.0 per their docs, attribution required; price data licence differs by zone | Tested 2026-10-17: Romania returns data; hourly in 2015, 2018 and 2021, 15-minute in 2025. **To-verify:** upstream source (assumed ENTSO-E), licence for generation data, earliest date, gaps, rooftop solar coverage |
| ENTSO-E Transparency Platform | Actual generation per type, installed capacity, day-ahead prices | REST API, free token (Account Settings, or email transparency@entsoe.eu "Restful API access"). 400 requests/min. Client `entsoe-py`. Spike script: `scripts/spike_entsoe.py` | searched; account exists, token pending |
| Transelectrica SEN | Production by source (coal, hydrocarbons, water, nuclear, wind, solar, biomass), consumption, balance | Website widget `SENGrafic`; feed behind it (`/sen-filter`) is used by third-party projects, not officially documented. Instantaneous values, roughly 10-minute resolution, 30 days of history reported by third parties. | to-verify (spike S2) |
| Transelectrica DAMAS II public reports | Reports; Transelectrica states 15-min data from 2024-07-01 is published there, and 2021-02-01 to 2024-06-30 is in its archive | newmarkets.transelectrica.ro, Transelectrica daily reports page | to-verify (spike S2) |

Notes: TSO figures mostly exclude rooftop/prosumer solar, so the UI must say "TSO-metered generation". Midday curtailment and negative prices distort solar output.

## Weather
| Source | What | Access | Status |
|---|---|---|---|
| Open-Meteo Forecast API | NWP forecasts: shortwave/direct/diffuse radiation, cloud cover (low/mid/high), temperature, wind at 10/80/120/180 m, humidity, snow | Free for non-commercial use, CC BY 4.0 (attribution required), 600/min, 5k/hour, 10k/day | searched |
| Open-Meteo Historical Forecast API | Archived past forecasts (from ~2021) for training on real forecast data | Sources conflict on whether this is in the free tier | **to-verify (spike S3)** |
| Open-Meteo Historical Weather (ERA5-based) | Reanalysis history | Free non-commercial | searched |
| ERA5 / ERA5-Land (Copernicus CDS) | Reanalysis, long history, 100 m wind | Free account | not checked, fallback |
| PVGIS (EU JRC), CAMS | Clear-sky and radiation climatology | Free | not checked |
| Global Wind Atlas | Wind resource maps | Free | not checked |

## Market
| Source | What | Access | Status |
|---|---|---|---|
| ENTSO-E | Day-ahead prices (RO) | Same token | searched |
| OPCOM (PZU) | Day-ahead market results; 15-minute interval since delivery day 2025-06-12 | Website tables; no documented bulk export found | to-verify (scraping may be needed; ToS to check) |

## Infrastructure and siting
| Source | What | Status |
|---|---|---|
| OpenStreetMap (Overpass) | Power plants, generators (solar/wind), substations, lines | not checked |
| ANRE, Transelectrica network development plan | Official grid and capacity info | not checked |
| Eurostat, IRENA | Installed capacity statistics | not checked |
| CORINE land cover, Natura 2000 | Land-use and protected-area constraints (siting) | not checked |

## Spikes
| ID | Task | Outcome needed |
|---|---|---|
| S0 | Energy-Charts: pull RO solar and wind for 2+ years; check gaps, resolution changes (hourly to 15-min), units, timezone | **Done 2026-10-17: usable.** 15-min from 2022, about 27 nulls, no gaps over 3h. Solar peak grew from 836 MW (2022) to 3,395 MW (2026), so capacity normalisation is required. Night solar up to 46 MW needs a check. Details in [10](10-implementation-log.md) |
| S1 | Get ENTSO-E token; pull RO solar, wind, prices; compare against Energy-Charts | Is Energy-Charts equal to ENTSO-E? Decide primary |
| S2 | Inspect Transelectrica SEN widget network calls and DAMAS II reports | Decide: training target, validation only, or live panel only; check terms of use |
| S3 | Confirm Open-Meteo Historical Forecast archive is usable for free | Decide archived-NWP vs ERA5 training (ADR-0004) |
| S4 | Check OPCOM data export / terms | Price overlay source |
| S5 | Pull OSM power infrastructure for Romania | Map layer feasibility |
