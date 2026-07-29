import type { Article } from "../knowledge/store.js";

const GENERIC_TAGS = new Set([
  "ai",
  "developer",
  "developers",
  "daily",
  "summary",
  "trends",
  "weekly",
]);

const PRIMARY_SOURCE_PATTERNS = [
  /anthropic/i,
  /deepmind/i,
  /github blog/i,
  /google ai/i,
  /google research/i,
  /hugging face blog/i,
  /mistral/i,
  /openai blog/i,
  /together ai/i,
  /vscode updates/i,
];

/**
 * Communities every edition must cover. Matching stays on the source label and
 * the tags because both carry the subreddit name, while titles and URLs would
 * match unrelated stories that merely mention the product.
 */
export const FOCUS_COMMUNITIES: Record<string, RegExp> = {
  "claude-code": /claudecode/i,
  codex: /\bcodex\b/i,
  "vscode-copilot": /\bvscode\b|githubcopilot/i,
};

export function focusCommunity(article: Article): string | null {
  if (sourceBucket(article.source) !== "reddit") return null;
  const haystack = `${article.source} ${parseTags(article.tags).join(" ")}`;
  return (
    Object.entries(FOCUS_COMMUNITIES).find(([, pattern]) =>
      pattern.test(haystack),
    )?.[0] ?? null
  );
}

export interface CuratedArticle {
  article: Article;
  score: number;
  primary: boolean;
  evidenceUrls: string[];
}

export interface RejectedArticle {
  article: Article;
  reason:
    | "duplicate-story"
    | "low-information"
    | "bucket-limit"
    | "primary-limit"
    | "max-limit";
}

export interface CurationResult {
  selected: CuratedArticle[];
  rejected: RejectedArticle[];
  metrics: {
    considered: number;
    selected: number;
    rejected: number;
    buckets: Record<string, number>;
    primarySources: number;
    communitySignals: number;
    redditSignals: number;
  };
}

export interface CurationPolicy {
  perBucket?: number;
  perBucketOverrides?: Record<string, number>;
  max?: number;
  requirePrimary?: boolean;
  minSummaryLength?: number;
  maxPrimaryShare?: number;
  minCommunitySignals?: number;
  minRedditSignals?: number;
  /** Keep at least one post from each community in FOCUS_COMMUNITIES. */
  requireFocusCommunities?: boolean;
  now?: number;
}

export function parseTags(value: string): string[] {
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return [
      ...new Set(
        parsed
          .filter((tag): tag is string => typeof tag === "string")
          .map((tag) => tag.trim().toLowerCase())
          .filter(Boolean),
      ),
    ];
  } catch {
    return [];
  }
}

