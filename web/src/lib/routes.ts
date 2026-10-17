/** App routes in navigation order. `story` maps each view to the talk's narrative. */
export interface RouteInfo {
  href: string;
  label: string;
  short: string;
  description: string;
  story: "Intro" | "Forecast" | "Explain" | "Act" | "AI footprint" | "Under the hood";
}

export const ROUTES: RouteInfo[] = [
  { href: "/", label: "Overview", short: "Overview", description: "Tomorrow at a glance and the story of the talk.", story: "Intro" },
  { href: "/forecast", label: "Forecast", short: "Forecast", description: "48-hour solar and wind forecast with p10–p90 uncertainty, actuals and baselines.", story: "Forecast" },
  { href: "/explain", label: "Explain", short: "Explain", description: "How each weather feature pushes the forecast up or down (exact Shapley values).", story: "Explain" },
  { href: "/what-if", label: "What-if", short: "What-if", description: "Change the weather and watch the forecast respond.", story: "Explain" },
  { href: "/pipeline", label: "Pipeline", short: "Pipeline", description: "How data flows from sources to features, models and outputs.", story: "Under the hood" },
  { href: "/map", label: "Energy map", short: "Map", description: "Plants, grid and the regional forecast on a map of Romania.", story: "Act" },
  { href: "/siting", label: "Siting", short: "Siting", description: "Where could an AI data centre fit Romania's green-energy system?", story: "AI footprint" },
  { href: "/market", label: "Market", short: "Market", description: "Production against day-ahead prices; negative-price hours.", story: "Act" },
];
