# ADR-0003: Generic configuration and source adapters

Status: Accepted | Date: 2026-10-17

## Context
The product should extend from Romanian solar to wind and to other countries without rewriting pipelines.

## Decision
- Behaviour is configured by `(country/region, energy_source, location set)`.
- External systems are accessed through interfaces: `GenerationSource`, `WeatherSource`, `PriceSource`, `InfrastructureSource`.
- Adapters normalise to common schemas: UTC timestamps, MW, standard variable names, explicit units.
- Feature sets and model settings are config per energy source.

## Consequences
Extra up-front abstraction, kept thin and driven by two real cases (solar and wind) to avoid speculative design. New countries need an adapter and config, not new pipeline code.
