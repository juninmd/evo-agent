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
layout: post
title: "${escapeYaml(article.title)}"
date: "${article.date}"
tags: [${article.tags.map((t) => `"${escapeYaml(t)}"`).join(", ")}]
author: Evo Agent
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
layout: default
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

export function buildDefaultLayout() {
  // kept for backward compatibility
  return "";
}

export function buildArticleLayout() {
  // kept for backward compatibility
  return "";
}

export function buildSiteCss() {
  return `/* Index page custom vars */
:root {
  --card-bg: #ffffff;
  --card-border: #d0d7de;
  --hero-text: #1f2328;
  --hero-muted: #656d76;
  --hero-accent: #0969da;
  --hero-hot: #9a6700;
  --hero-line: #d0d7de;
  --panel: #f6f8fa;
}

:root[data-theme="dark"] {
  --card-bg: #111723;
  --card-border: #293346;
  --hero-text: #f4f0e8;
  --hero-muted: #a9b0bd;
  --hero-accent: #5eead4;
  --hero-hot: #ffbf69;
  --hero-line: #293346;
  --panel: #111723;
}

/* ====== DARK MODE OVERRIDES FOR MINIMA ====== */
:root[data-theme="dark"] {
  color-scheme: dark;
}

:root[data-theme="dark"] body {
  background-color: #080a0f;
  color: #f4f0e8;
}

:root[data-theme="dark"] a { color: #5eead4; }
:root[data-theme="dark"] a:hover { color: #8bf4e5; }

:root[data-theme="dark"] .site-header {
  background-color: #111723;
  border-top-color: #293346;
  border-bottom-color: #293346;
}

:root[data-theme="dark"] .site-title,
:root[data-theme="dark"] .site-title:visited {
  color: #5eead4;
}

:root[data-theme="dark"] .site-nav .page-link {
  color: #a9b0bd;
}

:root[data-theme="dark"] .site-nav .page-link:hover {
  color: #f4f0e8;
}

:root[data-theme="dark"] .site-nav .menu-icon svg path {
  fill: #a9b0bd;
}

:root[data-theme="dark"] .site-nav .nav-trigger:checked + label + .trigger {
  background-color: #111723;
  border-color: #293346;
}

:root[data-theme="dark"] .post-title { color: #f4f0e8; }
:root[data-theme="dark"] .post-meta { color: #a9b0bd; }

:root[data-theme="dark"] .post-content,
:root[data-theme="dark"] .page-content { color: #f4f0e8; }

:root[data-theme="dark"] .post-content h1,
:root[data-theme="dark"] .post-content h2,
:root[data-theme="dark"] .post-content h3,
:root[data-theme="dark"] .post-content h4 { color: #f4f0e8; }

:root[data-theme="dark"] .post-content h2 {
  border-bottom: 1px solid #293346;
  padding-bottom: 0.3em;
}

:root[data-theme="dark"] .post-content code {
  background-color: #182232;
  color: #5eead4;
}

:root[data-theme="dark"] .post-content pre {
  background-color: #0d1117;
  border: 1px solid #293346;
}

:root[data-theme="dark"] .post-content pre code {
  background-color: transparent;
  color: #f4f0e8;
}

:root[data-theme="dark"] .post-content blockquote {
  border-left-color: #5eead4;
  color: #a9b0bd;
}

:root[data-theme="dark"] .post-content hr {
  border-color: #293346;
}

:root[data-theme="dark"] .post-content table th,
:root[data-theme="dark"] .post-content table td {
  border-color: #293346;
}

:root[data-theme="dark"] .post-content table th {
  background-color: #182232;
}

:root[data-theme="dark"] .post-content table tr:nth-child(even) td {
  background-color: #111723;
}

:root[data-theme="dark"] .site-footer {
  background-color: #111723;
  border-top-color: #293346;
}

:root[data-theme="dark"] .site-footer,
:root[data-theme="dark"] .site-footer a,
:root[data-theme="dark"] .site-footer .footer-heading {
  color: #a9b0bd;
}

:root[data-theme="dark"] .site-footer a:hover {
  color: #f4f0e8;
}

:root[data-theme="dark"] .wrapper hr {
  border-color: #293346;
}

/* ====== INDEX PAGE CUSTOM STYLES ====== */

.hero {
  border-bottom: 1px solid var(--hero-line);
  margin-bottom: 48px;
  padding: 52px 0 44px;
}

.kicker,
.section-title p,
.story-meta,
.chips {
  color: var(--hero-muted);
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
  color: var(--hero-muted);
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
  border: 1px solid var(--hero-line);
  border-radius: 999px;
  color: var(--hero-muted);
  padding: 7px 12px;
}

.hero-stats strong { color: var(--hero-accent); }

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
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 8px;
  padding: 22px;
  transition: border-color 160ms ease, transform 160ms ease;
}

.story-card:hover {
  border-color: var(--hero-accent);
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
.story-card h3 a:hover { color: var(--hero-accent); }

.story-card p {
  color: var(--hero-muted);
  margin: 0 0 16px;
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.month-group {
  border-top: 1px solid var(--hero-line);
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
  color: var(--hero-hot);
  font-family: "IBM Plex Mono", ui-monospace, SFMono-Regular, Consolas, monospace;
}

.empty-state {
  border: 1px dashed var(--hero-line);
  color: var(--hero-muted);
  padding: 24px;
}

/* ====== THEME TOGGLE ====== */

.theme-toggle {
  background: transparent;
  border: 1px solid var(--hero-line);
  border-radius: 999px;
  color: var(--hero-text);
  cursor: pointer;
  font-family: inherit;
  font-size: 0.75rem;
  margin-left: 12px;
  padding: 4px 10px;
  text-transform: uppercase;
  vertical-align: middle;
}

.theme-toggle:hover {
  border-color: var(--hero-accent);
  color: var(--hero-accent);
}

/* ====== HEADING ANCHORS ====== */

.heading-anchor {
  color: var(--hero-accent);
  font-family: "IBM Plex Mono", ui-monospace, SFMono-Regular, Consolas, monospace;
  font-size: 0.85em;
  margin-left: 6px;
  opacity: 0;
  text-decoration: none;
  transition: opacity 0.15s ease;
}

.post-content h2:hover .heading-anchor,
.post-content h3:hover .heading-anchor,
.post-content h4:hover .heading-anchor {
  opacity: 1;
}

.heading-anchor:hover {
  opacity: 1 !important;
}

/* ====== COPY BUTTON ====== */

.copy-btn {
  background: var(--panel);
  border: 1px solid var(--card-border);
  border-radius: 6px;
  color: var(--hero-muted);
  cursor: pointer;
  font-family: system-ui, sans-serif;
  font-size: 0.7rem;
  font-weight: 600;
  opacity: 0;
  padding: 4px 8px;
  position: absolute;
  right: 8px;
  text-transform: uppercase;
  top: 8px;
  transition: opacity 0.18s ease, border-color 0.18s ease, color 0.18s ease;
  z-index: 1;
}

pre:hover .copy-btn,
.copy-btn:focus-visible {
  opacity: 1;
}

.copy-btn:hover {
  border-color: var(--hero-accent);
  color: var(--hero-accent);
}

.copy-btn.copied {
  border-color: var(--hero-accent);
  color: var(--hero-accent);
  opacity: 1;
}

pre {
  position: relative;
}

.language-label {
  background: var(--panel);
  border: 1px solid var(--card-border);
  border-radius: 0 0 6px 6px;
  color: var(--hero-muted);
  font-family: "IBM Plex Mono", ui-monospace, SFMono-Regular, Consolas, monospace;
  font-size: 0.65rem;
  padding: 2px 10px;
  position: absolute;
  right: 12px;
  text-transform: uppercase;
  top: 0;
}

/* ====== SYNTAX HIGHLIGHTING (dark theme) ====== */

:root[data-theme="dark"] .hljs,
:root[data-theme="dark"] .highlight .nx { color: #f4f0e8; background: transparent; }
:root[data-theme="dark"] .hljs-keyword,
:root[data-theme="dark"] .hljs-selector-tag,
:root[data-theme="dark"] .hljs-section,
:root[data-theme="dark"] .hljs-title.class_,
:root[data-theme="dark"] .highlight .kd,
:root[data-theme="dark"] .highlight .kc,
:root[data-theme="dark"] .highlight .kn { color: #5eead4; }
:root[data-theme="dark"] .hljs-string,
:root[data-theme="dark"] .hljs-selector-attr,
:root[data-theme="dark"] .hljs-selector-pseudo,
:root[data-theme="dark"] .hljs-addition,
:root[data-theme="dark"] .highlight .s1,
:root[data-theme="dark"] .highlight .s2,
:root[data-theme="dark"] .highlight .sr { color: #ffbf69; }
:root[data-theme="dark"] .hljs-comment,
:root[data-theme="dark"] .hljs-quote,
:root[data-theme="dark"] .highlight .c1,
:root[data-theme="dark"] .highlight .cm { color: #a9b0bd; font-style: italic; }
:root[data-theme="dark"] .hljs-title.function_,
:root[data-theme="dark"] .hljs-title,
:root[data-theme="dark"] .highlight .nf,
:root[data-theme="dark"] .highlight .nc { color: #8bf4e5; }
:root[data-theme="dark"] .hljs-built_in,
:root[data-theme="dark"] .hljs-literal,
:root[data-theme="dark"] .hljs-type,
:root[data-theme="dark"] .hljs-params,
:root[data-theme="dark"] .highlight .nb,
:root[data-theme="dark"] .highlight .kt,
:root[data-theme="dark"] .highlight .no { color: #ffbf69; }
:root[data-theme="dark"] .hljs-number,
:root[data-theme="dark"] .hljs-attr,
:root[data-theme="dark"] .hljs-attribute,
:root[data-theme="dark"] .highlight .mi,
:root[data-theme="dark"] .highlight .mh,
:root[data-theme="dark"] .highlight .mf { color: #5eead4; }
:root[data-theme="dark"] .hljs-meta,
:root[data-theme="dark"] .hljs-tag,
:root[data-theme="dark"] .highlight .o,
:root[data-theme="dark"] .highlight .p,
:root[data-theme="dark"] .highlight .dl { color: #a9b0bd; }
:root[data-theme="dark"] .hljs-deletion { color: #bf7a3a; }
:root[data-theme="dark"] .highlight .err { color: #ffbf69; }
:root[data-theme="dark"] .highlight .gh { color: #5eead4; font-weight: 700; }
:root[data-theme="dark"] .highlight .gu { color: #5eead4; }
:root[data-theme="dark"] .highlight .ge { font-style: italic; }
:root[data-theme="dark"] .highlight .gs { font-weight: 700; }

@media (max-width: 700px) {
  .section-title {
    align-items: flex-start;
    flex-direction: column;
    gap: 12px;
  }

  .month-heading { grid-template-columns: 1fr auto; }
  .month-heading span { grid-column: 1 / -1; }
}`;
}

