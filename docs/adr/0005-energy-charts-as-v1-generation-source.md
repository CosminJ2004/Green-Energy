# ADR-0005: Energy-Charts as the v1 generation source

Status: Accepted | Date: 2026-10-17

## Context
We need historical Romanian solar and wind generation now. ENTSO-E needs an API token that may take days. Energy-Charts (Fraunhofer ISE) returned Romanian data without a key in a live test, with history back to 2015 and 15-minute resolution in 2025.

## Decision
- Use Energy-Charts `public_power` (country `ro`) as the primary generation source for v1, behind the `GenerationSource` adapter (ADR-0003).
- Add an ENTSO-E adapter once the token exists, and compare the two series (spike S1). If they match, ENTSO-E becomes primary and Energy-Charts the fallback.
- Use Transelectrica only for validation and a live panel.
- Cache all responses locally. The limit is 2 requests/min per endpoint, so backfills must be throttled and resumable.
- Credit Energy-Charts.info in the UI.

## Consequences
- We can start immediately.
- Risks: unofficial source, possible upstream gaps, licence for generation data not confirmed, resolution changes over time (hourly to 15-minute) that the pipeline must normalise.
- Switching source later costs an adapter and a backfill, not a rewrite.
