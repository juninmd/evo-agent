/**
 * Day key for published artifacts. The crons run in local time, so editions are
 * counted and labeled by the local day; a UTC key would shift the day boundary
 * at 21:00 BRT and let the end-of-day sweep double-publish across days.
 */
export function localDayIso(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}
