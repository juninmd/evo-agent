import axios from "axios";
import { repoStars, type StarSnapshot } from "../knowledge/repo-stars.js";
import { HTTP_LIMITS } from "../utils/http-limits.js";
import { log } from "../utils/logger.js";

// No leading dot: "../x" would walk out of the github.com path.
const FULL_NAME = /^[\w-][\w.-]*\/[\w-][\w.-]*$/;
const NEW_REPO_DAYS = 30;
const VELOCITY_WINDOW_DAYS = 7;
/** Unauthenticated GitHub API allows 60 calls/hour; the crawl runs hourly. */
const ENRICH_PER_CRAWL = 10;
// One-line installs a reader can paste; pipe-to-shell is never promoted.
const INSTALL =
  /^\s*(?:\$\s*)?((?:npx|npm (?:i|install)(?: -g)?|pnpm (?:add|dlx)|bunx|pip install|pipx install|uv tool install|uvx|brew install|cargo install|go install|docker run|claude mcp add|claude plugin install)\s+[^\s|;&`$<>][^\n|;&`$<>]{0,120})$/m;

export interface RepoVelocity {
  repo: string;
  url: string;
  description: string;
  stars: number;
  starsToday: number;
  /** Stars gained per day over the window; equals starsToday on day one. */
  perDay: number;
  isNew: boolean;
}

export function parseStarsToday(text: string): number {
  const match = text
    .replace(/,/g, "")
    .match(/(\d+)\s+stars?\s+(today|this week)/i);
  if (!match) return 0;
  const count = Number(match[1]);
  return /week/i.test(match[2]) ? Math.round(count / 7) : count;
}

function dayDiff(from: string, to: string): number {
  return Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000);
}

/**
 * Ranks by sustained gain, not by total stars: a 100k-star veteran trending
 * again sits below a two-week-old repo gaining faster.
 */
export function rankVelocity(
  snapshots: StarSnapshot[],
  today: string,
  limit = 10,
): RepoVelocity[] {
  const byRepo = new Map<string, StarSnapshot[]>();
  for (const row of snapshots) {
    if (!FULL_NAME.test(row.repo)) continue;
    if (dayDiff(row.day, today) > VELOCITY_WINDOW_DAYS) continue;
    byRepo.set(row.repo, [...(byRepo.get(row.repo) ?? []), row]);
  }
  const ranked: RepoVelocity[] = [];
  for (const [repo, rows] of byRepo) {
    const sorted = [...rows].sort((a, b) => a.day.localeCompare(b.day));
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    if (dayDiff(last.day, today) > 1) continue;
    const span = dayDiff(first.day, last.day);
    const perDay =
      span > 0
        ? Math.max(0, Math.round((last.stars - first.stars) / span))
        : last.starsToday;
    const createdAt = sorted.find((row) => row.createdAt)?.createdAt ?? null;
    ranked.push({
      repo,
      url: `https://github.com/${repo}`,
      description: last.description,
      stars: last.stars,
      starsToday: last.starsToday,
      perDay: Math.max(perDay, last.starsToday),
      isNew:
        createdAt !== null &&
        dayDiff(createdAt.slice(0, 10), today) <= NEW_REPO_DAYS,
    });
  }
  return ranked
    .sort((a, b) => b.perDay - a.perDay || b.stars - a.stars)
    .slice(0, limit);
}

/** First pasteable install line from a README, or null. */
export function installCommand(readme: string): string | null {
  for (const block of readme.split(/```/).filter((_, i) => i % 2 === 1)) {
    const match = block.replace(/^[\w-]*\n/, "").match(INSTALL);
    if (match) return match[1].trim();
  }
  return null;
}

export interface EnrichDeps {
  createdAt: (repo: string) => Promise<string | null>;
}

const defaultEnrich: EnrichDeps = {
  createdAt: async (repo) => {
    const { data } = await axios.get<{ created_at?: string }>(
      `https://api.github.com/repos/${repo}`,
      {
        ...HTTP_LIMITS,
        timeout: 10_000,
        headers: { Accept: "application/vnd.github+json" },
      },
    );
    return typeof data?.created_at === "string" ? data.created_at : null;
  },
};

/** Creation dates tell "new" from "veteran"; fetched once per repo, capped. */
export async function enrichCreatedAt(
  today: string,
  deps: EnrichDeps = defaultEnrich,
): Promise<number> {
  let enriched = 0;
  for (const repo of repoStars.missingCreatedAt(today, ENRICH_PER_CRAWL)) {
    if (!FULL_NAME.test(repo)) continue;
    try {
      const createdAt = await deps.createdAt(repo);
      if (createdAt) {
        repoStars.setCreatedAt(repo, createdAt);
        enriched++;
      }
    } catch (err) {
      // Rate limit or a renamed repo: stop, the next crawl continues.
      log.debug(
        `created_at unavailable for ${repo}: ${(err as Error).message}`,
      );
      break;
    }
  }
  return enriched;
}
