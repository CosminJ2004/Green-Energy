"""Spike S0: pull Romanian solar and wind from Energy-Charts and check data quality.

Usage: python -I scripts/spike_energy_charts.py [START_YEAR]   (default 2022)
Fetches quarter by quarter (API limit: 2 requests/min), caches raw JSON under
data/raw/energy_charts/, then prints a quality report. Stdlib only; re-runnable.
"""
import json
import sys
import time
import urllib.error
import urllib.request
from collections import Counter
from datetime import date, datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CACHE = ROOT / "data" / "raw" / "energy_charts"
URL = "https://api.energy-charts.info/public_power?country=ro&start={s}&end={e}"
WANTED = {"Solar": "solar", "Wind onshore": "wind"}
MIN_INTERVAL = 31  # seconds between requests


def quarters(start_year: int):
    today = date.today()
    for y in range(start_year, today.year + 1):
        for q in range(4):
            s = date(y, 3 * q + 1, 1)
            if s > today:
                return
            e = date(y + (q == 3), 1 if q == 3 else 3 * q + 4, 1)
            yield s, min(e, today)


def fetch(s: date, e: date) -> dict:
    path = CACHE / f"{s}_{e}.json"
    if path.exists():
        return json.loads(path.read_text())
    url = URL.format(s=s, e=e)
    for attempt in range(5):
        try:
            with urllib.request.urlopen(url, timeout=120) as r:
                body = r.read()
            path.write_bytes(body)
            time.sleep(MIN_INTERVAL)
            return json.loads(body)
        except urllib.error.HTTPError as err:
            wait = int(err.headers.get("Retry-After", 60)) + 5
            print(f"  HTTP {err.code} for {s}, waiting {wait}s", flush=True)
            time.sleep(wait)
    sys.exit(f"giving up on {s}..{e}")


def main() -> None:
    CACHE.mkdir(parents=True, exist_ok=True)
    start_year = int(sys.argv[1]) if len(sys.argv) > 1 else 2022
    series = {k: {} for k in WANTED}  # name -> {unix_seconds: value}
    for s, e in quarters(start_year):
        print(f"fetching {s}..{e}", flush=True)
        d = fetch(s, e)
        ts = d["unix_seconds"]
        for p in d["production_types"]:
            if p["name"] in WANTED:
                for t, v in zip(ts, p["data"]):
                    series[p["name"]][t] = v

    for name, pts in series.items():
        times = sorted(pts)
        vals = [pts[t] for t in times]
        nulls = sum(v is None for v in vals)
        nums = [v for v in vals if v is not None]
        steps = Counter(b - a for a, b in zip(times, times[1:]))
        print(f"\n== {name} ==")
        print(f"range: {datetime.fromtimestamp(times[0], timezone.utc)} -> {datetime.fromtimestamp(times[-1], timezone.utc)}")
        print(f"points: {len(times)}, nulls: {nulls}, negatives: {sum(v < 0 for v in nums)}")
        print(f"step sizes (seconds: count): {dict(steps.most_common(5))}")
        print(f"max {max(nums):.0f} MW, mean {sum(nums)/len(nums):.0f} MW")
        # resolution switch per year
        by_year = {}
        for a, b in zip(times, times[1:]):
            y = datetime.fromtimestamp(a, timezone.utc).year
            by_year.setdefault(y, Counter())[b - a] += 1
        for y, c in sorted(by_year.items()):
            print(f"  {y}: {dict(c.most_common(2))}")
        # large gaps
        gaps = [(a, b) for a, b in zip(times, times[1:]) if b - a > 3 * 3600]
        print(f"gaps > 3h: {len(gaps)}")
        for a, b in gaps[:5]:
            print(f"  {datetime.fromtimestamp(a, timezone.utc)} -> {datetime.fromtimestamp(b, timezone.utc)}")
        if name == "Solar":
            night = [pts[t] for t in times if pts[t] is not None and datetime.fromtimestamp(t, timezone.utc).hour in (0, 1, 2, 22, 23)]
            print(f"solar at night UTC 22-02: max {max(night):.0f} MW (should be ~0)")
        # per-year peak, shows capacity growth
        peak = {}
        for t in times:
            if pts[t] is not None:
                y = datetime.fromtimestamp(t, timezone.utc).year
                peak[y] = max(peak.get(y, 0), pts[t])
        print("yearly peak MW:", {y: round(v) for y, v in sorted(peak.items())})


if __name__ == "__main__":
    main()