export function normalizeTitle(title: string): string {
  return title
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function sourceBucket(source: string): string {
  if (/^reddit/i.test(source)) return "reddit";
  if (/^google news/i.test(source)) return "google-news";
  if (/^github trending/i.test(source)) return "github-trending";
  if (/^(x\/twitter|web search|searxng)/i.test(source)) return "websearch";
  if (/^hacker news/i.test(source)) return "hackernews";
  if (/^tabnews/i.test(source)) return "tabnews";
  return source.toLowerCase().split(/[:(]/)[0].trim();
}

export function isPrimarySource(article: Article): boolean {
  if (PRIMARY_SOURCE_PATTERNS.some((pattern) => pattern.test(article.source))) {
    return true;
  }
  try {
    const host = new URL(article.url).hostname.replace(/^www\./, "");
    return [
      "anthropic.com",
      "deepmind.google",
      "github.blog",
      "huggingface.co",
      "openai.com",
      "research.google",
    ].some((domain) => host === domain || host.endsWith(`.${domain}`));
  } catch {
    return false;
  }
}

export function isCommunitySignal(article: Article): boolean {
  return /reddit|hacker news|tabnews|community/i.test(article.source);
}

function titleSimilarity(left: string, right: string): number {
  const a = new Set(normalizeTitle(left).split(" ").filter(Boolean));
  const b = new Set(normalizeTitle(right).split(" ").filter(Boolean));
  if (a.size === 0 || b.size === 0) return 0;
  const intersection = [...a].filter((token) => b.has(token)).length;
  const union = new Set([...a, ...b]).size;
  return intersection / union;
}

function editorialScore(
  article: Article,
  normalizedEngagement: number,
  now = Date.now(),
): number {
  const ageHours = Math.max(
    0,
    (now - new Date(article.crawled_at).getTime()) / 3_600_000,
  );
  const recency = Math.max(0, 30 - ageHours / 24);
  const engagement = normalizedEngagement * 20;
  const authority = isPrimarySource(article) ? 35 : 0;
  const communitySignal =
    sourceBucket(article.source) === "reddit"
      ? parseTags(article.tags).includes("community-signals")
        ? 20
        : 16
      : /hackernews|tabnews/.test(sourceBucket(article.source))
        ? 8
        : 0;
  const focusBoost = focusCommunity(article) ? 14 : 0;
  const summaryQuality = Math.min(article.summary.trim().length / 300, 1) * 15;
  const usefulTags = parseTags(article.tags).filter(
    (tag) => !GENERIC_TAGS.has(tag),
  ).length;
  return (
    authority +
    communitySignal +
    focusBoost +
    engagement +
    recency +
    summaryQuality +
    Math.min(usefulTags, 5) * 2
  );
}

export function curateArticles(
  articles: Article[],
  policy: CurationPolicy = {},
): CurationResult {
  const max = policy.max ?? Number.POSITIVE_INFINITY;
  const perBucket = policy.perBucket ?? Number.POSITIVE_INFINITY;
  const minSummaryLength = policy.minSummaryLength ?? 60;
  const rejected: RejectedArticle[] = [];
  const informative = articles.filter((article) => {
    const summary = article.summary?.trim() ?? "";
    if (
      summary.length >= minSummaryLength &&
      !/^sem conte[uú]do$/i.test(summary)
    ) {
      return true;
    }
    rejected.push({ article, reason: "low-information" });
    return false;
  });
  const maxEngagementByBucket = new Map<string, number>();
  for (const article of informative) {
    const bucket = sourceBucket(article.source);
    const engagement = Math.log10(Math.max(0, article.engagement_score) + 1);
    maxEngagementByBucket.set(
      bucket,
      Math.max(maxEngagementByBucket.get(bucket) ?? 0, engagement),
    );
  }
  const candidates = informative
    .map((article) => ({
      article,
      score: editorialScore(
        article,
        (() => {
          const engagement = Math.log10(
            Math.max(0, article.engagement_score) + 1,
          );
          const bucketMax =
            maxEngagementByBucket.get(sourceBucket(article.source)) ?? 0;
          return bucketMax > 0 ? engagement / bucketMax : 0;
        })(),
        policy.now,
      ),
      primary: isPrimarySource(article),
      evidenceUrls: [article.url],
    }))
    .sort((a, b) => b.score - a.score);

  const deduped: CuratedArticle[] = [];
  for (const candidate of candidates) {
    const duplicate = deduped.find(
      (existing) =>
        titleSimilarity(existing.article.title, candidate.article.title) >=
        0.72,
    );
    if (duplicate) {
      duplicate.evidenceUrls.push(candidate.article.url);
      rejected.push({ article: candidate.article, reason: "duplicate-story" });
      continue;
    }
    deduped.push(candidate);
  }

  const selected: CuratedArticle[] = [];
  const bucketCount = new Map<string, number>();
  let primaryCount = 0;
  const maxPrimary =
    Number.isFinite(max) && policy.maxPrimaryShare
      ? Math.max(1, Math.ceil(max * policy.maxPrimaryShare))
      : Number.POSITIVE_INFINITY;
  for (const candidate of deduped) {
    const bucket = sourceBucket(candidate.article.source);
    const bucketLimit = policy.perBucketOverrides?.[bucket] ?? perBucket;
    if ((bucketCount.get(bucket) ?? 0) >= bucketLimit) {
      rejected.push({ article: candidate.article, reason: "bucket-limit" });
      continue;
    }
    if (candidate.primary && primaryCount >= maxPrimary) {
      rejected.push({ article: candidate.article, reason: "primary-limit" });
      continue;
    }
    if (selected.length >= max) {
      rejected.push({ article: candidate.article, reason: "max-limit" });
      continue;
    }
    selected.push(candidate);
    if (candidate.primary) primaryCount++;
    bucketCount.set(bucket, (bucketCount.get(bucket) ?? 0) + 1);
  }

  if (
    policy.requirePrimary &&
    !selected.some((candidate) => candidate.primary)
  ) {
    const primary = deduped.find(
      (candidate) =>
        candidate.primary &&
        !selected.some(
          (selectedCandidate) =>
            selectedCandidate.article.url === candidate.article.url,
        ),
    );
    if (primary && selected.length > 0) {
      const displaced = selected.pop();
      if (displaced) {
        rejected.push({ article: displaced.article, reason: "max-limit" });
      }
      selected.push(primary);
    }
  }

  const minCommunity = Math.min(
    policy.minCommunitySignals ?? 0,
    Math.max(0, max - (policy.requirePrimary ? 1 : 0)),
  );
  const selectedUrls = () =>
    new Set(selected.map((candidate) => candidate.article.url));
  const selectedCommunityCount = () =>
    selected.filter((candidate) => isCommunitySignal(candidate.article)).length;
  const selectedRedditCount = () =>
    selected.filter(
      (candidate) => sourceBucket(candidate.article.source) === "reddit",
    ).length;
  const replaceWith = (candidate: CuratedArticle) => {
    const replaceIndex = selected.findIndex(
      (selectedCandidate) =>
        !selectedCandidate.primary &&
        !isCommunitySignal(selectedCandidate.article),
    );
    const fallbackReplaceIndex = selected.findIndex(
      (selectedCandidate) => !selectedCandidate.primary,
    );
    const index = replaceIndex >= 0 ? replaceIndex : fallbackReplaceIndex;
    if (index < 0) return false;
    const displaced = selected[index];
    rejected.push({ article: displaced.article, reason: "max-limit" });
    selected[index] = candidate;
    return true;
  };
  const minReddit = Math.min(
    policy.minRedditSignals ?? 0,
    Math.max(0, max - (policy.requirePrimary ? 1 : 0)),
  );
  const redditCandidates = deduped.filter(
    (candidate) =>
      sourceBucket(candidate.article.source) === "reddit" &&
      !selectedUrls().has(candidate.article.url),
  );
  for (const reddit of redditCandidates) {
    if (selectedRedditCount() >= minReddit) break;
    if (!replaceWith(reddit)) break;
  }
  const communityCandidates = deduped
    .filter(
      (candidate) =>
        isCommunitySignal(candidate.article) &&
        !selectedUrls().has(candidate.article.url),
    )
    .sort((a, b) => {
      const redditDelta =
        Number(sourceBucket(b.article.source) === "reddit") -
        Number(sourceBucket(a.article.source) === "reddit");
      return redditDelta || b.score - a.score;
    });
  for (const community of communityCandidates) {
    if (selectedCommunityCount() >= minCommunity) break;
    if (!replaceWith(community)) break;
  }

  if (policy.requireFocusCommunities) {
    // Each focus community gets one guaranteed slot; the cheapest selected item
    // that is neither primary nor itself a focus post pays for it.
    const replaceForFocus = (candidate: CuratedArticle) => {
      const expendable = selected
        .map((item, index) => ({ item, index }))
        .filter(({ item }) => !item.primary && !focusCommunity(item.article))
        .sort(
          (a, b) =>
            Number(isCommunitySignal(a.item.article)) -
              Number(isCommunitySignal(b.item.article)) ||
            a.item.score - b.item.score,
        )[0];
      if (!expendable) return false;
      rejected.push({ article: expendable.item.article, reason: "max-limit" });
      selected[expendable.index] = candidate;
      return true;
    };
    for (const community of Object.keys(FOCUS_COMMUNITIES)) {
      if (
        selected.some(
          (candidate) => focusCommunity(candidate.article) === community,
        )
      ) {
        continue;
      }
      const candidate = deduped.find(
        (item) =>
          focusCommunity(item.article) === community &&
          !selectedUrls().has(item.article.url),
      );
      if (!candidate) continue;
      if (selected.length < max) {
        selected.push(candidate);
        continue;
      }
      if (!replaceForFocus(candidate)) break;
    }
  }

  const buckets = Object.fromEntries(
    [...new Set(selected.map((item) => sourceBucket(item.article.source)))].map(
      (bucket) => [
        bucket,
        selected.filter((item) => sourceBucket(item.article.source) === bucket)
          .length,
      ],
    ),
  );

  return {
    selected,
    rejected,
    metrics: {
      considered: articles.length,
      selected: selected.length,
      rejected: rejected.length,
      buckets,
      primarySources: selected.filter((candidate) => candidate.primary).length,
      communitySignals: selected.filter((candidate) =>
        isCommunitySignal(candidate.article),
      ).length,
      redditSignals: selected.filter(
        (candidate) => sourceBucket(candidate.article.source) === "reddit",
      ).length,
    },
  };
}
