const TRACKING_PARAMS = new Set([
  "fbclid",
  "gclid",
  "igshid",
  "mc_cid",
  "mc_eid",
  "ref_src",
  "ref_url",
  "s_cid",
]);

function isTracking(key: string): boolean {
  return key.startsWith("utm_") || TRACKING_PARAMS.has(key);
}

/**
 * The URL readers will click: only tracking params go, on the raw string, so
 * nothing that decides where the link lands (www, slash, encoding) changes.
 */
export function stripTracking(raw: string): string {
  const hashAt = raw.indexOf("#");
  const hash = hashAt === -1 ? "" : raw.slice(hashAt);
  const beforeHash = hashAt === -1 ? raw : raw.slice(0, hashAt);
  const queryAt = beforeHash.indexOf("?");
  if (queryAt === -1) return raw;
  const kept = beforeHash
    .slice(queryAt + 1)
    .split("&")
    .filter((pair) => pair !== "" && !isTracking(pair.split("=")[0]));
  const query = kept.length > 0 ? `?${kept.join("&")}` : "";
  return `${beforeHash.slice(0, queryAt)}${query}${hash}`;
}

/**
 * Dedup key only, never displayed. The fragment stays: trending signals use it
 * as their per-day key (see trendingSignalUrl).
 */
export function canonicalUrl(raw: string): string {
  if (!URL.canParse(raw)) return raw;
  const url = new URL(raw);
  if (url.protocol !== "http:" && url.protocol !== "https:") return raw;
  url.hostname = url.hostname.replace(/^www\./, "");
  for (const key of [...url.searchParams.keys()]) {
    if (isTracking(key)) url.searchParams.delete(key);
  }
  url.searchParams.sort();
  if (url.pathname.length > 1) url.pathname = url.pathname.replace(/\/+$/, "");
  return url.toString();
}
