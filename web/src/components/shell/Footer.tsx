import { FlaskConical } from "lucide-react";
import { API_MODE } from "@/lib/api/client";

const ATTRIBUTIONS: { name: string; license: string; url: string; what: string }[] = [
  { name: "Open-Meteo", license: "CC BY 4.0", url: "https://open-meteo.com", what: "Weather forecasts" },
  { name: "Energy-Charts.info (Fraunhofer ISE)", license: "CC BY 4.0", url: "https://www.energy-charts.info", what: "Romanian generation and load" },
  { name: "ENTSO-E Transparency Platform", license: "ENTSO-E terms", url: "https://transparency.entsoe.eu", what: "Generation and prices (planned)" },
  { name: "OpenStreetMap contributors", license: "ODbL", url: "https://www.openstreetmap.org/copyright", what: "Infrastructure (planned)" },
];

export function Footer() {
  return (
    <footer className="mt-12 border-t border-border bg-surface">
      <div className="mx-auto grid max-w-[1440px] gap-6 px-4 py-8 text-sm text-fg-muted sm:px-6 md:grid-cols-[1.2fr_1fr] lg:px-8">
        <div>
          <p className="flex items-center gap-2 text-base font-semibold text-synthetic">
            <FlaskConical className="size-5" aria-hidden />
            Synthetic demo data
          </p>
          <p className="mt-1 max-w-xl">
            Unless a chart is labelled <span className="font-semibold text-real">Real data</span>, its numbers come from a transparent synthetic model of Romania&apos;s weather, solar and wind
            fleet, built for this prototype. Synthetic numbers are never real measurements. Times are shown in Bucharest time; data is stored in UTC.
          </p>
          <p className="mt-2 text-fg-subtle">
            Backend: {API_MODE === "live" ? "live API" : "in-browser mock"} · Map assets are approximate and illustrative · Not trading or engineering advice.
          </p>
        </div>
        <div>
          <p className="text-base font-semibold text-fg">Data sources and attribution</p>
          <ul className="mt-1 space-y-1">
            {ATTRIBUTIONS.map((a) => (
              <li key={a.name}>
                <a href={a.url} target="_blank" rel="noreferrer" className="font-medium text-fg underline decoration-border-strong underline-offset-2 hover:decoration-fg">
                  {a.name}
                </a>{" "}
                <span className="text-fg-subtle">
                  ({a.license}) · {a.what}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
