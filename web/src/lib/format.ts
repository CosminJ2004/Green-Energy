/** Number formatting for display (en-GB grouping, thin and readable at distance). */

const nf = (digits: number) => new Intl.NumberFormat("en-GB", { maximumFractionDigits: digits, minimumFractionDigits: digits });
const cache = new Map<number, Intl.NumberFormat>();
function fmt(digits: number) {
  let f = cache.get(digits);
  if (!f) {
    f = nf(digits);
    cache.set(digits, f);
  }
  return f;
}

/** 1234.5 → "1,235" (digits = 0). Non-finite → "–". */
export function formatNumber(v: number | null | undefined, digits = 0): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return "–";
  return fmt(digits).format(v);
}

/** 1234.5 → "1,235 MW" */
export function formatMW(v: number | null | undefined, digits = 0): string {
  return `${formatNumber(v, digits)} MW`;
}

/** MWh → "12.3 GWh" when large. */
export function formatEnergy(mwh: number | null | undefined): string {
  if (mwh === null || mwh === undefined || !Number.isFinite(mwh)) return "–";
  return Math.abs(mwh) >= 1000 ? `${formatNumber(mwh / 1000, 1)} GWh` : `${formatNumber(mwh, 0)} MWh`;
}

/** 0.234 → "23%" (ratio input). */
export function formatPct(ratio: number | null | undefined, digits = 0): string {
  if (ratio === null || ratio === undefined || !Number.isFinite(ratio)) return "–";
  return `${formatNumber(ratio * 100, digits)}%`;
}

/** 85.2 → "85.20 EUR/MWh" */
export function formatPrice(v: number | null | undefined, digits = 2): string {
  return `${formatNumber(v, digits)} EUR/MWh`;
}

/** +12 / −12 with a real minus sign. */
export function formatSigned(v: number | null | undefined, digits = 0, unit = ""): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return "–";
  const s = formatNumber(Math.abs(v), digits);
  const sign = v > 0 ? "+" : v < 0 ? "−" : "±";
  return `${sign}${s}${unit ? ` ${unit}` : ""}`;
}
