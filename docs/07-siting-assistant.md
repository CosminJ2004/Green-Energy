# 07 Siting Assistant (AI data centres)

Status: Draft | Updated: 2026-10-17

## Purpose
Support the talk's closing question: can AI be run in a way that fits the green-energy system? The assistant ranks candidate areas in Romania for a new AI data centre. It is decision support with transparent weights, not an oracle, and in v1 it is a clearly labelled prototype.

## Method
Multi-criteria scoring on a grid of candidate cells (e.g. H3 hexagons or ~5 km cells). Each criterion is normalised to 0-1; the user adjusts weights; hard constraints exclude cells.

| Criterion | Idea | Data (to-verify) |
|---|---|---|
| Grid proximity | Distance to substations and high-voltage lines | OSM, Transelectrica plans |
| Renewable supply | Local/regional solar and wind potential and forecast generation | This platform's forecasts, PVGIS, Global Wind Atlas |
| Supply variability | How predictable the renewable supply is (forecast error) | This platform's backtests |
| Cooling climate | Low average temperature reduces cooling energy | Open-Meteo / ERA5 |
| Connectivity | Distance to fibre or internet exchange points | Public IXP lists, OSM (partial) |
| Water/hazard | Flood risk, water availability | Public hazard maps |

Hard constraints: protected areas (Natura 2000), unsuitable land cover (CORINE), flood zones.

## Caveats
- Data is public and coarse; results are indicative, not engineering advice.
- Grid capacity headroom is not publicly available at node level, so proximity is only a proxy.
- Must state assumptions and weights in the UI.

## Open
- Which criteria make the v1 cut. Candidate-cell size.
