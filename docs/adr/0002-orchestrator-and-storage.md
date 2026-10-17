# ADR-0002: Orchestrator and storage

Status: Proposed | Date: 2026-10-17

## Context
We need scheduled, backfillable pipelines with data-quality checks, free infrastructure, and map/geospatial serving.

## Decision (proposed)
- Orchestration: Dagster (asset-based, partitions, backfills, built-in checks). Alternatives: Prefect, plain scripts for the first spike.
- Raw and feature data: Parquet files, queried with DuckDB. Local first, S3-compatible later.
- Serving and geo data: Postgres with PostGIS.
- Experiment tracking and registry: MLflow.

## Consequences
No heavy infrastructure for v1, easy local runs, a clear path to cloud storage. Dagster adds learning overhead; revisit if it slows delivery.
