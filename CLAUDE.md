# CLAUDE.md

Project: Romania Solar + Wind Forecast Platform. See [README.md](README.md).

## Rules
- The docs in `docs/` are the source of truth. Read the relevant doc before implementing anything, and flag conflicts instead of silently deviating.
- When a decision changes, update the doc and add or amend an ADR in `docs/adr/` in the same change.
- Anything marked `to-verify` in `docs/02-data-sources.md` must be verified (and the doc updated) before code relies on it.
- Keep the architecture generic: behaviour is configured by `(country, energy_source, location set)`, and external sources sit behind adapter interfaces (see `docs/03-architecture-hld.md`, ADR-0003).
- Never train on observed weather as a stand-in for forecasts without documenting it (ADR-0004). Features must be point-in-time correct.
- UI language is English only. Free data and tools only, unless a doc says otherwise.
- Document every implementation step in `docs/10-implementation-log.md` (what, why, files, result).
- Do not commit secrets (e.g. the ENTSO-E token). Use environment variables and `.env.example`.

## Stack (planned)
Python (uv, ruff, pytest, mypy), LightGBM, MLflow, Dagster, DuckDB/Parquet, PostGIS, FastAPI, Next.js + MapLibre/deck.gl, Docker Compose, GitHub Actions.
