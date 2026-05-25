import { Octokit } from "@octokit/rest";
import type { GeneratedArticle } from "../agent/writer.js";
import { config } from "../config.js";
import { db } from "../knowledge/store.js";
import { log } from "../utils/logger.js";

const octokit = new Octokit({ auth: config.github.token });

function buildMarkdown(article: GeneratedArticle): string {
  const sourcesMarkdown = article.sources && article.sources.length > 0 
    ? `\n\n### Fontes\n${article.sources.map(s => `- [${s}](${s})`).join('\n')}`
    : '';

  return `---
title: "${article.title.replace(/"/g, '\\"')}"
date: "${article.date}"
tags: [${article.tags.map((t) => `"${t}"`).join(", ")}]
summary: "${article.summary.replace(/"/g, '\\"')}"
---

# ${article.title}

${article.content}
${sourcesMarkdown}

---
*Gerado por evo-agent — agente auto-aprimorante em ${article.date}*
`;
}

function buildHtmlIndex(
  articles: Array<{ slug: string; title: string; date: string; url: string }>,
) {
  const cards = articles
    .map(
      (a) => `
    <div class="card">
      <div class="date">${a.date}</div>
      <div class="title">${a.title}</div>
      <a href="${a.url}" class="btn">Ler Artigo</a>
    </div>`,
    )
    .join("\n");

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Evo Agent — Artigos Diários</title>
    <style>
        :root {
            --bg: #0d1117;
            --card-bg: #161b22;
            --text: #c9d1d9;
            --accent: #58a6ff;
            --neon: #00f2ff;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
            background-color: var(--bg);
            color: var(--text);
            line-height: 1.6;
            margin: 0;
            padding: 40px 20px;
            display: flex;
            flex-direction: column;
            align-items: center;
        }
        .container {
            max-width: 900px;
            width: 100%;
        }
        header {
            text-align: center;
            margin-bottom: 50px;
        }
        h1 {
            color: var(--neon);
            font-size: 2.5rem;
            text-shadow: 0 0 10px rgba(0, 242, 255, 0.3);
            margin-bottom: 10px;
        }
        .subtitle {
            color: #8b949e;
            font-size: 1.1rem;
        }
        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 20px;
        }
        .card {
            background: var(--card-bg);
            border: 1px solid #30363d;
            border-radius: 12px;
            padding: 24px;
            transition: transform 0.2s, border-color 0.2s;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
        }
        .card:hover {
            transform: translateY(-5px);
            border-color: var(--neon);
            box-shadow: 0 0 15px rgba(0, 242, 255, 0.1);
        }
        .date {
            font-size: 0.85rem;
            color: #8b949e;
            margin-bottom: 10px;
        }
        .title {
            font-size: 1.25rem;
            font-weight: 600;
            margin-bottom: 20px;
            color: #f0f6fc;
        }
        .btn {
            display: inline-block;
            padding: 10px 20px;
            background: transparent;
            border: 1px solid var(--neon);
            color: var(--neon);
            text-decoration: none;
            border-radius: 6px;
            text-align: center;
            font-weight: 500;
            transition: background 0.2s, color 0.2s;
        }
        .btn:hover {
            background: var(--neon);
            color: var(--bg);
        }
        footer {
            margin-top: 60px;
            text-align: center;
            color: #8b949e;
            font-size: 0.9rem;
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>Evo Agent</h1>
            <p class="subtitle">Artigos e insights gerados autonomamente por IA.</p>
        </header>
        <div class="grid">
            ${cards}
        </div>
        <footer>
            &copy; ${new Date().getFullYear()} Evo Agent — Powered by Anthropic & Google
        </footer>
    </div>
</body>
</html>`;
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
      path: "index.html",
      ref: branch,
    });
    if (!Array.isArray(existing.data) && "sha" in existing.data) {
      sha = existing.data.sha;
      const current = Buffer.from(
        (existing.data as { content: string }).content,
        "base64",
      ).toString();
      
      // Basic regex to find existing cards in index.html and reconstruct db_articles
      const cardRegex = /<div class="date">(.+?)<\/div>\s+<div class="title">(.+?)<\/div>\s+<a href="(.+?)"/g;
      let match;
      while ((match = cardRegex.exec(current)) !== null) {
          if (match[3] !== newUrl) {
            db_articles.push({ date: match[1], title: match[2], slug: "", url: match[3] });
          }
      }
    }
  } catch {
    // no index yet
  }

  const indexContent = buildHtmlIndex(db_articles.slice(0, 50));
  await octokit.repos.createOrUpdateFileContents({
    owner,
    repo,
    path: "index.html",
    message: "chore: update article index",
    content: Buffer.from(indexContent).toString("base64"),
    branch,
    ...(sha ? { sha } : {}),
  });
}
