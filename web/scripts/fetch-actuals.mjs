#!/usr/bin/env node
/**
 * Fetch the last 14 days of Romanian public power (solar, wind, load) from
 * Energy-Charts.info and write web/public/data/actuals-ro.json, aggregated to
 * hourly UTC means (MW).
 *
 *   npm run data:actuals            # last 14 full days up to today
 *   node scripts/fetch-actuals.mjs --days 7
 *
 * One request only (API limit: 2 requests/minute per endpoint). Node >= 18, no dependencies.
 * Licence: Energy-Charts data is CC BY 4.0 — attribution "Energy-Charts.info (Fraunhofer ISE)".
 */

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(HERE, "..", "public", "data", "actuals-ro.json");

const argDays = (() => {
  const i = process.argv.indexOf("--days");
  const n = i >= 0 ? Number(process.argv[i + 1]) : 14;
  return Number.isFinite(n) && n > 0 && n <= 60 ? Math.floor(n) : 14;
})();

const ymd = (d) => d.toISOString().slice(0, 10);
const end = new Date();
const start = new Date(end.getTime() - argDays * 86_400_000);
const url = `https://api.energy-charts.info/public_power?country=ro&start=${ymd(start)}&end=${ymd(end)}`;

/** Map Energy-Charts production type names to our series. */
function classify(name) {
  const n = String(name).toLowerCase();
  if (n === "solar" || n.startsWith("solar")) return "solar";
  if (n.startsWith("wind onshore") || n.startsWith("wind offshore") || n === "wind") return "wind";
  if (n === "load" || n.startsWith("load (")) return "load";
  return null;
}

function toHourly(unixSeconds, values) {
  const buckets = new Map();
  for (let i = 0; i < unixSeconds.length; i++) {
    const v = values[i];
    if (v === null || v === undefined || !Number.isFinite(v)) continue;
    const hour = Math.floor(unixSeconds[i] / 3600) * 3600;
    const b = buckets.get(hour) ?? { sum: 0, n: 0 };
    b.sum += v;
    b.n += 1;
    buckets.set(hour, b);
  }
  return [...buckets.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([h, b]) => ({ time: new Date(h * 1000).toISOString().replace(".000Z", "Z"), mw: Math.round((b.sum / b.n) * 10) / 10 }));
}

function sumSeries(list) {
  const acc = new Map();
  for (const s of list) for (const p of s) acc.set(p.time, (acc.get(p.time) ?? 0) + p.mw);
  return [...acc.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([time, mw]) => ({ time, mw: Math.round(mw * 10) / 10 }));
}

async function main() {
  console.log(`GET ${url}`);
  const res = await fetch(url, { headers: { Accept: "application/json", "User-Agent": "green-energy-ro-demo/0.1" } });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Energy-Charts returned HTTP ${res.status}${res.status === 429 ? " (rate limit: wait a minute and retry)" : ""}: ${body.slice(0, 300)}`);
  }
  const json = await res.json();
  const ts = json.unix_seconds;
  const types = json.production_types;
  if (!Array.isArray(ts) || !Array.isArray(types)) throw new Error("Unexpected response shape: missing unix_seconds or production_types");

  const resolution = ts.length > 1 ? Math.round((ts[1] - ts[0]) / 60) : 60;
  const groups = { solar: [], wind: [], load: [] };
  const seen = [];
  for (const t of types) {
    seen.push(t.name);
    const key = classify(t.name);
    if (key && Array.isArray(t.data)) groups[key].push(toHourly(ts, t.data));
  }
  const series = { solar: sumSeries(groups.solar), wind: sumSeries(groups.wind), load: sumSeries(groups.load) };
  for (const k of Object.keys(series)) {
    if (series[k].length === 0) console.warn(`Warning: no "${k}" series found. Production types seen: ${seen.join(", ")}`);
  }

  const out = {
    source: "Energy-Charts.info (Fraunhofer ISE), public_power, country=ro",
    license: "CC BY 4.0",
    url,
    fetched_at: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
    resolution_minutes: 60,
    source_resolution_minutes: resolution,
    note: "Hourly UTC means of public net generation (TSO-metered; most rooftop solar not included) and load, MW.",
    series,
  };
  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(OUT, JSON.stringify(out));
  console.log(`Wrote ${OUT}: solar ${series.solar.length} h, wind ${series.wind.length} h, load ${series.load.length} h (source resolution ${resolution} min).`);
}

main().catch((e) => {
  console.error(String(e?.message ?? e));
  process.exit(1);
});
