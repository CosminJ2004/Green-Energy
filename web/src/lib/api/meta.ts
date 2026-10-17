/**
 * Static, shared metadata (labels, units, ranges) — part of the API contract,
 * safe to import anywhere. Not data: no numbers here pretend to be measurements.
 */

import type { EnergySource, ModelFeature, Provenance, WeatherVariableInfo, WhatIfVariable } from "./types";

export const SOURCE_META: Record<EnergySource, { label: string; noun: string; description: string }> = {
  solar: { label: "Solar", noun: "solar generation", description: "TSO-metered solar PV (most rooftop solar excluded)" },
  wind: { label: "Wind", noun: "wind generation", description: "Onshore wind, mostly in Dobrogea" },
};

export const WEATHER_VARIABLES: WeatherVariableInfo[] = [
  { key: "shortwave_radiation", label: "Shortwave radiation (GHI)", unit: "W/m²", min: 0, max: 1000, description: "All sunlight reaching a horizontal surface.", used_by: ["solar"] },
  { key: "direct_radiation", label: "Direct radiation", unit: "W/m²", min: 0, max: 900, description: "Beam sunlight (horizontal plane).", used_by: ["solar"] },
  { key: "diffuse_radiation", label: "Diffuse radiation", unit: "W/m²", min: 0, max: 500, description: "Scattered sky light.", used_by: ["solar"] },
  { key: "clear_sky_radiation", label: "Clear-sky radiation", unit: "W/m²", min: 0, max: 1000, description: "GHI if there were no clouds.", used_by: ["solar"] },
  { key: "cloud_cover_total", label: "Cloud cover (total)", unit: "%", min: 0, max: 100, description: "Share of sky covered by cloud.", used_by: ["solar"] },
  { key: "cloud_cover_low", label: "Cloud cover (low)", unit: "%", min: 0, max: 100, description: "Low cloud and fog.", used_by: ["solar"] },
  { key: "cloud_cover_mid", label: "Cloud cover (mid)", unit: "%", min: 0, max: 100, description: "Mid-level cloud.", used_by: ["solar"] },
  { key: "cloud_cover_high", label: "Cloud cover (high)", unit: "%", min: 0, max: 100, description: "High, thin cloud.", used_by: ["solar"] },
  { key: "temperature_2m", label: "Temperature (2 m)", unit: "°C", min: -20, max: 40, description: "Air temperature.", used_by: ["solar", "wind"] },
  { key: "wind_speed_10m", label: "Wind speed (10 m)", unit: "m/s", min: 0, max: 25, description: "Surface wind.", used_by: ["wind"] },
  { key: "wind_speed_100m", label: "Wind speed (100 m)", unit: "m/s", min: 0, max: 30, description: "Hub-height wind.", used_by: ["wind"] },
  { key: "wind_direction_100m", label: "Wind direction (100 m)", unit: "°", min: 0, max: 360, description: "Direction the wind blows from (0 = north).", used_by: ["wind"] },
  { key: "relative_humidity_2m", label: "Relative humidity", unit: "%", min: 0, max: 100, description: "Moisture in the air.", used_by: ["wind"] },
  { key: "snow_depth", label: "Snow depth", unit: "cm", min: 0, max: 50, description: "Snow on the ground (and panels).", used_by: ["solar"] },
  { key: "solar_elevation", label: "Sun elevation", unit: "°", min: -90, max: 90, description: "Angle of the sun above the horizon.", used_by: ["solar"] },
  { key: "icing_risk", label: "Icing risk", unit: "0–1", min: 0, max: 1, description: "Near-freezing, saturated air.", used_by: ["wind"] },
  { key: "air_density", label: "Air density", unit: "kg/m³", min: 1.1, max: 1.4, description: "Denser air carries more wind power.", used_by: ["wind"] },
];

export const WEATHER_VARIABLE_BY_KEY = Object.fromEntries(WEATHER_VARIABLES.map((v) => [v.key, v])) as Record<WeatherVariableInfo["key"], WeatherVariableInfo>;

/** Plain-language one-liners for each model feature (Explain view). */
export const FEATURE_EXPLAINERS: Record<ModelFeature, string> = {
  shortwave_radiation: "More sunlight on the ground means more power.",
  cloud_cover_total: "Cloud turns direct sun into diffuse light, which tilted panels capture less well.",
  temperature_2m: "Solar: hot cells lose ~0.4% per °C above 25 °C. Wind: cold air is denser and carries more power.",
  snow_depth: "Snow on panels blocks light until it slides off or melts.",
  solar_elevation: "The hour of day: a low sun gives little power, a high sun a lot.",
  curtailment_flag: "When day-ahead prices go negative at midday, some solar output is curtailed.",
  wind_speed_100m: "Power rises roughly with the cube of wind speed, up to the rated speed (~12 m/s).",
  wind_direction_100m: "Off-axis winds cause more wake losses between turbines.",
  icing_risk: "Ice on blades reduces output in near-freezing, saturated air.",
};

/** Ranges for the What-if sliders. `mode` matches WhatIfOverride.mode. */
export const WHATIF_CONTROLS: Record<WhatIfVariable, { label: string; unit: string; mode: "set" | "add" | "scale"; min: number; max: number; step: number; neutral: number; help: string }> = {
  cloud_cover_total: { label: "Cloud cover (all hours)", unit: "%", mode: "set", min: 0, max: 100, step: 5, neutral: -1, help: "Sets total cloud cover for every hour; irradiance follows (Kasten-Czeplak)." },
  temperature_2m: { label: "Temperature change", unit: "°C", mode: "add", min: -10, max: 10, step: 0.5, neutral: 0, help: "Adds an offset to every hour." },
  wind_speed_100m: { label: "Wind speed multiplier", unit: "×", mode: "scale", min: 0.5, max: 1.5, step: 0.05, neutral: 1, help: "Scales hub-height wind speed." },
  shortwave_radiation: { label: "Irradiance multiplier", unit: "×", mode: "scale", min: 0.3, max: 1.3, step: 0.05, neutral: 1, help: "Scales GHI (capped at clear-sky)." },
};

export const PROVENANCE_LABEL: Record<Provenance, string> = {
  synthetic: "Synthetic demo data",
  real: "Real data: Energy-Charts.info (CC BY 4.0)",
};
