"""Spike S1: check that the ENTSO-E token works and Romanian solar/wind data comes back.

Usage: python -I scripts/spike_entsoe.py [YYYY-MM-DD]   (default: 3 days ago)
Reads ENTSOE_API_TOKEN from the environment or a local .env file. Stdlib only.
"""
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from datetime import date, timedelta
from pathlib import Path

BASE = "https://web-api.tp.entsoe.eu/api"
RO_ZONE = "10YRO-TEL------P"
PSR = {"B16": "Solar", "B19": "Wind onshore"}


def load_token() -> str:
    token = os.environ.get("ENTSOE_API_TOKEN", "")
    env = Path(__file__).resolve().parent.parent / ".env"
    if not token and env.exists():
        for line in env.read_text().splitlines():
            if line.startswith("ENTSOE_API_TOKEN="):
                token = line.split("=", 1)[1].strip()
    if not token:
        sys.exit("ENTSOE_API_TOKEN not set (env var or .env)")
    return token


def fetch(params: dict) -> ET.Element:
    url = BASE + "?" + urllib.parse.urlencode(params)
    try:
        with urllib.request.urlopen(url, timeout=60) as r:
            return ET.fromstring(r.read())
    except urllib.error.HTTPError as e:
        sys.exit(f"HTTP {e.code}: {e.read()[:300]!r}")


def points(root: ET.Element):
    for ts in root.iter():
        if ts.tag.endswith("TimeSeries"):
            res = [e.text for e in ts.iter() if e.tag.endswith("resolution")]
            vals = [float(e.text) for e in ts.iter() if e.tag.endswith("quantity")]
            yield res[0] if res else "?", vals


def main() -> None:
    token = load_token()
    day = date.fromisoformat(sys.argv[1]) if len(sys.argv) > 1 else date.today() - timedelta(days=3)
    start, end = day.strftime("%Y%m%d0000"), (day + timedelta(days=1)).strftime("%Y%m%d0000")
    for code, name in PSR.items():
        root = fetch({
            "securityToken": token, "documentType": "A75", "processType": "A16",
            "in_Domain": RO_ZONE, "psrType": code, "periodStart": start, "periodEnd": end,
        })
        series = list(points(root))
        if not series:
            print(f"{name}: no data returned for {day}")
            continue
        for res, vals in series:
            print(f"{name}: {len(vals)} points, resolution {res}, max {max(vals):.0f} MW, sum {sum(vals):.0f}")


if __name__ == "__main__":
    main()
