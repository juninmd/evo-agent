import {
  ARTIFICIAL_ANALYSIS_INTELLIGENCE_URL,
  type IntelligenceDiff,
  crawlArtificialAnalysisIntelligence,
  diffIntelligenceSnapshots,
} from "../crawler/intelligence.js";
import { type IntelligenceModelRecord, db } from "../knowledge/store.js";
import { localDayIso } from "../utils/date.js";
import { log } from "../utils/logger.js";

/**
 * Shortens model names for compact chart display.
 * Example: "Claude Fable 5.1 (Adaptive Reasoning, Max Effort, Default Fallback)" -> "Claude Fable 5.1"
 */
export function shortModelName(name: string): string {
  return name
    .replace(/\s*\([^)]*\)/g, "")
    .replace(/:(?!\/)/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Generates Mermaid xychart-beta bar chart for top N models.
 */
export function renderIntelligenceMermaidChart(
  models: IntelligenceModelRecord[],
  topN = 10,
): string {
  const top = models.slice(0, topN);
  if (top.length === 0) return "";

  const labels = top.map((m) => `"${shortModelName(m.name)}"`);
  const values = top.map((m) => m.intelligenceIndex);

  const minVal = Math.max(0, Math.floor(Math.min(...values) / 10) * 10);
  const maxVal = Math.ceil(Math.max(...values) / 10) * 10 + 5;

  return [
    "```mermaid",
    "xychart-beta",
    `    title "Artificial Analysis Intelligence Index (Top ${top.length})"`,
    `    x-axis [${labels.join(", ")}]`,
    `    y-axis "Índice" ${minVal} --> ${maxVal}`,
    `    bar [${values.join(", ")}]`,
    "```",
  ].join("\n");
}

/**
 * Generates Markdown comparison table for top N models.
 */
export function renderIntelligenceTable(
  models: IntelligenceModelRecord[],
  diff?: IntelligenceDiff,
  topN = 10,
): string {
  const top = models.slice(0, topN);
  if (top.length === 0) return "";

  const diffMap = new Map(
    diff?.modelChanges.map((c) => [c.slug, c.summary]) ?? [],
  );

  const rows = top.map((m) => {
    const variation = diffMap.get(m.slug) ?? "=";
    const typeLabel = m.isOpenWeights ? "Pesos Abertos" : "Proprietário";
    const nameLabel = shortModelName(m.name);
    return `| ${m.rank} | [${nameLabel}](${ARTIFICIAL_ANALYSIS_INTELLIGENCE_URL}) | ${m.creator} | ${m.intelligenceIndex.toFixed(1)} | ${variation} | ${typeLabel} |`;
  });

  return [
    "| # | Modelo | Criador | Score | Variação | Tipo |",
    "|---|---|---|---|---|---|",
    ...rows,
  ].join("\n");
}

/**
 * Builds the complete intelligence report section containing change status,
 * Mermaid chart, ranking table and citation.
 */
export async function renderIntelligenceSection(
  now = new Date(),
  customModels?: IntelligenceModelRecord[],
  customDiff?: IntelligenceDiff,
): Promise<string> {
  let models = customModels;
  let diff = customDiff;

  if (!models || models.length === 0) {
    const today = localDayIso(now);
    const latest = db.getLatestIntelligenceSnapshot();

    // Prefer live crawl if snapshot is missing, outdated or holds fewer than 10 models
    if (!latest || latest.models.length < 10 || latest.day !== today) {
      try {
        const crawled = await crawlArtificialAnalysisIntelligence(now);
        models = crawled.models;
        diff = crawled.diff;
      } catch (err) {
        log.warn(
          `Live intelligence crawl failed, attempting fallback to snapshot: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    if (!models || models.length === 0) {
      if (latest && latest.models.length > 0) {
        models = latest.models;
        const history = db.getIntelligenceSnapshots(2);
        const previous = history[1]?.models;
        diff = diff ?? diffIntelligenceSnapshots(models, previous);
      } else {
        log.warn("No intelligence snapshot available to render");
        return "";
      }
    }
  }

  if (!models || models.length === 0) return "";

  if (!diff) {
    diff = diffIntelligenceSnapshots(models, null);
  }

  const chart = renderIntelligenceMermaidChart(models, 10);
  const table = renderIntelligenceTable(models, diff, 10);
  const changeAlert = `> **Status de Atualização:** ${diff.summary}`;

  return [
    "## Índice de Inteligência (Artificial Analysis)",
    "",
    changeAlert,
    "",
    chart,
    "",
    table,
    "",
    `*Fonte: [Artificial Analysis Intelligence Index](${ARTIFICIAL_ANALYSIS_INTELLIGENCE_URL}). Monitoramento e análise diária de capacidade de modelos de fronteira.*`,
  ].join("\n");
}
