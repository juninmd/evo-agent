import {
  ARTIFICIAL_ANALYSIS_INTELLIGENCE_URL,
  type IntelligenceDiff,
  type ModelChange,
  crawlArtificialAnalysisIntelligence,
  diffIntelligenceSnapshots,
} from "../crawler/intelligence.js";
import { type IntelligenceModelRecord, db } from "../knowledge/store.js";
import { localDayIso } from "../utils/date.js";
import { escapeHtml } from "../utils/escape.js";
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

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

function renderChange(change: ModelChange | undefined): string {
  if (!change) return "";
  if (change.type === "new") {
    return '<span class="rank-delta is-new">novo</span>';
  }
  const parts: string[] = [];
  const rankDelta = change.rankDelta ?? 0;
  if (rankDelta !== 0) {
    const up = rankDelta > 0;
    const moved = plural(Math.abs(rankDelta), "posição", "posições");
    parts.push(
      `<span class="rank-delta ${up ? "is-up" : "is-down"}"><span aria-hidden="true">${up ? "▲" : "▼"}${Math.abs(rankDelta)}</span><span class="visually-hidden">${up ? "subiu" : "caiu"} ${moved}</span></span>`,
    );
  }
  const scoreDelta = change.scoreDelta ?? 0;
  if (Math.abs(scoreDelta) >= 0.1) {
    const sign = scoreDelta > 0 ? "+" : "−";
    parts.push(
      `<span class="score-delta">${sign}${Math.abs(scoreDelta).toFixed(1)}</span>`,
    );
  }
  return parts.join(" ");
}

/**
 * Static HTML ranking: horizontal bars scaled from zero to the leader, so the
 * gaps read at their real size. Replaces a Mermaid chart (CDN-dependent,
 * overlapping labels, axis cut at 40) and a table repeating the same numbers.
 * Explicit ARIA roles keep table semantics when the mobile layout turns rows
 * into grids.
 */
export function renderIntelligenceRanking(
  models: IntelligenceModelRecord[],
  diff?: IntelligenceDiff,
  topN = 10,
): string {
  const top = models.slice(0, topN);
  if (top.length === 0) return "";

  const leader = Math.max(...top.map((m) => m.intelligenceIndex), 0.1);
  // On a first measurement every model is "new"; that is not a movement.
  const comparable = Boolean(
    diff?.hasChanges &&
      diff.modelChanges.some((c) => c.previousRank !== undefined),
  );
  const changes = new Map(
    comparable ? (diff?.modelChanges.map((c) => [c.slug, c]) ?? []) : [],
  );

  const rows = top.map((m) => {
    const width = Math.max(0, (m.intelligenceIndex / leader) * 100).toFixed(1);
    const openMark = m.isOpenWeights
      ? ' <span class="open-mark" title="Pesos abertos"><span class="visually-hidden">(pesos abertos)</span></span>'
      : "";
    const change = comparable
      ? `<td role="cell" class="change">${renderChange(changes.get(m.slug))}</td>`
      : "";
    return `<tr role="row"><td role="cell" class="rank">${m.rank}</td><th role="rowheader" scope="row" class="model">${escapeHtml(shortModelName(m.name))}${openMark}</th><td role="cell" class="creator">${escapeHtml(m.creator)}</td><td role="cell" class="score"><div class="score-cell"><span class="bar-track" aria-hidden="true"><span class="bar" style="--w:${width}%"></span></span><span class="value">${m.intelligenceIndex.toFixed(1)}</span></div></td>${change}</tr>`;
  });

  const changeHeader = comparable
    ? '<th role="columnheader" scope="col" class="change">Variação</th>'
    : "";
  const legend = [
    top.some((m) => m.isOpenWeights)
      ? '<span class="legend-open">Pesos abertos</span>'
      : "",
    comparable ? "<span>▲▼ posições desde a medição anterior</span>" : "",
    `<span>Barras proporcionais ao líder. Fonte: <a href="${ARTIFICIAL_ANALYSIS_INTELLIGENCE_URL}">Artificial Analysis Intelligence Index</a></span>`,
  ].join("");

  return [
    '<figure class="ranking">',
    '<table class="ranking-table" role="table">',
    `<thead role="rowgroup"><tr role="row"><th role="columnheader" scope="col" class="rank">#</th><th role="columnheader" scope="col">Modelo</th><th role="columnheader" scope="col" class="creator">Criador</th><th role="columnheader" scope="col" class="score">Índice</th>${changeHeader}</tr></thead>`,
    `<tbody role="rowgroup">${rows.join("")}</tbody>`,
    "</table>",
    `<figcaption>${legend}</figcaption>`,
    "</figure>",
  ].join("\n");
}

/**
 * Builds the complete intelligence report section: change status and the
 * ranking with its citation.
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

  return [
    "## Índice de Inteligência (Artificial Analysis)",
    "",
    `<p class="ranking-status">${escapeHtml(diff.summary)}</p>`,
    "",
    renderIntelligenceRanking(models, diff, 10),
  ].join("\n");
}
