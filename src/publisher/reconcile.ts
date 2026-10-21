import type { Octokit } from "@octokit/rest";
import type { ReportPeriod } from "../agent/types.js";
import { type SavePublishedInput, db } from "../knowledge/store.js";
import { log } from "../utils/logger.js";

type GitHubClient = Pick<Octokit, "git" | "repos">;

interface Target {
  owner: string;
  repo: string;
  branch: string;
}

const PAGE_PATH = /^(articles|reports)\/(.+)\.md$/;
const PERIODS = new Set<string>([
  "radar",
  "techlead",
  "devtips",
  "weekly",
  "biweekly",
  "monthly",
  "bimonthly",
  "semester",
] satisfies ReportPeriod[]);
// One run never rebuilds more than this: a large gap is a decision, not a retry.
const MAX_RECONCILED = 50;

export function pageUrl(target: Target, path: string): string {
  return `https://${target.owner}.github.io/${target.repo}/${path.replace(/\.md$/, "")}`;
}

/** The scalar forms buildMarkdown writes are a subset of JSON strings. */
function scalar(front: string, key: string): string | null {
  const match = front.match(new RegExp(`^${key}: (".*")\\s*$`, "m"));
  if (!match) return null;
  try {
    const value = JSON.parse(match[1]);
    return typeof value === "string" ? value : null;
  } catch {
    return null;
  }
}

/**
 * Rebuilds a database row from a page the publisher committed. Null for files
 * that are not editions or that were already replaced by a retraction notice.
 */
export function parseEditionPage(
  target: Target,
  path: string,
  markdown: string,
): SavePublishedInput | null {
  const location = path.match(PAGE_PATH);
  const front = markdown.match(/^---\n([\s\S]*?)\n---/)?.[1];
  if (!location || !front) return null;
  const title = scalar(front, "title");
  const date = scalar(front, "date");
  const summary = scalar(front, "summary") ?? "";
  if (!title || !date || /^Edição retirada em /.test(summary)) return null;

  let tags: string[] = [];
  try {
    const parsed = JSON.parse(front.match(/^tags: (\[.*\])\s*$/m)?.[1] ?? "[]");
    tags = Array.isArray(parsed)
      ? parsed.filter((tag): tag is string => typeof tag === "string")
      : [];
  } catch {
    tags = [];
  }

  const [, folder, name] = location;
  const period = name.match(/^([a-z]+)-\d{4}-\d{2}-\d{2}-/)?.[1];
  const isReport = folder === "reports";
  return {
    slug: name,
    title,
    url: pageUrl(target, path),
    date,
    summary,
    tags,
    kind: isReport ? "report" : "article",
    period: isReport && period && PERIODS.has(period) ? period : undefined,
    // The page already went out (or was meant to): never ping for a rebuilt row.
    notificationStatus: "suppressed",
    content: markdown,
    revisionReason: "reconciled from repository",
  };
}

/**
 * The commit lands before the database write, so a crash in between leaves a
 * page on the branch that the index, the feed and the daily budget cannot see.
 * Registers every edition page the database does not know.
 */
export async function reconcilePublished(
  client: GitHubClient,
  target: Target,
  knownUrls: Set<string> = new Set(db.getPublished().map((row) => row.url)),
): Promise<number> {
  const { owner, repo, branch } = target;
  const ref = await client.git.getRef({ owner, repo, ref: `heads/${branch}` });
  const commit = await client.git.getCommit({
    owner,
    repo,
    commit_sha: ref.data.object.sha,
  });
  const tree = await client.git.getTree({
    owner,
    repo,
    tree_sha: commit.data.tree.sha,
    recursive: "true",
  });
  if (tree.data.truncated) {
    log.warn("Repository tree truncated; reconciliation may miss pages");
  }

  const missing = tree.data.tree
    .filter(
      (entry) =>
        entry.type === "blob" &&
        entry.path !== undefined &&
        PAGE_PATH.test(entry.path) &&
        !knownUrls.has(pageUrl(target, entry.path)),
    )
    .map((entry) => entry.path as string)
    .slice(0, MAX_RECONCILED);

  let restored = 0;
  for (const path of missing) {
    const file = await client.repos.getContent({
      owner,
      repo,
      path,
      ref: branch,
    });
    if (Array.isArray(file.data) || !("content" in file.data)) continue;
    const markdown = Buffer.from(file.data.content, "base64").toString("utf8");
    const parsed = parseEditionPage(target, path, markdown);
    if (!parsed) continue;
    db.savePublished(parsed);
    log.warn(`Reconciled unregistered page: ${parsed.url}`);
    restored++;
  }
  return restored;
}