function buildHeadInclude() {
  return `<head>
  <meta charset="utf-8">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  {%- seo -%}
  <link rel="stylesheet" href="{{ "/assets/main.css" | relative_url }}">
  <link rel="stylesheet" href="{{ '/assets/site.css?v=3' | relative_url }}">
  {%- feed_meta -%}
  {%- if jekyll.environment == 'production' and site.google_analytics -%}
    {%- include google-analytics.html -%}
  {%- endif -%}
  <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.1/highlight.min.js"></script>
  <script>
    const savedTheme = localStorage.getItem("evo-agent-theme");
    const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.dataset.theme = savedTheme || (systemDark ? "dark" : "light");
  </script>
</head>`;
}

function buildFooterInclude() {
  return `<footer class="site-footer h-card">
  <data class="u-url" href="{{ "/" | relative_url }}"></data>
  <div class="wrapper">
    <div class="footer-col-wrapper">
      <div class="footer-col footer-col-1">
        <ul class="contact-list">
          <li class="p-name">{{ site.title | escape }}</li>
        </ul>
      </div>
      <div class="footer-col footer-col-3">
        <p>{{- site.description | escape -}}</p>
      </div>
    </div>
  </div>
</footer>
<script>
  (function() {
    var toggle = document.createElement("button");
    toggle.className = "theme-toggle";
    toggle.type = "button";
    toggle.setAttribute("data-theme-toggle", "");
    var nav = document.querySelector(".site-nav") || document.querySelector(".trigger");
    if (nav) {
      nav.parentNode.insertBefore(toggle, nav);
    } else {
      document.querySelector(".wrapper").appendChild(toggle);
    }
    var setTheme = function(theme) {
      document.documentElement.dataset.theme = theme;
      localStorage.setItem("evo-agent-theme", theme);
      toggle.textContent = theme === "dark" ? "Claro" : "Escuro";
    };
    setTheme(document.documentElement.dataset.theme || "dark");
    toggle.addEventListener("click", function() {
      setTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark");
    });
  })();
</script>
<script>
  hljs.configure({ cssSelector: "pre code" });
  document.querySelectorAll("pre code").forEach(function(block) {
    block.textContent = block.textContent;
  });
  hljs.highlightAll();
  document.querySelectorAll("div[class*=language-]").forEach(function(div) {
    var match = div.className.match(/language-(\\w+)/);
    if (match && match[1] !== "plaintext") {
      var label = document.createElement("span");
      label.className = "language-label";
      label.textContent = match[1];
      var pre = div.querySelector("pre");
      if (pre) pre.parentNode.insertBefore(label, pre);
    }
  });
  document.querySelectorAll("pre").forEach(function(pre) {
    var btn = document.createElement("button");
    btn.className = "copy-btn";
    btn.textContent = "Copiar";
    btn.addEventListener("click", function() {
      var code = pre.querySelector("code");
      var text = code ? code.innerText : pre.innerText;
      navigator.clipboard.writeText(text).then(function() {
        btn.textContent = "Copiado!";
        btn.classList.add("copied");
        setTimeout(function() {
          btn.textContent = "Copiar";
          btn.classList.remove("copied");
        }, 1400);
      }).catch(function() {});
    });
    pre.appendChild(btn);
  });
  document.querySelectorAll(".post-content h2[id], .post-content h3[id], .post-content h4[id]").forEach(function(h) {
    var a = document.createElement("a");
    a.className = "heading-anchor";
    a.href = "#" + h.id;
    a.setAttribute("aria-label", "Copiar link para " + h.textContent);
    a.textContent = "#";
    a.addEventListener("click", function(e) {
      e.preventDefault();
      navigator.clipboard.writeText(window.location.href.split("#")[0] + "#" + h.id).then(function() {
        a.textContent = "Copiado!";
        setTimeout(function() { a.textContent = "#"; }, 1400);
      }).catch(function() {});
    });
    h.appendChild(a);
  });
</script>`;
}

function buildSiteFiles(owner: string, repo: string): SiteFile[] {
  return [
    {
      path: "_config.yml",
      content: `title: Evo Agent
description: Artigos e relatorios tecnicos gerados por um agente auto-aprimorante.
theme: minima
github_owner: ${owner}
github_repo: ${repo}
github_branch: gh-pages
markdown: kramdown
`,
    },
    { path: "_includes/head.html", content: buildHeadInclude() },
    { path: "_includes/footer.html", content: buildFooterInclude() },
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

  try {
    const legacyIndex = await octokit.repos.getContent({
      owner,
      repo,
      path: "index.html",
      ref: branch,
    });
    if (!Array.isArray(legacyIndex.data) && "sha" in legacyIndex.data) {
      await octokit.repos.deleteFile({
        owner,
        repo,
        path: "index.html",
        message: "fix: remove legacy index.html, index.md is the source",
        branch,
        sha: legacyIndex.data.sha,
      });
      log.info("Removed legacy index.html from gh-pages");
    }
  } catch {
    // index.html doesn't exist — nothing to do
  }

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
