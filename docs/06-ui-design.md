# 06 UI Design

Status: Draft | Updated: 2026-10-17

Next.js, English only. Charts: a library such as ECharts or Recharts. Maps: MapLibre GL + deck.gl. Must read well on a projector (high contrast, large type). Attribute data sources (Open-Meteo CC BY 4.0, ENTSO-E, OSM) in a footer.

## Views
### 1. Forecast
24-48h solar and wind curves with p10-p90 band, actuals overlay, baseline toggle, model version and issue time. Optional day-ahead price line.

### 2. Explain
Pick an hour: SHAP waterfall showing how cloud cover, irradiance, temperature, wind speed and so on push the forecast up or down. A stacked feature-contribution timeline for the whole day.

### 3. What-if
Sliders (cloud cover, temperature, wind speed, radiation) over a chosen day. Output curve updates live, with the delta against the baseline forecast. Note shown: inputs are correlated, so results are illustrative.

### 4. Energy map
Romania map: solar and wind plants, substations, transmission lines, weather grid, regional forecast heat. Layer toggles, hover details, time scrubber.

### 5. Siting assistant
Criteria sliders (grid proximity, renewable share and variability, cooling climate, land constraints). Ranked candidate areas on the map with a score breakdown. See [07](07-siting-assistant.md).

### 6. Market overlay
Production against day-ahead price, negative-price hours highlighted, solar share against price scatter. Descriptive only in v1.

## Layout
Top navigation between views; shared controls for region, source (solar/wind) and date. A "live demo mode" with a preset story path for the talk is a stretch idea.

## Open
- Wireframes to be drawn once the view list is agreed.
- Chart and map library final choice.
