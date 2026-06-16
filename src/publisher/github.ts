import { Octokit } from "@octokit/rest";
import type { GeneratedArticle, ReportPeriod } from "../agent/writer.js";
import { config } from "../config.js";
import {
  type PublishedArticle,
  type SavePublishedInput,
  db,
} from "../knowledge/store.js";
import { log } from "../utils/logger.js";
import {
  type PublishedItem,
  type SiteFile,
  buildIndex,
  buildMarkdown,
  buildSiteFiles,
  uniqueByUrl,
} from "./site-renderer.js";

const octokit = new Octokit({ auth: config.github.token });
type GitHubClient = Pick<Octokit, "git" | "repos">;

export interface PublicationEntry {
  article: GeneratedArticle;
  reportPeriod: ReportPeriod | false;
}

interface PublicationTarget {
  owner: string;
  repo: string;
  branch: string;
}

interface PreparedPublication {
  article: GeneratedArticle;
  reportPeriod: ReportPeriod | false;
  url: string;
  file: SiteFile;
  saved: SavePublishedInput;
}

async function ensureBranchExists(owner: string, repo: string, branch: string) {
  try {
    await octokit.repos.getBranch({ owner, repo, branch });
  } catch (err) {
    if ((err as { status: number }).status !== 404) throw err;
    log.info(`Branch ${branch} does not exist, creating from main`);
    const mainRef = await octokit.git.getRef({
      owner,
      repo,
      ref: "heads/main",
    });
    await octokit.git.createRef({
      owner,
      repo,
      ref: `refs/heads/${branch}`,
      sha: mainRef.data.object.sha,
    });
  }
}

export async function commitFiles(
  owner: string,
  repo: string,
  branch: string,
  files: SiteFile[],
  message: string,
  client: GitHubClient = octokit,
) {
  const ref = await client.git.getRef({
    owner,
    repo,
    ref: `heads/${branch}`,
  });
  const parentSha = ref.data.object.sha;
  const parent = await client.git.getCommit({
    owner,
    repo,
    commit_sha: parentSha,
  });
  const tree = await Promise.all(
    files.map(async (file) => {
      const blob = await client.git.createBlob({
        owner,
        repo,
        content: file.content,
        encoding: "utf-8",
      });
      return {
        path: file.path,
        mode: "100644" as const,
        type: "blob" as const,
        sha: blob.data.sha,
      };
    }),
  );

  try {
    const legacyIndex = await client.repos.getContent({
      owner,
      repo,
      path: "index.html",
      ref: branch,
    });
    if (!Array.isArray(legacyIndex.data)) {
      tree.push({
        path: "index.html",
        mode: "100644",
        type: "blob",
        sha: null as unknown as string,
      });
    }
  } catch {
    // Legacy index is already absent.
  }

  const nextTree = await client.git.createTree({
    owner,
    repo,
    base_tree: parent.data.tree.sha,
    tree,
  });
  const commit = await client.git.createCommit({
    owner,
    repo,
    message,
    tree: nextTree.data.sha,
    parents: [parentSha],
  });
  await client.git.updateRef({
    owner,
    repo,
    ref: `heads/${branch}`,
    sha: commit.data.sha,
    force: false,
  });
}

export async function publishArticle(
  article: GeneratedArticle,
): Promise<string> {
  const [url] = await publishArticleBatch([{ article, reportPeriod: false }]);
  return url;
}

export async function publishWeeklyReport(
  article: GeneratedArticle,
  period: ReportPeriod = article.reportPeriod ?? "weekly",
): Promise<string> {
  const [url] = await publishArticleBatch([{ article, reportPeriod: period }]);
  return url;
}

function preparePublication(
  entry: PublicationEntry,
  target: PublicationTarget,
): PreparedPublication {
  const { article, reportPeriod } = entry;
  const { owner, repo } = target;
  const isReport = reportPeriod !== false;
  const folder = isReport ? "reports" : "articles";
  const prefix = isReport ? `${reportPeriod}-` : "";
  const filePath = `${folder}/${prefix}${article.date}-${article.slug}.md`;
  const articleUrl = `https://${owner}.github.io/${repo}/${folder}/${prefix}${article.date}-${article.slug}`;
  return {
    article,
    reportPeriod,
    url: articleUrl,
    file: { path: filePath, content: buildMarkdown(article) },
    saved: {
      slug: article.slug,
      title: article.title,
      url: articleUrl,
      date: article.date,
      summary: article.summary,
      tags: article.tags,
      kind: isReport ? "report" : "article",
      period: reportPeriod || undefined,
      editorialMetrics: article.editorialMetrics,
      evidence: article.evidence,
    },
  };
}

export function buildPublicationBatch(
  entries: PublicationEntry[],
  published: PublishedArticle[],
  target: PublicationTarget,
): { files: SiteFile[]; items: PreparedPublication[] } {
  const items = entries.map((entry) => preparePublication(entry, target));
  const newUrls = new Set(items.map((item) => item.url));
  const existing = published.filter((item) => !newUrls.has(item.url));
  const articles = existing
    .filter((item) => item.kind === "article")
    .map(toPublishedItem);
  const reports = existing
    .filter((item) => item.kind === "report")
    .map(toPublishedItem);
  for (const item of items) {
    const publishedItem: PublishedItem = {
      date: item.article.date,
      title: item.article.title,
      url: item.url,
      summary: item.article.summary,
      tags: item.article.tags,
    };
    if (item.reportPeriod) reports.unshift(publishedItem);
    else articles.unshift(publishedItem);
  }

  const indexContent = buildIndex(
    uniqueByUrl(articles).slice(0, 80),
    uniqueByUrl(reports).slice(0, 24),
  );
  return {
    items,
    files: [
      ...buildSiteFiles(target.owner, target.repo, target.branch),
      ...items.map((item) => item.file),
      { path: "index.md", content: indexContent },
      { path: "README.md", content: indexContent },
    ],
  };
}

export async function publishArticleBatch(
  entries: PublicationEntry[],
  options: {
    notificationStatus?: PublishedArticle["notification_status"];
    message?: string;
  } = {},
): Promise<string[]> {
  if (entries.length === 0) return [];
  const target = config.github;
  await ensureBranchExists(target.owner, target.repo, target.branch);
  const batch = buildPublicationBatch(entries, db.getPublished(), target);
  await commitFiles(
    target.owner,
    target.repo,
    target.branch,
    batch.files,
    options.message ??
      (entries.length === 1
        ? `article: ${entries[0].article.title}`
        : `articles: publish ${entries.length} editorial editions`),
  );

  for (const item of batch.items) {
    db.savePublished({
      ...item.saved,
      notificationStatus: options.notificationStatus,
    });
    log.info(`Published ${item.saved.kind}: ${item.url}`);
  }
  return batch.items.map((item) => item.url);
}

function toPublishedItem(item: {
  date: string;
  title: string;
  url: string;
  summary: string;
  tags: string[];
}): PublishedItem {
  return {
    date: item.date,
    title: item.title,
    url: item.url,
    summary: item.summary,
    tags: item.tags,
  };
}
