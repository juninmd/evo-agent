/**
 * Images are derived from ids the crawler already validated, never scraped
 * from article pages: no extra fetch, no SSRF surface, and a fixed host list.
 */
const SEGMENT = /^[\w.-]+$/;
const PAPER_ID = /^\d{4}\.\d{4,5}$/;
// First path segments on github.com that are site sections, not owners.
const GITHUB_RESERVED = new Set([
  "orgs",
  "topics",
  "trending",
  "collections",
  "marketplace",
  "features",
  "enterprise",
  "sponsors",
  "settings",
  "about",
  "blog",
  "changelog",
]);
// First path segments on huggingface.co that are not model repos.
const HUB_RESERVED = new Set([
  "papers",
  "datasets",
  "spaces",
  "blog",
  "docs",
  "api",
  "learn",
  "models",
  "collections",
  "organizations",
]);

export const IMAGE_HOSTS = [
  "opengraph.githubassets.com",
  "cdn-thumbnails.huggingface.co",
] as const;

function pathParts(url: URL): string[] {
  return url.pathname.split("/").filter(Boolean);
}

export function imageFor(articleUrl: string): string | null {
  let url: URL;
  try {
    url = new URL(articleUrl);
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;
  const [first, second] = pathParts(url);
  if (!first || !SEGMENT.test(first)) return null;

  if (url.hostname === "github.com") {
    if (!second || !SEGMENT.test(second) || GITHUB_RESERVED.has(first)) {
      return null;
    }
    return `https://opengraph.githubassets.com/1/${first}/${second}`;
  }
  if (url.hostname === "huggingface.co") {
    if (first === "papers" && second && PAPER_ID.test(second)) {
      return `https://cdn-thumbnails.huggingface.co/social-thumbnails/papers/${second}.png`;
    }
    if (!second || !SEGMENT.test(second) || HUB_RESERVED.has(first)) {
      return null;
    }
    return `https://cdn-thumbnails.huggingface.co/social-thumbnails/models/${first}/${second}.png`;
  }
  return null;
}
