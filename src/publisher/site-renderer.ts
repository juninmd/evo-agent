import type { GeneratedArticle } from "../agent/writer.js";
import { escapeHtml } from "../utils/escape.js";

export type PublishedItem = {
  date: string;
  title: string;
  url: string;
  summary?: string;
  tags?: string[];
};

export type SiteFile = {
  path: string;
  content: string;
};

function escapeYaml(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

export function buildMarkdown(article: GeneratedArticle): string {
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
    ? `<div class="chips">${item.tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}</div>`
    : "";
  const summary = item.summary ? `<p>${escapeHtml(item.summary)}</p>` : "";

  return `<article class="story-card">
  <div class="story-meta"><time datetime="${item.date}">${item.date}</time><span>${kind}</span></div>
  <h3><a href="${escapeHtml(item.url)}">${escapeHtml(item.title)}</a></h3>
  ${summary}
  ${tags}
</article>`;
}

export function buildIndex(
  articles: PublishedItem[],
  weeklyReports: PublishedItem[],
) {
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

export function buildDefaultLayout() {
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
    <link rel="stylesheet" href="{{ '/assets/site.css?v=4' | relative_url }}">
    <script>
      const savedTheme = localStorage.getItem("evo-agent-theme");
      const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      document.documentElement.dataset.theme = savedTheme || (systemDark ? "dark" : "light");
    </script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.1/highlight.min.js"></script>
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
    <script type="module">
      import mermaid from "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs";
      var isDark = document.documentElement.dataset.theme !== "light";
      mermaid.initialize({ startOnLoad: false, theme: isDark ? "dark" : "default", securityLevel: "strict" });
      // kramdown/rouge wraps fenced mermaid as <div class="language-mermaid ...">...<code>...; some engines as <code class="language-mermaid">. Handle both, hand mermaid the raw source.
      document.querySelectorAll('[class*="language-mermaid"]').forEach(function(node) {
        var codeEl = node.matches("code") ? node : node.querySelector("code");
        var holder = document.createElement("pre");
        holder.className = "mermaid";
        holder.textContent = (codeEl ? codeEl.textContent : node.textContent);
        node.replaceWith(holder);
      });
      try { await mermaid.run({ querySelector: "pre.mermaid" }); } catch (e) {}
      hljs.configure({ cssSelector: "pre code:not(.language-mermaid)" });
      hljs.highlightAll();
      document.querySelectorAll("div[class*=language-]").forEach(function(div) {
        var match = div.className.match(/language-(\w+)/);
        if (match && match[1] !== "plaintext" && match[1] !== "mermaid") {
          var label = document.createElement("span");
          label.className = "language-label";
          label.textContent = match[1];
          var pre = div.querySelector("pre");
          if (pre) pre.parentNode.insertBefore(label, pre);
        }
      });
      document.querySelectorAll("pre:not(.mermaid)").forEach(function(pre) {
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
    </script>
  </body>
</html>`;
}

export function buildArticleLayout() {
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
    <link rel="stylesheet" href="{{ '/assets/site.css?v=4' | relative_url }}">
    <script>
      const savedTheme = localStorage.getItem("evo-agent-theme");
      const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      document.documentElement.dataset.theme = savedTheme || (systemDark ? "dark" : "light");
    </script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.1/highlight.min.js"></script>
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
    <script type="module">
      import mermaid from "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs";
      var isDark = document.documentElement.dataset.theme !== "light";
      mermaid.initialize({ startOnLoad: false, theme: isDark ? "dark" : "default", securityLevel: "strict" });
      // kramdown/rouge wraps fenced mermaid as <div class="language-mermaid ...">...<code>...; some engines as <code class="language-mermaid">. Handle both, hand mermaid the raw source.
      document.querySelectorAll('[class*="language-mermaid"]').forEach(function(node) {
        var codeEl = node.matches("code") ? node : node.querySelector("code");
        var holder = document.createElement("pre");
        holder.className = "mermaid";
        holder.textContent = (codeEl ? codeEl.textContent : node.textContent);
        node.replaceWith(holder);
      });
      try { await mermaid.run({ querySelector: "pre.mermaid" }); } catch (e) {}
      hljs.configure({ cssSelector: "pre code:not(.language-mermaid)" });
      hljs.highlightAll();
      document.querySelectorAll("div[class*=language-]").forEach(function(div) {
        var match = div.className.match(/language-(\w+)/);
        if (match && match[1] !== "plaintext" && match[1] !== "mermaid") {
          var label = document.createElement("span");
          label.className = "language-label";
          label.textContent = match[1];
          var pre = div.querySelector("pre");
          if (pre) pre.parentNode.insertBefore(label, pre);
        }
      });
      document.querySelectorAll("pre:not(.mermaid)").forEach(function(pre) {
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
  --bg: #ffffff;
  --panel: #f6f8fa;
  --panel-2: #eaeef2;
  --text: #1f2328;
  --muted: #656d76;
  --line: #d0d7de;
  --accent: #0969da;
  --hot: #9a6700;
  --code: #f6f8fa;
}

:root[data-theme="dark"] {
  color-scheme: dark;
}

:root[data-theme="light"] body {
  background: var(--bg);
}

:root[data-theme="light"] .story-card {
  background: var(--panel);
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
  background: color-mix(in srgb, var(--bg) 82%, transparent);
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
  border-color: color-mix(in srgb, var(--accent) 55%, transparent);
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
  border: 1px solid color-mix(in srgb, var(--accent) 45%, transparent);
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

.article-content > h1 { display: none; }

.article-content h2 {
  border-bottom: 1px solid var(--line);
  font-size: 1.55rem;
  padding-bottom: 0.3em;
}

.article-content h3 { font-size: 1.2rem; }

.article-content h2,
.article-content h3 {
  line-height: 1.15;
  margin-top: 2.2em;
}

.article-content hr {
  border: 0;
  border-top: 1px solid var(--line);
  margin: 36px 0;
}

.article-content p,
.article-content li { color: color-mix(in srgb, var(--text) 84%, var(--muted)); }

.article-content img {
  border: 1px solid var(--line);
  border-radius: 8px;
  display: block;
  height: auto;
  margin: 28px auto;
  max-height: 70vh;
  max-width: 100%;
}

.article-content .highlight { margin: 28px 0; }

.article-content pre.mermaid {
  background: transparent;
  border: 0;
  box-shadow: none;
  margin: 28px 0;
  padding: 0;
  text-align: center;
}

.article-content pre {
  background: var(--code);
  border: 1px solid color-mix(in srgb, var(--accent) 40%, var(--line));
  border-left: 3px solid var(--accent);
  border-radius: 0 8px 8px 0;
  box-shadow: inset 0 1px 0 color-mix(in srgb, var(--text) 8%, transparent);
  line-height: 1.6;
  margin: 0;
  overflow-x: auto;
  padding: 22px;
  position: relative;
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

.copy-btn {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 6px;
  color: var(--muted);
  cursor: pointer;
  font-family: "IBM Plex Sans", system-ui, sans-serif;
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
  border-color: var(--accent);
  color: var(--accent);
}

.copy-btn.copied {
  border-color: var(--accent);
  color: var(--accent);
  opacity: 1;
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

.hljs,
.highlight .nx { color: var(--text); background: transparent; }
.hljs-keyword,
.hljs-selector-tag,
.hljs-section,
.hljs-title.class_,
.highlight .kd,
.highlight .kc,
.highlight .kn { color: var(--accent); }
.hljs-string,
.hljs-selector-attr,
.hljs-selector-pseudo,
.hljs-addition,
.highlight .s1,
.highlight .s2,
.highlight .sr { color: color-mix(in srgb, var(--hot) 90%, var(--text)); }
.hljs-comment,
.hljs-quote,
.highlight .c1,
.highlight .cm { color: var(--muted); font-style: italic; }
.hljs-title.function_,
.hljs-title,
.highlight .nf,
.highlight .nc { color: color-mix(in srgb, var(--accent) 85%, var(--text)); }
.hljs-built_in,
.hljs-literal,
.hljs-type,
.hljs-params,
.highlight .nb,
.highlight .kt,
.highlight .no { color: var(--hot); }
.hljs-number,
.hljs-attr,
.hljs-attribute,
.highlight .mi,
.highlight .mh,
.highlight .mf { color: var(--accent); }
.hljs-meta,
.hljs-tag,
.highlight .o,
.highlight .p,
.highlight .dl { color: var(--muted); }
.hljs-deletion { color: color-mix(in srgb, var(--hot) 60%, var(--bg)); }
.highlight .err { color: var(--hot); }
.highlight .gh { color: var(--accent); font-weight: 700; }
.highlight .gu { color: var(--accent); }
.highlight .ge { font-style: italic; }
.highlight .gs { font-weight: 700; }

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

export function buildSiteFiles(
  owner: string,
  repo: string,
  branch: string,
): SiteFile[] {
  return [
    {
      path: "_config.yml",
      content: `title: Evo Agent
description: Artigos e relatorios tecnicos gerados por um agente auto-aprimorante.
github_owner: ${owner}
github_repo: ${repo}
github_branch: ${branch}
markdown: kramdown
`,
    },
    { path: "_layouts/default.html", content: buildDefaultLayout() },
    { path: "_layouts/home.html", content: buildDefaultLayout() },
    { path: "_layouts/article.html", content: buildArticleLayout() },
    { path: "assets/site.css", content: buildSiteCss() },
  ];
}

export function uniqueByUrl(items: PublishedItem[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.url)) return false;
    seen.add(item.url);
    return true;
  });
}
