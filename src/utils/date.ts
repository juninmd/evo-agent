import { config } from "../config.js";

/**
 * Day key for published artifacts. The crons run on config.timezone, so the
 * key has to be computed in that same zone; deriving it from the process's
 * ambient TZ made a host without TZ set key editions by the UTC day and
 * publish the daily budget twice around the local day boundary.
 */
export function localDayIso(
  now = new Date(),
  timeZone = config.timezone,
): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** Calendar arithmetic on YYYY-MM-DD keys; UTC avoids a DST hour shifting the day. */
export function addDays(day: string, delta: number): string {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + delta);
  return date.toISOString().slice(0, 10);
}
