import { isGenericTitle } from "./editorial.js";
import type { GeneratedArticle } from "./writer.js";

export function editorialQualityScore(article: GeneratedArticle): number {
  let score = 100;
  if (isGenericTitle(article.title)) score -= 30;
  if (article.sources.length === 0) score -= 35;
  if (article.evidence.length === 0) score -= 35;
  if (article.editorialMetrics.primarySources === 0) score -= 20;
  if (/sem conte[uú]do/i.test(article.content)) score -= 35;
  if (/\]\(\s*javascript:/i.test(article.content)) score -= 40;
  const highlights = article.content.match(
    /## Destaques[\s\S]*?(?=\n## |\n---|$)/i,
  )?.[0];
  if (highlights && !/\]\(https?:\/\//i.test(highlights)) score -= 30;
  if (
    /(o per[ií]odo foi marcado|cada vez mais|players do mercado)/gi.test(
      article.content,
    )
  ) {
    score -= 15;
  }
  if (/-->\|[^|]+\|>/g.test(article.content)) score -= 25;
  return Math.max(0, score);
}

export function validateArticle(article: GeneratedArticle): string[] {
  const errors: string[] = [];
  if (!article.title.trim()) errors.push("article title is empty");
  if (isGenericTitle(article.title)) errors.push("article title is generic");
  if (!article.slug.trim()) errors.push("article slug is empty");
  if (!article.summary.trim()) errors.push("article summary is empty");
  if (!article.content.trim()) errors.push("article content is empty");
  if (article.tags.length === 0) errors.push("article has no tags");
  if (article.sources.length === 0) {
    errors.push("article has no selected sources");
  }
  if (article.evidence.length === 0) {
    errors.push("article has no evidence provenance");
  }
  if (
    article.evidence.some(
      (evidence) => !article.sources.includes(evidence.sourceUrl),
    )
  ) {
    errors.push("article evidence references an unselected source");
  }
  if (
    article.evidence.some(
      (evidence) =>
        evidence.excerpt.trim().length < 30 ||
        evidence.excerpt.trim().length > 240,
    )
  ) {
    errors.push("article evidence excerpt has invalid length");
  }
  if (article.editorialMetrics.primarySources === 0) {
    errors.push("article has no primary source");
  }
  if (/\]\(\s*javascript:/i.test(article.content)) {
    errors.push("article contains an unsafe link");
  }
  if (/sem conte[uú]do/i.test(article.content)) {
    errors.push("article contains placeholder content");
  }
  const highlights = article.content.match(
    /## Destaques[\s\S]*?(?=\n## |\n---|$)/i,
  )?.[0];
  if (highlights && !/\]\(https?:\/\//i.test(highlights)) {
    errors.push("article highlights lack inline citations");
  }

  const mermaidBlocks =
    article.content.match(/```mermaid\s*\n([\s\S]*?)```/gi) ?? [];
  for (const block of mermaidBlocks) {
    const firstLine = block
      .replace(/^```mermaid\s*/i, "")
      .split(/\r?\n/, 1)[0]
      .trim();
    if (!/^(graph|flowchart)\s+(TD|LR)$|^sequenceDiagram$/i.test(firstLine)) {
      errors.push("article contains an invalid Mermaid direction");
      break;
    }
    if (/-->\|[^|]+\|>/g.test(block)) {
      errors.push("article contains invalid Mermaid edge syntax");
      break;
    }
  }
  return errors;
}

export function assertValidArticle(article: GeneratedArticle): void {
  const errors = validateArticle(article);
  if (errors.length > 0) {
    throw new Error(`Editorial validation failed: ${errors.join("; ")}`);
  }
  const score = editorialQualityScore(article);
  if (score < 70) {
    throw new Error(`Editorial quality score below threshold: ${score}/100`);
  }
}
