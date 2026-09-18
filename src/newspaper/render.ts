import { escapeHtml } from "../utils/escape.js";
import type { Desk, Edition, Story } from "./edition.js";
import { inlineHtml } from "./inline.js";
import { FONTS_HREF, NEWSPAPER_CSS } from "./styles.js";

export const NEWSPAPER_NAME = "Gazeta dos Agentes";
const SUMMARY_MAX = 220;

export interface RenderOptions {
  /** Full HTML document for the site; a body fragment for hosts that wrap it. */
  document?: boolean;
  /** Maps an image URL to what the page embeds, e.g. a data: URI. */
  resolveImage?: (url: string) => string | null;
}

function href(url: string): string {
  return escapeHtml(/^https?:\/\//i.test(url) ? url : "#");
}

function clip(text: string): string {
  if (text.length <= SUMMARY_MAX) return text;
  const cut = text.slice(0, SUMMARY_MAX);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(" "), 1)).trimEnd()}…`;
}

function meta(story: Story): string {
  const signal = story.signal > 0 ? ` · <b>${story.signal}</b>` : "";
  return `<span class="meta">${escapeHtml(story.source)}${signal}</span>`;
}

function figure(story: Story, options: RenderOptions): string {
  if (!story.image) return "";
  const src = options.resolveImage
    ? options.resolveImage(story.image)
    : story.image;
  if (!src) return "";
  return `<figure><a href="${href(story.url)}" tabindex="-1" aria-hidden="true"><img src="${escapeHtml(src)}" alt="" loading="lazy" referrerpolicy="no-referrer" width="1200" height="630" onerror="this.closest('figure').remove()"></a><figcaption>${escapeHtml(story.source)}</figcaption></figure>`;
}

function desk(section: Desk, options: RenderOptions): string {
  const { feature } = section;
  const briefs = section.briefs
    .map(
      (story) =>
        `<li><a href="${href(story.url)}">${escapeHtml(story.title)}</a> ${meta(story)}</li>`,
    )
    .join("");
  return `<section class="desk" aria-labelledby="desk-${escapeHtml(section.key)}">
<h2 id="desk-${escapeHtml(section.key)}">${escapeHtml(section.title)} <span>${section.briefs.length + 1}</span></h2>
<article class="note">${figure(feature, options)}<h3><a href="${href(feature.url)}">${escapeHtml(feature.title)}</a></h3>
<p>${escapeHtml(clip(feature.summary))} ${meta(feature)}</p></article>
${briefs ? `<ul class="brief">${briefs}</ul>` : ""}
</section>`;
}

function lead(edition: Edition, options: RenderOptions): string {
  const { story } = edition.lead;
  const others = edition.launches
    .slice(1)
    .map(
      (launch) =>
        `<li><a href="${href(launch.url)}">${escapeHtml(launch.title)}</a> ${meta(launch)}</li>`,
    )
    .join("");
  const headline = story
    ? `<a href="${href(story.url)}">${escapeHtml(edition.lead.headline)}</a>`
    : escapeHtml(edition.lead.headline);
  const dek = edition.lead.dek
    ? `<p class="dek">${escapeHtml(clip(edition.lead.dek))}</p>`
    : "";
  const tldr = edition.reading.tldr
    .map((item) => `<li>${inlineHtml(item)}</li>`)
    .join("");
  const watch = edition.reading.watch
    .map((item) => `<p>${inlineHtml(item)}</p>`)
    .join("");
  return `<section class="lead" aria-label="Manchete">
<div><p class="kicker">${escapeHtml(edition.lead.kicker)}</p><h1>${headline}</h1>${dek}
${others ? `<ul class="also">${others}</ul>` : ""}${story ? figure(story, options) : ""}</div>
<aside class="sidebar"><h2>Em uma frase</h2><ol class="tldr">${tldr}</ol>
${watch ? `<div class="watch"><h2>O que observar</h2>${watch}</div>` : ""}</aside>
</section>`;
}

export function renderNewspaper(
  edition: Edition,
  options: RenderOptions = {},
): string {
  const [year, month, day] = edition.day.split("-");
  const title = `${NEWSPAPER_NAME} — ${day}/${month}/${year}`;
  const body = `<div class="sheet">
<header><div class="ears"><span>Edição diária · IA e agentes</span><span>${edition.totals.items} itens · ${edition.totals.sources} fontes</span></div>
<p class="flag">${NEWSPAPER_NAME}</p>
<div class="dateline"><span><strong>${day}/${month}/${year}</strong></span><span>Coleta das últimas 24 horas</span><span>${edition.desks.length} editorias</span></div></header>
<main>${lead(edition, options)}
<div class="grid">${edition.desks.map((section) => desk(section, options)).join("\n")}</div></main>
<section class="backroom" aria-label="Como esta edição é feita"><h2>Bastidores</h2><p>Montada automaticamente pelo evo-agent a partir de releases, catálogos de modelos, papers e comunidades. As tabelas vêm do banco; só o resumo “Em uma frase” é escrito por modelo, com validação de idioma e formato. Imagens: cards públicos do GitHub e do Hugging Face.</p></section>
<footer><span>${NEWSPAPER_NAME}</span><span>evo-agent · ${edition.day}</span></footer>
</div>`;
  const head = `<title>${escapeHtml(title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${FONTS_HREF}">
<style>${NEWSPAPER_CSS}</style>`;
  if (!options.document) return `${head}\n${body}`;
  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
${head}</head><body>${body}</body></html>
`;
}
