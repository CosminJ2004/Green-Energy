/**
 * Time helpers. Rule: timestamps are ISO 8601 UTC strings everywhere in data
 * ("2026-10-18T21:00:00Z"); they are only converted to Europe/Bucharest local
 * time for display. A "date key" is a local calendar date "YYYY-MM-DD".
 */

export const TIME_ZONE = "Europe/Bucharest";
export const HOUR_MS = 3_600_000;
export const DAY_MS = 86_400_000;

const partsFmt = new Intl.DateTimeFormat("en-GB", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  weekday: "short",
  hourCycle: "h23",
});

export interface LocalParts {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number; // 0-23
  minute: number;
  /** 0 = Sunday … 6 = Saturday */
  weekday: number;
}

const WEEKDAYS: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

function toDate(t: string | number | Date): Date {
  return t instanceof Date ? t : new Date(t);
}

/** Calendar parts in Bucharest local time. */
export function localParts(t: string | number | Date): LocalParts {
  const out: Record<string, string> = {};
  for (const p of partsFmt.formatToParts(toDate(t))) out[p.type] = p.value;
  return {
    year: Number(out.year),
    month: Number(out.month),
    day: Number(out.day),
    hour: Number(out.hour) % 24,
    minute: Number(out.minute),
    weekday: WEEKDAYS[out.weekday] ?? 0,
  };
}

/** Offset of Bucharest local time from UTC in minutes (120 in winter / EET, 180 in summer / EEST). */
export function tzOffsetMinutes(t: string | number | Date): number {
  const d = toDate(t);
  const p = localParts(d);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
  const actual = Math.floor(d.getTime() / 60000) * 60000;
  return Math.round((asUtc - actual) / 60000);
}

/** "EET" or "EEST". */
export function tzAbbrev(t: string | number | Date): "EET" | "EEST" {
  return tzOffsetMinutes(t) >= 180 ? "EEST" : "EET";
}

/** "Bucharest time (EEST, UTC+3)" — show next to every time axis. */
export function tzLabel(t: string | number | Date = Date.now()): string {
  const off = tzOffsetMinutes(t) / 60;
  return `Bucharest time (${tzAbbrev(t)}, UTC+${off})`;
}

/** Local date key "YYYY-MM-DD" (Bucharest) of an instant. */
export function localDateKey(t: string | number | Date): string {
  const p = localParts(t);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

/** Today's date key in Bucharest. */
export function todayLocal(now: number = Date.now()): string {
  return localDateKey(now);
}

export function isDateKey(s: string | null | undefined): s is string {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

/** Add n calendar days to a date key. */
export function addDays(dateKey: string, n: number): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}

/** UTC instant (ms) of local midnight 00:00 at the start of the given date key. */
export function localMidnightUtcMs(dateKey: string): number {
  const [y, m, d] = dateKey.split("-").map(Number);
  // Guess with the winter offset, then correct with the real offset at that instant.
  let guess = Date.UTC(y, m - 1, d) - 120 * 60000;
  for (let i = 0; i < 2; i++) {
    const p = localParts(guess);
    const shownMs = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
    guess -= shownMs - Date.UTC(y, m - 1, d);
  }
  return guess;
}

/** ISO UTC string for an instant, without milliseconds: "2026-10-18T21:00:00Z". */
export function toIso(t: number | Date): string {
  return toDate(t).toISOString().replace(".000Z", "Z");
}

/** Floor an instant to the whole UTC hour. */
export function floorHourMs(t: number): number {
  return Math.floor(t / HOUR_MS) * HOUR_MS;
}

/**
 * Forecast window for issue date D: D+1 00:00 → D+3 00:00 local (half-open),
 * i.e. 48 hourly points (47 or 49 on DST-change days).
 */
export function forecastWindow(issueDate: string): { from: string; to: string } {
  return {
    from: toIso(localMidnightUtcMs(addDays(issueDate, 1))),
    to: toIso(localMidnightUtcMs(addDays(issueDate, 3))),
  };
}

/** Local-day window [00:00, next 00:00) for a date key, as ISO UTC. */
export function dayWindow(dateKey: string, days = 1): { from: string; to: string } {
  return {
    from: toIso(localMidnightUtcMs(dateKey)),
    to: toIso(localMidnightUtcMs(addDays(dateKey, days))),
  };
}

/** Hour starts in [from, to) as ISO UTC strings. */
export function hourlyRange(from: string, to: string): string[] {
  const out: string[] = [];
  const end = new Date(to).getTime();
  for (let t = floorHourMs(new Date(from).getTime()); t < end; t += HOUR_MS) out.push(toIso(t));
  return out;
}

/** Issue date that produced a forecast for this instant at the given lead (1 = day-ahead). */
export function issueDateFor(t: string | number, leadDays = 1): string {
  return addDays(localDateKey(t), -leadDays);
}

// ---------------------------------------------------------------------------
// Display formatting (always Bucharest time)
// ---------------------------------------------------------------------------

const timeFmt = new Intl.DateTimeFormat("en-GB", { timeZone: TIME_ZONE, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const dateFmt = new Intl.DateTimeFormat("en-GB", { timeZone: TIME_ZONE, weekday: "short", day: "numeric", month: "short" });
const longDateFmt = new Intl.DateTimeFormat("en-GB", { timeZone: TIME_ZONE, weekday: "long", day: "numeric", month: "long", year: "numeric" });

/** "14:00" */
export function formatLocalTime(t: string | number | Date): string {
  return timeFmt.format(toDate(t));
}
/** "Sat 18 Oct" */
export function formatLocalDate(t: string | number | Date): string {
  return dateFmt.format(toDate(t));
}
/** "Sat 18 Oct, 14:00" */
export function formatLocalDateTime(t: string | number | Date): string {
  return `${formatLocalDate(t)}, ${formatLocalTime(t)}`;
}
/** "Saturday, 18 October 2026" */
export function formatLongDate(t: string | number | Date): string {
  return longDateFmt.format(toDate(t));
}
/** Format a date key ("2026-10-18") as "Sun 18 Oct" (noon local, DST-safe). */
export function formatDateKey(dateKey: string, long = false): string {
  const ms = localMidnightUtcMs(dateKey) + 12 * HOUR_MS;
  return long ? formatLongDate(ms) : formatLocalDate(ms);
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}
