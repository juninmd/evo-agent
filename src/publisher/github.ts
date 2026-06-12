import { Octokit } from "@octokit/rest";
import type { GeneratedArticle, ReportPeriod } from "../agent/writer.js";
import { config } from "../config.js";
import { db } from "../knowledge/store.js";
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
  return publishToGithub(article, false);
}

export async function publishWeeklyReport(
  article: GeneratedArticle,
  period: ReportPeriod = article.reportPeriod ?? "weekly",
): Promise<string> {
  return publishToGithub(article, period);
}

async function publishToGithub(
  article: GeneratedArticle,
  reportPeriod: ReportPeriod | false,
): Promise<string> {
  const { owner, repo, branch } = config.github;
  const isReport = reportPeriod !== false;
  await ensureBranchExists(owner, repo, branch);

  const folder = isReport ? "reports" : "articles";
  const prefix = isReport ? `${reportPeriod}-` : "";
  const filePath = `${folder}/${prefix}${article.date}-${article.slug}.md`;
  const articleUrl = `https://${owner}.github.io/${repo}/${folder}/${prefix}${article.date}-${article.slug}`;
  const newItem: PublishedItem = {
    date: article.date,
    title: article.title,
    url: articleUrl,
    summary: article.summary,
    tags: article.tags,
  };
  const existing = db.getPublished().filter((item) => item.url !== articleUrl);
  const articles = existing
    .filter((item) => item.kind === "article")
    .map(toPublishedItem);
  const reports = existing
    .filter((item) => item.kind === "report")
    .map(toPublishedItem);
  if (isReport) reports.unshift(newItem);
  else articles.unshift(newItem);

  const indexContent = buildIndex(
    uniqueByUrl(articles).slice(0, 80),
    uniqueByUrl(reports).slice(0, 24),
  );
  await commitFiles(
    owner,
    repo,
    branch,
    [
      ...buildSiteFiles(owner, repo, branch),
      { path: filePath, content: buildMarkdown(article) },
      { path: "index.md", content: indexContent },
      { path: "README.md", content: indexContent },
    ],
    `${isReport ? "report" : "article"}: ${article.title}`,
  );

  db.savePublished({
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
  });
  log.info(
    `Published ${isReport ? `${reportPeriod} report` : "article"}: ${articleUrl}`,
  );
  return articleUrl;
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
