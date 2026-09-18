import type { Article } from "../knowledge/store.js";
import { isLaunchOfDay } from "../utils/launch.js";
import { cell, displayUrl, rowSummary } from "./radar-format.js";

export interface LaunchOfDay {
  lead: Article;
  sources: string[];
}

/** "DeepSeek: DeepSeek V4.1 Flash" and "deepseek-ai/DeepSeek-V4.1-Flash" are one model. */
function modelKey(title: string): string {
  const name = title.split(/[:/]/).pop() ?? title;
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function launchesOfDay(
  articles: Article[],
  now = new Date(),
): LaunchOfDay[] {
  // The vendor catalog names the launch; the Hub entry is corroboration.
  const launches = articles
    .filter((article) => isLaunchOfDay(article, now))
    .sort(
      (left, right) =>
        Number(!/^openrouter/i.test(left.source)) -
        Number(!/^openrouter/i.test(right.source)),
    );
  const byModel = new Map<string, LaunchOfDay>();
  for (const article of launches) {
    const key = modelKey(article.title);
    const entry = byModel.get(key);
    if (!entry) byModel.set(key, { lead: article, sources: [article.source] });
    else if (!entry.sources.includes(article.source))
      entry.sources.push(article.source);
  }
  return [...byModel.values()];
}

/**
 * Deterministic, above the model's reading: a release of the day is headline
 * news even when the LLM is down or chooses to lead with something else.
 */
export function renderLaunchHighlights(
  articles: Article[],
  now = new Date(),
): string {
  const rows = launchesOfDay(articles, now).map(({ lead, sources }) => {
    const summary = lead.summary.trim() ? ` — ${rowSummary(lead.summary)}` : "";
    return `- **[${cell(lead.title)}](${displayUrl(lead.url)})** (${sources.join(" · ")})${summary}`;
  });
  if (rows.length === 0) return "";
  return ["## Lançamento do dia", "", ...rows, ""].join("\n");
}
