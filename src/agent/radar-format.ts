/** Markdown cell helpers shared by the radar tables and its highlight sections. */
const ROW_SUMMARY_MAX = 140;

/** Trending signals are stored as `<repo>#trending-daily-<day>`. */
export function displayUrl(url: string): string {
  return url.split("#")[0];
}

export function cell(value: string): string {
  // Titles come from external feeds; escaping brackets stops them from injecting links.
  return value
    .replace(/[|[\]`]/g, "\\$&")
    .replace(/\s+/g, " ")
    .trim();
}

const REDDIT_POST_PREFIX =
  /^Post da comunidade em r\/\S+ sobre ".*?"\. Relato do autor, sem os comentarios da discussao\.\s*/;

export function cleanSummary(summary: string): string {
  return summary.replace(REDDIT_POST_PREFIX, "").trim();
}

export function rowSummary(summary: string): string {
  const text = cell(cleanSummary(summary));
  if (text.length <= ROW_SUMMARY_MAX) return text || "-";
  const cut = text.slice(0, ROW_SUMMARY_MAX);
  const space = cut.lastIndexOf(" ");
  return `${(space > 0 ? cut.slice(0, space) : cut).trimEnd()}…`;
}
