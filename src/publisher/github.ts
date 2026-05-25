import { Octokit } from "@octokit/rest";
import type { GeneratedArticle } from "../agent/writer.js";
import { config } from "../config.js";
import { db } from "../knowledge/store.js";
import { log } from "../utils/logger.js";

const octokit = new Octokit({ auth: config.github.token });

type PublishedItem = {
  date: string;
  title: string;
  url: string;
  summary?: string;
  tags?: string[];
};

type SiteFile = {
  path: string;
  content: string;
};

async function ensureBranchExists(owner: string, repo: string, branch: string) {
  try {
    await octokit.repos.getBranch({ owner, repo, branch });
  } catch (err) {
    if ((err as { status: number }).status === 404) {
      log.info(`Branch ${branch} does not exist, creating from main...`);
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
      log.info(`Branch ${branch} created successfully`);
    } else {
      throw err;
    }
  }
}

function escapeYaml(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function buildMarkdown(article: GeneratedArticle): string {
  return `---
layout: article
title: "${escapeYaml(article.title)}"
date: "${article.date}"
tags: [${article.tags.map((t) => `"${escapeYaml(t)}"`).join(", ")}]
summary: "${escapeYaml(article.summary)}"
---

{% raw %}
${article.content}
{% endraw %}

---
*Gerado por evo-agent - agente auto-aprimorante em ${article.date}.*
`;
}

function formatMonth(date: string): string {
  const monthNames = [
    "Janeiro",
    "Fevereiro",
    "Março",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro",
  ];
  const monthIndex = Number(date.slice(5, 7)) - 1;
  return monthNames[monthIndex] ?? "Sem mes";
}

function groupByYearMonth(items: PublishedItem[]) {
  const groups = new Map<string, PublishedItem[]>();
  for (const item of items) {
    const key = item.date.slice(0, 7);
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  return [...groups.entries()].sort((a, b) => b[0].localeCompare(a[0]));
}

function buildItemCard(item: PublishedItem, kind: "Artigo" | "Relatorio") {
  const tags = item.tags?.length
    ? `<div class="chips">${item.tags.map((tag) => `<span>${tag}</span>`).join("")}</div>`
    : "";
  const summary = item.summary ? `<p>${item.summary}</p>` : "";

  return `<article class="story-card">
  <div class="story-meta"><time datetime="${item.date}">${item.date}</time><span>${kind}</span></div>
  <h3><a href="${item.url}">${item.title}</a></h3>
  ${summary}
  ${tags}
</article>`;
}

function buildIndex(articles: PublishedItem[], weeklyReports: PublishedItem[]) {
  const reportCards =
    weeklyReports.length > 0
      ? weeklyReports.map((r) => buildItemCard(r, "Relatorio")).join("\n")
      : '<p class="empty-state">Nenhum relatorio publicado ainda.</p>';

  const articleGroups = groupByYearMonth(articles)
    .map(([key, items]) => {
      const year = key.slice(0, 4);
      const month = formatMonth(`${key}-01`);
      return `<section class="month-group">
  <div class="month-heading"><span>${year}</span><h2>${month}</h2><strong>${items.length}</strong></div>
  <div class="story-grid">
    ${items.map((a) => buildItemCard(a, "Artigo")).join("\n")}
  </div>
</section>`;
    })
    .join("\n");

  return `---
layout: home
title: Evo Agent
---

<section class="hero">
  <p class="kicker">evo-agent publishing lab</p>
  <h1>Artigos e relatorios de um agente que aprende em producao.</h1>
  <p class="lede">Leitura tecnica em tema dark, organizada por calendario, com foco em IA, agentes, arquitetura e codigo pratico.</p>
  <div class="hero-stats">
    <span><strong>${articles.length}</strong> artigos</span>
    <span><strong>${weeklyReports.length}</strong> relatorios</span>
  </div>
</section>

<section class="reports-band" id="relatorios">
  <div class="section-title">
    <p>Radar semanal</p>
    <h2>Relatorios</h2>
  </div>
  <div class="story-grid featured-grid">
    ${reportCards}
  </div>
</section>

<section class="archive" id="arquivo">
  <div class="section-title">
    <p>Arquivo por ano e mes</p>
    <h2>Artigos diarios</h2>
  </div>
  ${articleGroups || '<p class="empty-state">Nenhum artigo publicado ainda.</p>'}
</section>
`;
}

function buildDefaultLayout() {
  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{{ page.title }} | Evo Agent</title>
    <meta name="description" content="{{ page.summary | default: site.description }}">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@500;700&family=IBM+Plex+Sans:wght@500;600;700&family=Source+Serif+4:opsz,wght@8..60,400;8..60,600;8..60,700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="{{ '/assets/site.css' | relative_url }}">
    <script>
      const savedTheme = localStorage.getItem("evo-agent-theme");
      const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      document.documentElement.dataset.theme = savedTheme || (systemDark ? "dark" : "light");
    </script>
  </head>
  <body>
    <header class="site-header">
      <a class="brand" href="{{ '/' | relative_url }}">Evo Agent</a>
      <nav aria-label="Principal">
        <a href="{{ '/' | relative_url }}#arquivo">Arquivo</a>
        <a href="{{ '/' | relative_url }}#relatorios">Relatorios</a>
        <a href="https://github.com/{{ site.github_owner }}/{{ site.github_repo }}">GitHub</a>
        <button class="theme-toggle" type="button" data-theme-toggle>Claro</button>
      </nav>
    </header>
    <main>
      {{ content }}
    </main>
    <script>
      const themeButton = document.querySelector("[data-theme-toggle]");
      const setTheme = (theme) => {
        document.documentElement.dataset.theme = theme;
        localStorage.setItem("evo-agent-theme", theme);
        if (themeButton) themeButton.textContent = theme === "dark" ? "Claro" : "Escuro";
      };
      setTheme(document.documentElement.dataset.theme || "dark");
      themeButton?.addEventListener("click", () => {
        setTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark");
      });
    </script>
  </body>
</html>`;
}

function buildArticleLayout() {
  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{{ page.title }} | Evo Agent</title>
    <meta name="description" content="{{ page.summary | default: site.description }}">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@500;700&family=IBM+Plex+Sans:wght@500;600;700&family=Source+Serif+4:opsz,wght@8..60,400;8..60,600;8..60,700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="{{ '/assets/site.css' | relative_url }}">
    <script>
      const savedTheme = localStorage.getItem("evo-agent-theme");
      const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      document.documentElement.dataset.theme = savedTheme || (systemDark ? "dark" : "light");
    </script>
  </head>
  <body>
    <header class="site-header">
      <a class="brand" href="{{ '/' | relative_url }}">Evo Agent</a>
      <nav aria-label="Principal">
        <a href="{{ '/' | relative_url }}#arquivo">Arquivo</a>
        <a href="{{ '/' | relative_url }}#relatorios">Relatorios</a>
        <a href="https://github.com/{{ site.github_owner }}/{{ site.github_repo }}">GitHub</a>
        <button class="theme-toggle" type="button" data-theme-toggle>Claro</button>
      </nav>
    </header>
    <main>
      <article class="article-shell">
        <header class="article-hero">
          <p class="kicker">{{ page.date | date: "%Y-%m-%d" }}</p>
          <h1>{{ page.title }}</h1>
          {% if page.summary %}<p class="article-summary">{{ page.summary }}</p>{% endif %}
          {% if page.tags %}
          <div class="chips">
            {% for tag in page.tags %}<span>{{ tag }}</span>{% endfor %}
          </div>
          {% endif %}
          <a class="download-md" href="https://raw.githubusercontent.com/{{ site.github_owner }}/{{ site.github_repo }}/{{ site.github_branch | default: 'gh-pages' }}/{{ page.path }}" download>Baixar Markdown</a>
        </header>
        <div class="article-content">
          {{ content }}
        </div>
      </article>
    </main>
    <script>
      const themeButton = document.querySelector("[data-theme-toggle]");
      const setTheme = (theme) => {
        document.documentElement.dataset.theme = theme;
        localStorage.setItem("evo-agent-theme", theme);
        if (themeButton) themeButton.textContent = theme === "dark" ? "Claro" : "Escuro";
      };
      setTheme(document.documentElement.dataset.theme || "dark");
      themeButton?.addEventListener("click", () => {
        setTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark");
      });
    </script>
  </body>
</html>`;
}

export function buildSiteCss() {
  return `:root {
  color-scheme: dark;
  --bg: #080a0f;
  --panel: #111723;
  --panel-2: #182232;
  --text: #f4f0e8;
  --muted: #a9b0bd;
  --line: #293346;
  --accent: #5eead4;
  --hot: #ffbf69;
  --code: #0d1117;
  --max: 1120px;
}

:root[data-theme="light"] {
  color-scheme: light;
  --bg: #f7f3ea;
  --panel: #ffffff;
  --panel-2: #ece5d8;
  --text: #161a22;
  --muted: #5d6470;
  --line: #d7cfc0;
  --accent: #006b5f;
  --hot: #9a4f00;
  --code: #f0eadf;
}

:root[data-theme="dark"] {
  color-scheme: dark;
}

* { box-sizing: border-box; }
html { scroll-behavior: smooth; }

body {
  margin: 0;
  background:
    radial-gradient(circle at 18% 0%, color-mix(in srgb, var(--accent) 16%, transparent), transparent 34rem),
    radial-gradient(circle at 85% 12%, color-mix(in srgb, var(--hot) 14%, transparent), transparent 28rem),
    var(--bg);
  color: var(--text);
  font-family: "Source Serif 4", Georgia, Cambria, "Times New Roman", serif;
  line-height: 1.7;
}

a { color: inherit; }

.site-header {
  align-items: center;
  backdrop-filter: blur(18px);
  background: rgba(8, 10, 15, 0.74);
  border-bottom: 1px solid var(--line);
  display: flex;
  justify-content: space-between;
  padding: 18px clamp(18px, 4vw, 52px);
  position: sticky;
  top: 0;
  z-index: 10;
}

.brand {
  color: var(--accent);
  font-family: "IBM Plex Mono", ui-monospace, SFMono-Regular, Consolas, monospace;
  font-size: 0.95rem;
  font-weight: 800;
  text-decoration: none;
  text-transform: uppercase;
}

nav {
  display: flex;
  align-items: center;
  gap: 18px;
  font-family: "IBM Plex Sans", system-ui, sans-serif;
  font-size: 0.78rem;
  text-transform: uppercase;
}

nav a {
  color: var(--muted);
  text-decoration: none;
}

nav a:hover { color: var(--text); }

.theme-toggle {
  background: transparent;
  border: 1px solid var(--line);
  border-radius: 999px;
  color: var(--text);
  cursor: pointer;
  font: inherit;
  padding: 6px 11px;
  text-transform: uppercase;
}

.theme-toggle:hover {
  border-color: var(--accent);
  color: var(--accent);
}

main {
  margin: 0 auto;
  max-width: var(--max);
  padding: clamp(28px, 6vw, 72px) clamp(18px, 4vw, 44px);
}

.hero {
  border-bottom: 1px solid var(--line);
  margin-bottom: 48px;
  padding: 52px 0 44px;
}

.kicker,
.section-title p,
.story-meta,
.chips {
  color: var(--muted);
  font-family: "IBM Plex Mono", ui-monospace, SFMono-Regular, Consolas, monospace;
  font-size: 0.78rem;
  text-transform: uppercase;
}

.hero h1 {
  font-size: clamp(2.7rem, 7vw, 6.8rem);
  line-height: 0.95;
  margin: 0;
  max-width: 980px;
}

.lede {
  color: var(--muted);
  font-size: clamp(1.05rem, 2vw, 1.35rem);
  max-width: 720px;
}

.hero-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 30px;
}

.hero-stats span,
.chips span {
  border: 1px solid var(--line);
  border-radius: 999px;
  color: var(--muted);
  padding: 7px 12px;
}

.hero-stats strong { color: var(--accent); }

.section-title {
  align-items: end;
  display: flex;
  justify-content: space-between;
  margin: 38px 0 18px;
}

.section-title h2,
.month-heading h2 {
  font-size: clamp(1.8rem, 3vw, 3rem);
  line-height: 1;
  margin: 0;
}

.story-grid {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
}

.story-card {
  background: linear-gradient(160deg, color-mix(in srgb, var(--panel-2) 86%, transparent), color-mix(in srgb, var(--panel) 94%, transparent));
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 22px;
  transition: border-color 160ms ease, transform 160ms ease;
}

.story-card:hover {
  border-color: rgba(94, 234, 212, 0.55);
  transform: translateY(-2px);
}

.story-meta {
  display: flex;
  gap: 10px;
  justify-content: space-between;
}

.story-card h3 {
  font-size: 1.35rem;
  line-height: 1.2;
  margin: 18px 0 10px;
}

.story-card h3 a { text-decoration: none; }
.story-card h3 a:hover { color: var(--accent); }

.story-card p {
  color: var(--muted);
  margin: 0 0 16px;
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.month-group {
  border-top: 1px solid var(--line);
  padding: 28px 0;
}

.month-heading {
  align-items: baseline;
  display: grid;
  gap: 12px;
  grid-template-columns: 72px 1fr auto;
  margin-bottom: 18px;
}

.month-heading span,
.month-heading strong {
  color: var(--hot);
  font-family: "IBM Plex Mono", ui-monospace, SFMono-Regular, Consolas, monospace;
}

.empty-state {
  border: 1px dashed var(--line);
  color: var(--muted);
  padding: 24px;
}

.article-shell {
  margin: 0 auto;
  max-width: 820px;
}

.article-hero {
  border-bottom: 1px solid var(--line);
  margin-bottom: 34px;
  padding-bottom: 28px;
}

.article-hero h1 {
  font-size: clamp(2.2rem, 5vw, 4.8rem);
  line-height: 1;
  margin: 12px 0;
}

.article-summary {
  color: var(--muted);
  font-size: 1.2rem;
}

.download-md {
  border: 1px solid rgba(94, 234, 212, 0.45);
  border-radius: 999px;
  color: var(--accent);
  display: inline-flex;
  font-family: "IBM Plex Sans", system-ui, sans-serif;
  font-size: 0.9rem;
  font-weight: 700;
  margin-top: 24px;
  padding: 10px 15px;
  text-decoration: none;
}

.download-md:hover {
  background: color-mix(in srgb, var(--accent) 12%, transparent);
}

.article-content { font-size: 1.08rem; }

.article-content h2,
.article-content h3 {
  line-height: 1.15;
  margin-top: 2.2em;
}

.article-content p,
.article-content li { color: color-mix(in srgb, var(--text) 84%, var(--muted)); }

.article-content img {
  border: 1px solid var(--line);
  border-radius: 8px;
  display: block;
  height: auto;
  margin: 28px 0;
  max-width: 100%;
}

.article-content code {
  background: color-mix(in srgb, var(--accent) 16%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent) 28%, transparent);
  border-radius: 6px;
  color: var(--accent);
  font-family: "IBM Plex Mono", ui-monospace, SFMono-Regular, Consolas, monospace;
  font-size: 0.9em;
  padding: 0.15em 0.4em;
}

.article-content pre {
  background: var(--code);
  border: 1px solid color-mix(in srgb, var(--accent) 40%, var(--line));
  border-left: 3px solid var(--accent);
  border-radius: 0 8px 8px 0;
  box-shadow: inset 0 1px 0 color-mix(in srgb, var(--text) 8%, transparent);
  line-height: 1.6;
  margin: 28px 0;
  overflow-x: auto;
  padding: 22px;
  tab-size: 2;
  -moz-tab-size: 2;
}

.article-content pre code {
  background: transparent;
  border: 0;
  color: color-mix(in srgb, var(--text) 94%, var(--accent));
  display: block;
  font-size: 0.92rem;
  padding: 0;
  white-space: pre;
}

.article-content blockquote {
  background: color-mix(in srgb, var(--accent) 6%, transparent);
  border-left: 4px solid var(--accent);
  border-radius: 0 6px 6px 0;
  color: var(--muted);
  margin: 28px 0 28px 0;
  padding: 16px 18px;
}

.article-content table {
  border-collapse: collapse;
  border-radius: 8px;
  display: block;
  font-family: "IBM Plex Sans", system-ui, sans-serif;
  font-size: 0.96rem;
  margin: 28px 0;
  overflow: hidden;
  overflow-x: auto;
  width: 100%;
}

.article-content th,
.article-content td {
  border: 1px solid var(--line);
  padding: 12px 14px;
  text-align: left;
  vertical-align: top;
}

.article-content th {
  background: color-mix(in srgb, var(--panel-2) 78%, var(--accent) 22%);
  color: var(--text);
  font-weight: 700;
}

.article-content tr:nth-child(even) td {
  background: color-mix(in srgb, var(--panel) 80%, transparent);
}

.article-content tr:hover td {
  background: color-mix(in srgb, var(--accent) 8%, transparent);
}

@media (max-width: 700px) {
  .site-header,
  .section-title {
    align-items: flex-start;
    flex-direction: column;
    gap: 12px;
  }

  .month-heading { grid-template-columns: 1fr auto; }
  .month-heading span { grid-column: 1 / -1; }
}`;
}

function buildSiteFiles(owner: string, repo: string): SiteFile[] {
  return [
    {
      path: "_config.yml",
      content: `title: Evo Agent
description: Artigos e relatorios tecnicos gerados por um agente auto-aprimorante.
github_owner: ${owner}
github_repo: ${repo}
github_branch: gh-pages
markdown: kramdown
`,
    },
    { path: "_layouts/default.html", content: buildDefaultLayout() },
    { path: "_layouts/home.html", content: buildDefaultLayout() },
    { path: "_layouts/article.html", content: buildArticleLayout() },
    { path: "assets/site.css", content: buildSiteCss() },
  ];
}

async function upsertTextFile(
  owner: string,
  repo: string,
  branch: string,
  path: string,
  content: string,
  message: string,
) {
  let sha: string | undefined;
  try {
    const existing = await octokit.repos.getContent({
      owner,
      repo,
      path,
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
    path,
    message,
    content: Buffer.from(content).toString("base64"),
    branch,
    ...(sha ? { sha } : {}),
  });
}

async function ensureSiteScaffold(owner: string, repo: string, branch: string) {
  for (const file of buildSiteFiles(owner, repo)) {
    await upsertTextFile(
      owner,
      repo,
      branch,
      file.path,
      file.content,
      `chore: update site ${file.path}`,
    );
  }
}

export async function publishArticle(
  article: GeneratedArticle,
): Promise<string> {
  return publishToGithub(article, false);
}

export async function publishWeeklyReport(
  article: GeneratedArticle,
): Promise<string> {
  return publishToGithub(article, true);
}

async function publishToGithub(
  article: GeneratedArticle,
  isWeekly: boolean,
): Promise<string> {
  const { owner, repo, branch } = config.github;

  await ensureBranchExists(owner, repo, branch);
  await ensureSiteScaffold(owner, repo, branch);

  const folder = isWeekly ? "reports" : "articles";
  const prefix = isWeekly ? "weekly-" : "";
  const filePath = `${folder}/${prefix}${article.date}-${article.slug}.md`;
  const markdown = buildMarkdown(article);

  await upsertTextFile(
    owner,
    repo,
    branch,
    filePath,
    markdown,
    `${isWeekly ? "report" : "article"}: ${article.title}`,
  );

  const articleUrl = `https://${owner}.github.io/${repo}/${folder}/${prefix}${article.date}-${article.slug}`;

  await updateIndex(owner, repo, branch, article, articleUrl, isWeekly);

  db.savePublished(article.slug, article.title, articleUrl);
  log.info(
    `Published ${isWeekly ? "weekly report" : "article"}: ${articleUrl}`,
  );
  return articleUrl;
}

function parseExistingItems(current: string, newUrl: string) {
  const articles: PublishedItem[] = [];
  const reports: PublishedItem[] = [];
  const existingRows = current.match(/\| \d{4}-\d{2}-\d{2} \|[^\n]+/g) ?? [];
  const existingCards =
    current.match(/<article class="story-card">[\s\S]*?<\/article>/g) ?? [];

  for (const row of existingRows) {
    const m = row.match(/\| (\d{4}-\d{2}-\d{2}) \| \[(.+?)\]\((.+?)\) \|/);
    if (m && m[3] !== newUrl) {
      const item = { date: m[1], title: m[2], url: m[3] };
      if (m[3].includes("/reports/")) {
        reports.push(item);
      } else {
        articles.push(item);
      }
    }
  }

  for (const card of existingCards) {
    const date = card.match(/datetime="(\d{4}-\d{2}-\d{2})"/)?.[1];
    const link = card.match(/<h3><a href="(.+?)">(.+?)<\/a><\/h3>/);
    const kind = card.match(/<span>(Artigo|Relatorio)<\/span>/)?.[1];
    const summary = card.match(/<p>(.+?)<\/p>/)?.[1];
    if (date && link && link[1] !== newUrl) {
      const item = { date, title: link[2], url: link[1], summary };
      if (kind === "Relatorio" || link[1].includes("/reports/")) {
        reports.push(item);
      } else {
        articles.push(item);
      }
    }
  }

  return { articles, reports };
}

async function fetchTextFile(
  owner: string,
  repo: string,
  branch: string,
  path: string,
) {
  try {
    const existing = await octokit.repos.getContent({
      owner,
      repo,
      path,
      ref: branch,
    });
    if (!Array.isArray(existing.data) && "content" in existing.data) {
      return Buffer.from(existing.data.content, "base64").toString();
    }
  } catch {
    // file doesn't exist yet
  }
  return "";
}

function uniqueByUrl(items: PublishedItem[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.url)) return false;
    seen.add(item.url);
    return true;
  });
}

async function updateIndex(
  owner: string,
  repo: string,
  branch: string,
  newArticle: GeneratedArticle,
  newUrl: string,
  isWeekly: boolean,
) {
  const currentIndex = await fetchTextFile(owner, repo, branch, "index.md");
  const currentReadme = await fetchTextFile(owner, repo, branch, "README.md");
  const existing = parseExistingItems(
    `${currentIndex}\n${currentReadme}`,
    newUrl,
  );

  const newItem = {
    date: newArticle.date,
    title: newArticle.title,
    url: newUrl,
    summary: newArticle.summary,
    tags: newArticle.tags,
  };

  const dbArticles = isWeekly
    ? existing.articles
    : [newItem, ...existing.articles];
  const dbReports = isWeekly
    ? [newItem, ...existing.reports]
    : existing.reports;

  const indexContent = buildIndex(
    uniqueByUrl(dbArticles).slice(0, 80),
    uniqueByUrl(dbReports).slice(0, 24),
  );

  await upsertTextFile(
    owner,
    repo,
    branch,
    "index.md",
    indexContent,
    "chore: update article index",
  );
  await upsertTextFile(
    owner,
    repo,
    branch,
    "README.md",
    indexContent,
    "chore: update article index",
  );
}
