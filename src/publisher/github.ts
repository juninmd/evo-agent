import { Octokit } from "@octokit/rest";
import type { GeneratedArticle } from "../agent/writer.js";
import { config } from "../config.js";
import { db } from "../knowledge/store.js";
import { log } from "../utils/logger.js";

const octokit = new Octokit({ auth: config.github.token });

function buildMarkdown(article: GeneratedArticle): string {
  return `---
title: "${article.title.replace(/"/g, '\\"')}"
date: "${article.date}"
tags: [${article.tags.map((t) => `"${t}"`).join(", ")}]
summary: "${article.summary.replace(/"/g, '\\"')}"
---

${article.content}

---
*Gerado por evo-agent — agente auto-aprimorante em ${article.date}*
`;
}

function buildIndex(
  articles: Array<{ slug: string; title: string; date: string; url: string }>,
) {
  const rows = articles
    .map((a) => `| ${a.date} | [${a.title}](${a.url}) |`)
    .join("\n");
  return `# Evo Agent — Artigos Diários\n\nArtigos gerados automaticamente por um agente de IA auto-aprimorante.\n\n| Data | Artigo |\n|------|--------|\n${rows}\n`;
}

export async function publishArticle(
  article: GeneratedArticle,
): Promise<string> {
  const { owner, repo, branch } = config.github;
  const filePath = `articles/${article.date}-${article.slug}.md`;
  const markdown = buildMarkdown(article);

  let sha: string | undefined;
  try {
    const existing = await octokit.repos.getContent({
      owner,
      repo,
      path: filePath,
      ref: branch,
    });
    if (!Array.isArray(existing.data) && "sha" in existing.data) {
      sha = existing.data.sha;
    }
  } catch {
    // file doesn't exist yet
  }

  await octokit.repos.createOrUpdateFileContents({
    owner,
    repo,
    path: filePath,
    message: `article: ${article.title}`,
    content: Buffer.from(markdown).toString("base64"),
    branch,
    ...(sha ? { sha } : {}),
  });

  const articleUrl = `https://${owner}.github.io/${repo}/articles/${article.date}-${article.slug}`;

  await updateIndex(owner, repo, branch, article, articleUrl);

  db.savePublished(article.slug, article.title, articleUrl);
  log.info(`Published: ${articleUrl}`);
  return articleUrl;
}

async function updateIndex(
  owner: string,
  repo: string,
  branch: string,
  newArticle: GeneratedArticle,
  newUrl: string,
) {
  const db_articles = [
    {
      slug: newArticle.slug,
      title: newArticle.title,
      date: newArticle.date,
      url: newUrl,
    },
  ];

  let sha: string | undefined;
  try {
    const existing = await octokit.repos.getContent({
      owner,
      repo,
      path: "README.md",
      ref: branch,
    });
    if (!Array.isArray(existing.data) && "sha" in existing.data) {
      sha = existing.data.sha;
      const current = Buffer.from(
        (existing.data as { content: string }).content,
        "base64",
      ).toString();
      const existingRows =
        current.match(/\| \d{4}-\d{2}-\d{2} \|[^\n]+/g) ?? [];
      for (const row of existingRows) {
        const m = row.match(/\| (\d{4}-\d{2}-\d{2}) \| \[(.+?)\]\((.+?)\) \|/);
        if (m && m[3] !== newUrl) {
          db_articles.push({ date: m[1], title: m[2], slug: "", url: m[3] });
        }
      }
    }
  } catch {
    // no index yet
  }

  const indexContent = buildIndex(db_articles.slice(0, 50));
  await octokit.repos.createOrUpdateFileContents({
    owner,
    repo,
    path: "README.md",
    message: "chore: update article index",
    content: Buffer.from(indexContent).toString("base64"),
    branch,
    ...(sha ? { sha } : {}),
  });
}
