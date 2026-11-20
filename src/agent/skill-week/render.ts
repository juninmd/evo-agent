import type { Article } from "../../knowledge/store.js";
import { sourceBucket } from "../curation.js";
import { firstSnippet } from "./artifacts.js";
import type { Discarded, DiscardReason, ScoredItem } from "./scoring.js";
import type { ThermometerTopic, Tiers } from "./tiers.js";

const DISCARD_LABELS: Record<DiscardReason, string> = {
  prerelease: "pré-release",
  business: "notícia de negócio",
  "no-artifact": "sem repositório, docs ou release",
  duplicate: "repetido",
  thin: "sem conteúdo",
};

/** Third-party text: no markup, no link syntax, one line. */
export function plain(text: string, max = 220): string {
  const clean = text
    .replace(/[<>[\]`*_|#]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  return `${cut.slice(0, cut.lastIndexOf(" ")).replace(/[\s,;:.]+$/, "")}…`;
}

/** A Markdown link only for http(s); any other scheme degrades to its label. */
export function link(label: string, url: string): string {
  if (!/^https?:\/\//i.test(url)) return label;
  const clean = url
    .replace(/\(/g, "%28")
    .replace(/\)/g, "%29")
    .replace(/\s/g, "");
  return `[${label}](${clean})`;
}

/** Headings move one level down; lines inside code fences are code, not headings. */
export function nestHeadings(markdown: string): string {
  let inFence = false;
  return markdown
    .split("\n")
    .map((line) => {
      if (/^\s*```/.test(line)) inFence = !inFence;
      return !inFence && /^#{2,3} /.test(line) ? `#${line}` : line;
    })
    .join("\n");
}

function displayTitle(article: Article): string {
  const title = article.title.replace(/^(reddit|discussao):\s*/i, "");
  // Release feeds title entries with the bare version: "v2.1.326".
  const product = /^v?\d+\.\d+/.test(title)
    ? `${article.source.replace(/\s+(releases|changelog)$/i, "")} `
    : "";
  return plain(`${product}${title}`, 120);
}

export function sourceName(article: Article): string {
  if (sourceBucket(article.source) !== "reddit") return plain(article.source);
  const community = article.source.match(/\(([^)]+)\)/)?.[1];
  return community ? `Reddit r/${plain(community)}` : "Reddit";
}

function fence(code: string): string {
  // A longer fence than any run of backticks inside keeps the block closed.
  const longest = Math.max(
    2,
    ...[...code.matchAll(/`+/g)].map((match) => match[0].length),
  );
  const ticks = "`".repeat(longest + 1);
  return `${ticks}\n${code}\n${ticks}`;
}

function line(item: ScoredItem, lines: Map<string, string>): string {
  return lines.get(item.article.url) ?? plain(item.article.summary);
}

export function renderTry(
  item: ScoredItem,
  lines: Map<string, string>,
): string {
  const { article } = item;
  const snippet =
    item.layer === "thermometer" ? null : firstSnippet(article.body || "");
  // A repo or release page is its own artifact; links inside it are noise.
  const artifact = item.artifacts.includes(article.url)
    ? undefined
    : item.artifacts[0];
  const artifactLabel = artifact
    ? plain(artifact.replace(/^https?:\/\/(www\.)?/, ""), 90)
    : "";
  return [
    `### ${displayTitle(article)}`,
    line(item, lines),
    snippet ? fence(snippet) : "",
    artifact ? `**Artefato:** ${link(artifactLabel, artifact)}` : "",
    `Fonte: ${link(sourceName(article), article.url)} · nota ${item.score}/10 (${item.reasons.join(", ")})`,
  ]
    .filter(Boolean)
    .join("\n\n");
}

export function renderKnow(
  item: ScoredItem,
  lines: Map<string, string>,
): string {
  return `- **${displayTitle(item.article)}**: ${line(item, lines)} ${link(sourceName(item.article), item.article.url)}`;
}

export function renderThermometer(topic: ThermometerTopic): string {
  return `- **${topic.topic}**: ${topic.count} posts na semana. Exemplo: ${link(displayTitle(topic.example), topic.example.url)} (${sourceName(topic.example)})`;
}

export function renderDiscards(
  discarded: Discarded[],
  considered: number,
): string {
  const counts = new Map<DiscardReason, number>();
  for (const { reason } of discarded) {
    counts.set(reason, (counts.get(reason) ?? 0) + 1);
  }
  const parts = [...counts.entries()]
    .sort((left, right) => right[1] - left[1])
    .map(([reason, count]) => `${count} ${DISCARD_LABELS[reason]}`);
  return `_${considered} itens avaliados${parts.length ? `; descartados: ${parts.join(", ")}` : ""}._`;
}

/** Top skill repositories by stars, straight from the crawler: no model involved. */
export function renderSkillRepos(repos: Article[], limit = 5): string {
  const top = [...repos]
    .sort((left, right) => right.engagement_score - left.engagement_score)
    .slice(0, limit);
  if (top.length === 0) return "";
  return [
    "| Repositório de skills | Estrelas |",
    "|---|---:|",
    ...top.map(
      (repo) =>
        `| ${link(plain(repo.title, 80), repo.url)} | ${repo.engagement_score} |`,
    ),
  ].join("\n");
}

export interface EditionParts {
  tiers: Tiers;
  lesson: string | null;
  lines: Map<string, string>;
  placar: string;
  discards: string;
}

export function renderEdition(parts: EditionParts): string {
  const { tiers, lesson, lines } = parts;
  const sections: string[] = [];
  if (lesson) {
    // The lesson nests under "Aprenda": its own headings move one level down.
    sections.push("## Aprenda", nestHeadings(lesson));
  }
  if (tiers.try.length > 0) {
    sections.push(
      "## Experimente",
      tiers.try.map((item) => renderTry(item, lines)).join("\n\n"),
    );
  }
  if (tiers.know.length > 0) {
    sections.push(
      "## Fique sabendo",
      tiers.know.map((item) => renderKnow(item, lines)).join("\n"),
    );
  }
  if (parts.placar) sections.push("## Placar", parts.placar);
  if (tiers.thermometer.length > 0) {
    sections.push(
      "## Termômetro da comunidade",
      tiers.thermometer.map(renderThermometer).join("\n"),
    );
  }
  sections.push(parts.discards);
  return sections.join("\n\n");
}
