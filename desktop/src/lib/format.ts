export const LOCALE = "pt-BR";

/** SQLite grava UTC sem marcador de fuso; `new Date` precisa dele. */
export function parseTimestamp(value: string | null | undefined): Date | null {
  if (!value) return null;
  const normalized = value.includes("T")
    ? value
    : `${value.replace(" ", "T")}Z`;
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatDateTime(value: string | null | undefined): string {
  const date = parseTimestamp(value);
  if (!date) return "—";
  return new Intl.DateTimeFormat(LOCALE, {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatFullDateTime(value: string | null | undefined): string {
  const date = parseTimestamp(value);
  if (!date) return "—";
  return new Intl.DateTimeFormat(LOCALE, {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

export function formatRelative(
  value: string | null | undefined,
  now = Date.now(),
): string {
  const date = parseTimestamp(value);
  if (!date) return "—";
  const seconds = Math.round((date.getTime() - now) / 1000);
  const magnitude = Math.abs(seconds);
  const relative = new Intl.RelativeTimeFormat(LOCALE, { numeric: "auto" });
  if (magnitude < 60) return relative.format(seconds, "second");
  if (magnitude < 3600)
    return relative.format(Math.round(seconds / 60), "minute");
  if (magnitude < 86_400)
    return relative.format(Math.round(seconds / 3600), "hour");
  return relative.format(Math.round(seconds / 86_400), "day");
}

export function formatDuration(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined) return "—";
  if (seconds < 60) return `${seconds} s`;
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  if (minutes < 60)
    return rest > 0 ? `${minutes} min ${rest} s` : `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  return `${hours} h ${minutes % 60} min`;
}

export function formatNumber(value: number, digits = 1): string {
  return new Intl.NumberFormat(LOCALE, {
    maximumFractionDigits: digits,
  }).format(value);
}

export function formatPercent(value: number): string {
  return new Intl.NumberFormat(LOCALE, {
    style: "percent",
    maximumFractionDigits: 0,
  }).format(value);
}

/** Host da API, sem o esquema, para o cabecalho. */
export function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

/** `editorial_metrics` chega como JSON livre: so numeros viram numero. */
export function metricNumber(
  metrics: Record<string, unknown> | null | undefined,
  key: string,
): number | null {
  const value = metrics?.[key];
  return typeof value === "number" ? value : null;
}

export function formatCount(value: number | null): string {
  return value === null ? "—" : formatNumber(value, 0);
}
