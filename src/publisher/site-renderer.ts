import { EBOOK_SLUG, type EbookResult } from "../agent/ebook.js";
import type { GeneratedArticle } from "../agent/writer.js";
import { escapeHtml } from "../utils/escape.js";
import { buildSiteCss } from "./styles/index.js";

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

/**
 * A double-quoted YAML scalar cannot hold a raw newline or control
 * character: one crawled title with either breaks the front matter and the
 * page stops building.
 */
function escapeYaml(value: string): string {
  return (
    value
      // biome-ignore lint/suspicious/noControlCharactersInRegex: stripping control chars is the point
      .replace(/[\u0000-\u001f\u007f-\u009f\u2028\u2029]/g, " ")
      .replace(/\\/g, "\\\\")
      .replace(/"/g, '\\"')
      .replace(/\s+/g, " ")
      .trim()
  );
}

/**
 * Article bodies are wrapped in {% raw %}, so only a literal endraw tag can
 * break out and hand the rest of the page to the Liquid parser. A zero-width
 * space defuses exactly that tag and leaves every other Liquid example in a
 * code block readable.
 */
function neutralizeEndRaw(content: string): string {
  return content.replace(
    /\{%-?\s*endraw\s*-?%\}/gi,
    (tag) => `{\u200b${tag.slice(1)}`,
  );
}

/** ~200 wpm is the standard estimate for technical reading in pt-BR. */
export function estimateReadingMinutes(content: string): number {
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

export function buildMarkdown(article: GeneratedArticle): string {
  return `---
layout: article
title: "${escapeYaml(article.title)}"
date: "${article.date}"
tags: [${article.tags.map((t) => `"${escapeYaml(t)}"`).join(", ")}]
summary: "${escapeYaml(article.summary)}"
reading_time: ${estimateReadingMinutes(article.content)}
---

{% raw %}
${neutralizeEndRaw(article.content)}
{% endraw %}

---
*Gerado por evo-agent - agente auto-aprimorante em ${article.date}.*
`;
}

export function buildEbookMarkdown(ebook: EbookResult): string {
  return `---
layout: article
title: "${escapeYaml(ebook.title)}"
date: "${ebook.date}"
tags: ["ebook", "ai-assisted-development", "handbook"]
summary: "${escapeYaml(ebook.summary)}"
---

{% raw %}
${neutralizeEndRaw(ebook.markdown)}
{% endraw %}
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

function buildArchiveJumpNav(groups: [string, PublishedItem[]][]): string {
  if (groups.length < 2) return "";
  const links = groups
    .map(([key]) => {
      const year = key.slice(0, 4);
      const month = formatMonth(`${key}-01`);
      return `<a href="#mes-${key}">${month.slice(0, 3).toLowerCase()} ${year}</a>`;
    })
    .join("");
  return `<nav class="archive-jump" aria-label="Ir para o mês">${links}</nav>`;
}

/** "2026-09-26" -> "26 set": the archive rows already sit under a month. */
function formatShortDate(date: string): string {
  const month = formatMonth(date).slice(0, 3).toLowerCase();
  return `${date.slice(8, 10)} ${month}`;
}

const MAX_VISIBLE_TAGS = 4;

function searchText(item: PublishedItem): string {
  return escapeHtml(
    `${item.title} ${(item.tags ?? []).join(" ")}`.toLowerCase(),
  );
}

function buildItemCard(item: PublishedItem) {
  const allTags = item.tags ?? [];
  const tags = allTags.length
    ? `<p class="story-tags">${allTags.slice(0, MAX_VISIBLE_TAGS).map(escapeHtml).join(", ")}</p>`
    : "";
  const summary = item.summary ? `<p>${escapeHtml(item.summary)}</p>` : "";

  return `<article class="story-card" data-search="${searchText(item)}">
  <time datetime="${item.date}">${formatShortDate(item.date)}</time>
  <div>
    <h3><a href="${escapeHtml(item.url)}">${escapeHtml(item.title)}</a></h3>
    ${summary}
    ${tags}
  </div>
</article>`;
}

function buildReportRow(item: PublishedItem, collapsed: boolean) {
  const hidden = collapsed ? ' class="is-collapsed" hidden' : "";
  return `<li data-search="${searchText(item)}"${hidden}><a href="${escapeHtml(item.url)}">${escapeHtml(item.title)}</a></li>`;
}

function buildLatest(articles: PublishedItem[]): string {
  const latest = [...articles].sort((a, b) => b.date.localeCompare(a.date))[0];
  if (!latest) return "";
  const summary = latest.summary ? `<p>${escapeHtml(latest.summary)}</p>` : "";
  return `<section class="latest" aria-labelledby="ultima-edicao">
  <h2 class="section-label" id="ultima-edicao">Última edição</h2>
  <a class="latest-card" href="${escapeHtml(latest.url)}">
    <time class="edition-date" datetime="${latest.date}"><span class="edition-day">${latest.date.slice(8, 10)}</span><span class="edition-month">${formatMonth(latest.date).toLowerCase()} ${latest.date.slice(0, 4)}</span></time>
    <div>
      <h3>${escapeHtml(latest.title)}</h3>
      ${summary}
      <span class="read-cta">Ler edição</span>
    </div>
  </a>
</section>`;
}

const VISIBLE_REPORTS = 6;

export function buildIndex(
  articles: PublishedItem[],
  weeklyReports: PublishedItem[],
) {
  const extraReportCount = weeklyReports.length - VISIBLE_REPORTS;
  const reportRows =
    weeklyReports.length > 0
      ? `<ul class="report-list" data-collapsible>
    ${weeklyReports.map((r, index) => buildReportRow(r, index >= VISIBLE_REPORTS)).join("\n    ")}
  </ul>`
      : '<p class="empty-state">Nenhum radar publicado ainda.</p>';
  const reportsToggle =
    extraReportCount > 0
      ? `<button type="button" class="show-more" data-show-more="relatorios">Ver todos (${weeklyReports.length})</button>`
      : "";

  const yearMonthGroups = groupByYearMonth(articles);
  const archiveJumpNav = buildArchiveJumpNav(yearMonthGroups);
  const articleGroups = yearMonthGroups
    .map(([key, items]) => {
      const year = key.slice(0, 4);
      const month = formatMonth(`${key}-01`);
      const count = `${items.length} ${items.length === 1 ? "edição" : "edições"}`;
      return `<section class="month-group" id="mes-${key}">
  <div class="month-heading"><h2>${month} <span>${year}</span></h2><p>${count}</p></div>
  ${items.map((a) => buildItemCard(a)).join("\n")}
</section>`;
    })
    .join("\n");

  return `---
layout: home
title: Evo Agent
---

<section class="masthead">
  <h1>Evo Agent</h1>
  <p class="lede">Edições diárias sobre IA aplicada ao desenvolvimento de software: modelos, agentes, ferramentas e o que a comunidade está relatando. Escritas por um agente que revisa o próprio trabalho a cada publicação.</p>
  <p class="masthead-count"><strong>${articles.length}</strong> edições e <strong>${weeklyReports.length}</strong> radares no arquivo</p>
</section>

${buildLatest(articles)}

<div class="home-grid">
  <aside class="home-aside">
    <section id="relatorios">
      <h2>Radar diário</h2>
      <p class="aside-note">Sinais coletados nas últimas 24h, sem edição.</p>
      ${reportRows}
      ${reportsToggle}
    </section>
    <section id="ebook">
      <h2>Ebook</h2>
      <p class="aside-note">Atualizado pelo agente a partir das fontes recentes.</p>
      <a class="ebook-link" href="{{ '/handbooks/${EBOOK_SLUG}' | relative_url }}">
        <strong>Guia Prático: Desenvolvimento de Software com IA</strong>
        <span>Boas práticas, ferramentas, fluxos com agentes, prompt e contexto, anti-padrões.</span>
      </a>
    </section>
  </aside>

  <section class="archive" id="arquivo">
    <h2>Arquivo</h2>
    <div class="search-box">
      <input type="search" id="story-search" placeholder="Buscar por título ou tag" aria-label="Buscar edições e radares por título ou tag">
      <p class="search-empty" id="search-empty" hidden>Nada encontrado. Tente outro termo ou uma tag, como "claude" ou "agents".</p>
    </div>
    ${archiveJumpNav}
    ${articleGroups || '<p class="empty-state">Nenhuma edição publicada ainda.</p>'}
  </section>
</div>
`;
}

// Both layouts shared one byte-for-byte copy of the head, header and scripts.
// A fix had to be applied twice or the two silently diverged, so the shared
// parts live here once.

/**
 * Liquid does not escape `{{ }}`, and titles/summaries originate from crawled
 * text run through an LLM. Every interpolation of page data goes through
 * `escape`; SUMMARY also collapses newlines so it stays a valid attribute.
 */
const TITLE = "{{ page.title | escape }}";
const SUMMARY =
  "{{ page.summary | default: site.description | strip_newlines | escape }}";

function buildHead(): string {
  return `    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${TITLE} | Evo Agent</title>
    <meta name="description" content="${SUMMARY}">
    <link rel="canonical" href="{{ page.url | absolute_url }}">
    <meta property="og:type" content="{% if page.date %}article{% else %}website{% endif %}">
    <meta property="og:site_name" content="{{ site.title | escape }}">
    <meta property="og:title" content="${TITLE}">
    <meta property="og:description" content="${SUMMARY}">
    <meta property="og:url" content="{{ page.url | absolute_url }}">
    <meta property="og:locale" content="pt_BR">
    <meta name="twitter:card" content="summary">
    <meta name="twitter:title" content="${TITLE}">
    <meta name="twitter:description" content="${SUMMARY}">
    {% if page.date %}<meta property="article:published_time" content="{{ page.date | date_to_xmlschema }}">{% endif %}
    <link rel="alternate" type="application/atom+xml" title="{{ site.title | escape }}" href="{{ '/feed.xml' | relative_url }}">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600&family=Literata:opsz,wght@7..72,400;7..72,600&family=Schibsted+Grotesk:wght@500;600;700;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="{{ '/assets/site.css?v=10' | relative_url }}">
    <script>
      // Runs before first paint: applies the theme and stamps the toggle's own
      // label, so the button never claims the opposite of what is rendered.
      (function () {
        var saved = null;
        try { saved = localStorage.getItem("evo-agent-theme"); } catch (e) {}
        var systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        document.documentElement.dataset.theme = saved || (systemDark ? "dark" : "light");
      })();
    </script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.1/highlight.min.js"></script>`;
}

function buildSiteNav(): string {
  return `    <header class="site-header">
      <a class="brand" href="{{ '/' | relative_url }}">Evo Agent</a>
      <nav aria-label="Principal">
        <a href="{{ '/' | relative_url }}#arquivo">Arquivo</a>
        <a href="{{ '/' | relative_url }}#relatorios">Radar</a>
        <a href="{{ '/' | relative_url }}#ebook">Ebook</a>
        <a href="https://github.com/{{ site.github_owner }}/{{ site.github_repo }}">GitHub</a>
        <button class="theme-toggle" type="button" data-theme-toggle aria-pressed="false" aria-label="Alternar tema claro e escuro">Claro</button>
      </nav>
    </header>`;
}

function buildThemeScript(): string {
  return `    <script>
      const themeButton = document.querySelector("[data-theme-toggle]");
      const setTheme = (theme) => {
        document.documentElement.dataset.theme = theme;
        try { localStorage.setItem("evo-agent-theme", theme); } catch (e) {}
        if (themeButton) {
          themeButton.textContent = theme === "dark" ? "Claro" : "Escuro";
          themeButton.setAttribute("aria-pressed", theme === "dark" ? "true" : "false");
        }
      };
      setTheme(document.documentElement.dataset.theme || "dark");
      themeButton?.addEventListener("click", () => {
        setTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark");
      });
    </script>`;
}

function buildIndexScript(): string {
  return `    <script>
      document.querySelectorAll("[data-show-more]").forEach(function(btn) {
        btn.addEventListener("click", function() {
          var grid = btn.previousElementSibling;
          grid.querySelectorAll(".is-collapsed").forEach(function(card) {
            card.hidden = false;
          });
          btn.remove();
        });
      });

      var searchInput = document.getElementById("story-search");
      if (searchInput) {
        var emptyState = document.getElementById("search-empty");
        searchInput.addEventListener("input", function() {
          var query = searchInput.value.trim().toLowerCase();
          var anyVisible = false;
          document.querySelectorAll("[data-search]").forEach(function(card) {
            var matches = !query || card.dataset.search.includes(query);
            card.style.display = matches ? "" : "none";
            // A collapsed radar row carries [hidden]; a match must still surface.
            if (query && matches) card.hidden = false;
            if (matches) anyVisible = true;
          });
          document.querySelectorAll(".month-group").forEach(function(group) {
            var hasVisible = Array.prototype.some.call(
              group.querySelectorAll("[data-search]"),
              function(card) { return card.style.display !== "none"; },
            );
            group.style.display = hasVisible ? "" : "none";
          });
          if (emptyState) emptyState.hidden = anyVisible;
        });
      }

      var backToTop = document.createElement("button");
      backToTop.type = "button";
      backToTop.className = "back-to-top";
      backToTop.textContent = "\\u2191";
      backToTop.setAttribute("aria-label", "Voltar ao topo");
      backToTop.addEventListener("click", function() {
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
      document.body.appendChild(backToTop);
      window.addEventListener("scroll", function() {
        backToTop.classList.toggle("visible", window.scrollY > 600);
      });
    </script>`;
}

/**
 * Kept out of the mermaid module: a CDN failure there must not cost the
 * reader the table of contents or the source markers.
 */
function buildReaderScript(): string {
  return `    <script>
      (function () {
        var content = document.querySelector(".article-content");
        if (!content) return;
        content.querySelectorAll("p > em:only-child").forEach(function (em) {
          var first = em.firstElementChild;
          if (!first || first.tagName !== "A" || em.parentElement.children.length !== 1) return;
          var p = em.parentElement;
          var text = em.textContent.trim();
          p.classList.add("source-line");
          if (/fonte primária$/.test(text)) p.classList.add("is-primary");
          else if (/sinal da comunidade$/.test(text)) p.classList.add("is-community");
        });

        var toc = document.querySelector("[data-toc]");
        var heads = Array.prototype.filter.call(
          content.querySelectorAll("h2[id], h4[id]"),
          function (h) { return h.textContent.trim(); },
        );
        if (!toc || heads.length < 4) return;
        var list = document.createElement("ul");
        var links = heads.map(function (h) {
          var li = document.createElement("li");
          li.className = h.tagName === "H2" ? "toc-h2" : "toc-h4";
          var a = document.createElement("a");
          a.href = "#" + h.id;
          a.textContent = h.textContent.trim();
          li.appendChild(a);
          list.appendChild(li);
          return a;
        });
        toc.appendChild(list);
        if (content.querySelector(".source-line.is-primary, .source-line.is-community")) {
          var legend = document.createElement("p");
          legend.className = "toc-legend";
          [["is-primary", "Fonte primária"], ["is-community", "Sinal da comunidade"]].forEach(function (entry) {
            var span = document.createElement("span");
            span.className = entry[0];
            span.textContent = entry[1];
            legend.appendChild(span);
          });
          toc.appendChild(legend);
        }
        toc.hidden = false;
        toc.open = window.matchMedia("(min-width: 1001px)").matches;

        if (!("IntersectionObserver" in window)) return;
        var observer = new IntersectionObserver(function (entries) {
          entries.forEach(function (entry) {
            if (!entry.isIntersecting) return;
            links.forEach(function (a) {
              a.setAttribute("aria-current", a.hash === "#" + entry.target.id ? "true" : "false");
            });
          });
        }, { rootMargin: "-90px 0px -70% 0px" });
        heads.forEach(function (h) { observer.observe(h); });
      })();
    </script>`;
}

function buildContentScript(): string {
  return `    <script type="module">
      import mermaid from "https://cdn.jsdelivr.net/npm/mermaid@11.4.1/dist/mermaid.esm.min.mjs";
      var isDark = document.documentElement.dataset.theme !== "light";
      mermaid.initialize({ startOnLoad: false, theme: isDark ? "dark" : "default", securityLevel: "strict" });
      document.querySelectorAll('[class*="language-mermaid"]').forEach(function(node) {
        var codeEl = node.matches("code") ? node : node.querySelector("code");
        var text = (codeEl ? codeEl.textContent : node.textContent) || "";
        var wrapper = document.createElement("div");
        wrapper.className = "mermaid-wrapper";
        var holder = document.createElement("pre");
        holder.className = "mermaid";
        holder.textContent = text;
        wrapper.appendChild(holder);
        var target = node.closest(".highlighter-rouge, div[class*='language-'], pre") || node;
        target.replaceWith(wrapper);
      });
      try { await mermaid.run({ querySelector: "pre.mermaid, .mermaid" }); } catch (e) {}
      hljs.configure({ cssSelector: "pre code:not(.language-mermaid)" });
      hljs.highlightAll();
      document.querySelectorAll("div[class*=language-]").forEach(function(div) {
        var match = div.className.match(/language-(\\w+)/);
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
        btn.type = "button";
        btn.textContent = "Copiar";
        btn.setAttribute("aria-label", "Copiar bloco de codigo");
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
    </script>`;
}

function buildLayout(main: string): string {
  return `<!doctype html>
<html lang="pt-BR">
  <head>
${buildHead()}
  </head>
  <body>
    <a class="skip-link" href="#conteudo">Pular para o conteúdo</a>
${buildSiteNav()}
    <main id="conteudo">
${main}
    </main>
${buildThemeScript()}
${buildReaderScript()}
${buildContentScript()}
${buildIndexScript()}
  </body>
</html>`;
}

export function buildDefaultLayout() {
  return buildLayout("      {{ content }}");
}

export function buildArticleLayout() {
  return buildLayout(`      {% assign month_index = page.date | date: "%-m" | minus: 1 %}
      {% assign month_names = "janeiro fevereiro março abril maio junho julho agosto setembro outubro novembro dezembro" | split: " " %}
      <article class="article-shell">
        <header class="article-hero">
          <a class="back-link" href="{{ '/' | relative_url }}#arquivo">&larr; Todas as edições</a>
          <div class="article-masthead">
            <time class="edition-date" datetime="{{ page.date | date: '%Y-%m-%d' }}"><span class="edition-day">{{ page.date | date: "%d" }}</span><span class="edition-month">{{ month_names[month_index] }} {{ page.date | date: "%Y" }}</span></time>
            <div>
              <h1>${TITLE}</h1>
              {% if page.summary %}<p class="article-summary">{{ page.summary | escape }}</p>{% endif %}
              <div class="article-meta">
                {% if page.reading_time %}<span>{{ page.reading_time }} min de leitura</span>{% endif %}
                <a class="download-md" href="https://raw.githubusercontent.com/{{ site.github_owner }}/{{ site.github_repo }}/{{ site.github_branch | default: 'gh-pages' }}/{{ page.path }}" download rel="noopener">Baixar Markdown</a>
              </div>
              {% if page.tags %}<p class="article-tags">Tags: {{ page.tags | join: ", " | escape }}</p>{% endif %}
            </div>
          </div>
        </header>
        <div class="article-body">
          <details class="article-toc" data-toc hidden>
            <summary>Nesta edição</summary>
          </details>
          <div class="article-content">
            {{ content }}
          </div>
        </div>
      </article>`);
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
plugins:
  - jekyll-feed
  - jekyll-sitemap
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
