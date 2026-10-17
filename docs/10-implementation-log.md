# 10 Implementation Log

Status: Living | Updated: 2026-10-17

A chronological record of what was built, how, and why. Newest entries at the bottom. Each entry links to the decision (ADR) or doc it implements.

---

## Step 1: Planning docs (2026-10-17)
- **What:** created the documentation set: `README.md`, `CLAUDE.md`, `docs/00` to `docs/09`, ADR-0001 to ADR-0004.
- **Why:** a single source of truth before writing code (ADR-0001).
- **Key decisions:** Romania national hourly day-ahead forecast; solar and wind; production-grade, generic pipeline (ADR-0003); train on archived forecasts (ADR-0004); English UI; free data only.

## Step 2: Data source selection (2026-10-17)
- **What:** chose Energy-Charts (Fraunhofer ISE) as the v1 generation source (ADR-0005). ENTSO-E needs an API token, which is pending on the existing account.
- **Evidence:** live test calls to `api.energy-charts.info/public_power?country=ro` returned Solar and Wind onshore series without a key. Resolution is hourly in 2015, 2018 and 2021, and 15-minute in 2025.
- **Files:** `.gitignore`, `.env.example`, `scripts/spike_entsoe.py` (ready to run once a token exists).

## Step 3: Spike S0, Energy-Charts backfill (2026-10-17, running)
- **What:** `scripts/spike_energy_charts.py` pulls Romanian solar and wind from 2022 to today, one quarter per request. It throttles to the 2 requests/min limit and caches raw JSON in `data/raw/energy_charts/` (git-ignored). It then prints a quality report: gaps, nulls, resolution by year, night-time solar check, yearly peaks.
- **Run:** `python -I scripts/spike_energy_charts.py 2022`
- **Result (completed 2026-10-17):** Energy-Charts is usable as the v1 training target.
  | Check | Solar | Wind onshore |
  |---|---|---|
  | Range | 2022-01-01 to 2026-10-17 (UTC) | same |
  | Points | 168,060 | 168,060 |
  | Resolution | 15-minute throughout (no hourly segments from 2022) | same |
  | Nulls | 27 | 26 |
  | Gaps > 3h | 0 | 0 |
  | Negatives | 0 | 0 |
  | Yearly peak (MW) | 2022: 836, 2023: 905, 2024: 1,265, 2025: 1,845, 2026: 3,395 | 2022 to 2026: about 2,700 to 2,900 |
  - **Finding 1, solar capacity grew about 4x in 4 years.** The model must normalise by installed capacity (capacity factor), or it will badly under-predict recent periods. Installed-capacity history becomes a must-have input.
  - **Finding 2, night-time solar up to 46 MW** at 00:00 to 02:00 UTC. That is small, but physically suspect. Check whether it is a few spikes or a metering offset, and clip or flag it in ingestion.
  - **Finding 3, the earlier test showed hourly data in 2015 to 2021.** Pre-2022 history is hourly, so a longer training set needs resampling. 2022 onwards is enough for v1.
  - Raw cache: `data/raw/energy_charts/*.json` (19 quarterly files).

## Step 4: Web app scaffold (2026-10-17)
- **What:** `web/` created with `create-next-app@15` (Next.js 15.5, App Router, TypeScript, Tailwind v4, ESLint, Turbopack).
- **Dependencies added:** `recharts` (charts), `maplibre-gl` + `react-map-gl` (maps, no API key needed), `lucide-react` (icons), `clsx`.
- **Why:** this matches the planned stack in `docs/03-architecture-hld.md` and `docs/06-ui-design.md`.

## Step 5: UI prototype with mock data (2026-10-17, in progress)
- **What:** a multi-agent build of the full UI prototype with synthetic demo data.
  1. **Foundation:** design tokens (light/dark, projector-friendly), app shell, shared UI components, and a typed API client mirroring `docs/05-api-design.md`. The mock backend has seeded weather, a transparent stand-in model, exact Shapley explanations, prices, grid assets, siting scores and a pipeline graph.
  2. **Views (parallel):** Overview, Forecast, Explain, What-if, Pipeline, Energy map, Siting, Market.
  3. **Integration:** build, lint, smoke-test every route; fetch real recent actuals from Energy-Charts (`npm run data:actuals`).
  4. **Review:** three lenses (UX/design, data and model correctness, completeness against docs), then fixes and re-verification.
- **Why mock data:** the real model doesn't exist yet. A small transparent stand-in model keeps explanations and what-ifs exactly consistent with each other. It is replaced by the LightGBM model later with no UI change, because views only use the API client.
- **Honesty rule:** synthetic numbers are always labelled "Synthetic demo data"; real Energy-Charts data is labelled with its source and licence.
- **Result:** _pending._

## Step 6: Modelling research (2026-10-17, in progress)
- **What:** a research workflow producing `docs/11-modeling-research.md`, covering state-of-the-art methods, competition evidence, a recommended model ladder, and the full pipeline with Mermaid diagrams.
- **How:** six parallel researchers, each required to cite sources and rate evidence strength. Angles: gradient-boosted trees; deep sequence models including Res-TCN-BiLSTM; Transformers and foundation models; Kaggle/competition winners (GEFCom, AMS Kaggle, Enefit, HEFTCom2024); probabilistic and physics-hybrid methods; production MLOps. One agent then writes the doc, two reviewers fact-check it (claims and citations; fit, ML correctness and diagram syntax), and a final pass applies the corrections.
- **Inputs used:** the S0 findings (capacity growth, 15-min data from 2022) and ADR-0004 (train on archived NWP forecasts).
- **Result:** _pending._
