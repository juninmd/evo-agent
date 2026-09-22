import axios from "axios";
import {
  type IntelligenceModelRecord,
  type IntelligenceSnapshot,
  db,
} from "../knowledge/store.js";
import { localDayIso } from "../utils/date.js";
import { log } from "../utils/logger.js";

export const ARTIFICIAL_ANALYSIS_MODELS_URL =
  "https://artificialanalysis.ai/models";
export const ARTIFICIAL_ANALYSIS_INTELLIGENCE_URL =
  "https://artificialanalysis.ai/models#intelligence";

export interface ModelChange {
  name: string;
  slug: string;
  creator: string;
  currentRank: number;
  previousRank?: number;
  currentScore: number;
  previousScore?: number;
  scoreDelta?: number;
  rankDelta?: number;
  type: "new" | "score_changed" | "rank_changed" | "unchanged";
  summary: string;
}

export interface IntelligenceDiff {
  hasChanges: boolean;
  summary: string;
  newModels: string[];
  rankChanges: Array<{ name: string; oldRank: number; newRank: number }>;
  scoreChanges: Array<{
    name: string;
    oldScore: number;
    newScore: number;
    delta: number;
  }>;
  droppedModels: string[];
  modelChanges: ModelChange[];
}

/**
 * Extracts intelligence models from Artificial Analysis page HTML (Next.js App Router RSC).
 */
export function extractIntelligenceModels(
  html: string,
): IntelligenceModelRecord[] {
  const matches = [
    ...html.matchAll(/self\.__next_f\.push\(\[1,\s*"([\s\S]*?)"\]\)/g),
  ];
  let combined = "";
  for (const m of matches) {
    try {
      combined += JSON.parse(`"${m[1]}"`);
    } catch {
      combined += m[1].replace(/\\"/g, '"').replace(/\\\\/g, "\\");
    }
  }

  const target = '"initialModels":[';
  const idx = combined.indexOf(target);
  if (idx !== -1) {
    let depth = 0;
    const start = idx + target.length - 1;
    let end = -1;
    for (let i = start; i < combined.length; i++) {
      if (combined[i] === "[") depth++;
      else if (combined[i] === "]") {
        depth--;
        if (depth === 0) {
          end = i + 1;
          break;
        }
      }
    }
    if (end !== -1) {
      try {
        const rawModels = JSON.parse(combined.slice(start, end));
        const filtered = rawModels
          .filter(
            (m: { intelligenceIndex?: unknown }) =>
              typeof m.intelligenceIndex === "number",
          )
          .map(
            (m: {
              name?: string;
              slug?: string;
              release?: { name?: string };
              creator?: { name?: string };
              creatorSlug?: string;
              intelligenceIndex: number;
              isOpenWeights?: boolean;
              isReasoning?: boolean;
              releaseDate?: string;
              contextWindowTokens?: number;
            }) => ({
              name: m.name || m.release?.name || m.slug || "Modelo",
              slug:
                m.slug ||
                (m.name || "modelo")
                  .toLowerCase()
                  .replace(/[^a-z0-9]+/g, "-")
                  .replace(/^-|-$/g, ""),
              creator: m.creator?.name || m.creatorSlug || "Desconhecido",
              intelligenceIndex: Math.round(m.intelligenceIndex * 10) / 10,
              isOpenWeights: Boolean(m.isOpenWeights),
              isReasoning: Boolean(m.isReasoning),
              releaseDate: m.releaseDate,
              contextWindowTokens: m.contextWindowTokens,
            }),
          )
          .sort(
            (
              a: { intelligenceIndex: number },
              b: { intelligenceIndex: number },
            ) => b.intelligenceIndex - a.intelligenceIndex,
          )
          .map(
            (
              m: Omit<IntelligenceModelRecord, "rank">,
              index: number,
            ): IntelligenceModelRecord => ({
              ...m,
              rank: index + 1,
            }),
          );
        if (filtered.length > 0) return filtered;
      } catch (err) {
        log.warn(
          `Failed parsing initialModels JSON: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
  }

  // Fallback regex scan across text
  const regex = /"name":"([^"]+)"[^{}]*?"intelligenceIndex":([0-9.]+)/g;
  const list: Omit<IntelligenceModelRecord, "rank">[] = [];
  let match: RegExpExecArray | null;
  // biome-ignore lint/suspicious/noAssignInExpressions: regex exec in loop
  while ((match = regex.exec(combined || html)) !== null) {
    const name = match[1];
    const score = Math.round(Number.parseFloat(match[2]) * 10) / 10;
    list.push({
      name,
      slug: name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, ""),
      creator: "Desconhecido",
      intelligenceIndex: score,
      isOpenWeights: false,
      isReasoning: true,
    });
  }
  list.sort((a, b) => b.intelligenceIndex - a.intelligenceIndex);
  return list.map((item, index) => ({ ...item, rank: index + 1 }));
}

/**
 * Compares current intelligence models with a previous snapshot to detect score/rank shifts.
 */
export function diffIntelligenceSnapshots(
  current: IntelligenceModelRecord[],
  previous?: IntelligenceModelRecord[] | null,
  topLimit = 10,
): IntelligenceDiff {
  if (!previous || previous.length === 0) {
    const top = current.slice(0, topLimit);
    return {
      hasChanges: true,
      summary: `Primeira medição registrada: ${top[0]?.name ?? "Modelo"} lidera o ranking com índice ${top[0]?.intelligenceIndex ?? 0}.`,
      newModels: top.map((m) => m.name),
      rankChanges: [],
      scoreChanges: [],
      droppedModels: [],
      modelChanges: top.map((m) => ({
        name: m.name,
        slug: m.slug,
        creator: m.creator,
        currentRank: m.rank,
        currentScore: m.intelligenceIndex,
        type: "new",
        summary: `Estreia em #${m.rank} (${m.intelligenceIndex})`,
      })),
    };
  }

  const prevBySlug = new Map<string, IntelligenceModelRecord>();
  for (const m of previous) {
    prevBySlug.set(m.slug, m);
  }

  const newModels: string[] = [];
  const rankChanges: Array<{ name: string; oldRank: number; newRank: number }> =
    [];
  const scoreChanges: Array<{
    name: string;
    oldScore: number;
    newScore: number;
    delta: number;
  }> = [];
  const modelChanges: ModelChange[] = [];

  const topCurrent = current.slice(0, topLimit);

  for (const curr of topCurrent) {
    const prev = prevBySlug.get(curr.slug);
    if (!prev) {
      newModels.push(curr.name);
      modelChanges.push({
        name: curr.name,
        slug: curr.slug,
        creator: curr.creator,
        currentRank: curr.rank,
        currentScore: curr.intelligenceIndex,
        type: "new",
        summary: `Novo no top ${topLimit} (#${curr.rank}, score ${curr.intelligenceIndex})`,
      });
      continue;
    }

    const scoreDelta =
      Math.round((curr.intelligenceIndex - prev.intelligenceIndex) * 10) / 10;
    const rankDelta = prev.rank - curr.rank; // > 0 subiu, < 0 caiu

    const hasScoreChange = Math.abs(scoreDelta) >= 0.1;
    const hasRankChange = rankDelta !== 0;

    if (hasScoreChange) {
      scoreChanges.push({
        name: curr.name,
        oldScore: prev.intelligenceIndex,
        newScore: curr.intelligenceIndex,
        delta: scoreDelta,
      });
    }

    if (hasRankChange) {
      rankChanges.push({
        name: curr.name,
        oldRank: prev.rank,
        newRank: curr.rank,
      });
    }

    const type = hasScoreChange
      ? "score_changed"
      : hasRankChange
        ? "rank_changed"
        : "unchanged";

    let summary = "=";
    if (hasRankChange && hasScoreChange) {
      const dir =
        rankDelta > 0 ? `+${rankDelta} pos` : `-${Math.abs(rankDelta)} pos`;
      const sDir = scoreDelta > 0 ? `+${scoreDelta}` : `${scoreDelta}`;
      summary = `${dir} (${sDir} pts)`;
    } else if (hasRankChange) {
      summary =
        rankDelta > 0 ? `+${rankDelta} pos` : `-${Math.abs(rankDelta)} pos`;
    } else if (hasScoreChange) {
      summary = scoreDelta > 0 ? `+${scoreDelta} pts` : `${scoreDelta} pts`;
    }

    modelChanges.push({
      name: curr.name,
      slug: curr.slug,
      creator: curr.creator,
      currentRank: curr.rank,
      previousRank: prev.rank,
      currentScore: curr.intelligenceIndex,
      previousScore: prev.intelligenceIndex,
      scoreDelta,
      rankDelta,
      type,
      summary,
    });
  }

  const currTopSlugs = new Set(topCurrent.map((m) => m.slug));
  const droppedModels = previous
    .slice(0, topLimit)
    .filter((m) => !currTopSlugs.has(m.slug))
    .map((m) => m.name);

  const hasChanges =
    newModels.length > 0 ||
    rankChanges.length > 0 ||
    scoreChanges.length > 0 ||
    droppedModels.length > 0;

  let summaryText =
    "Sem alterações no ranking de inteligência em relação à medição anterior.";
  if (hasChanges) {
    const parts: string[] = [];
    if (newModels.length > 0) {
      parts.push(`Novos no top ${topLimit}: ${newModels.join(", ")}`);
    }
    if (rankChanges.length > 0) {
      const moves = rankChanges
        .map((r) => `${r.name} (#${r.oldRank} -> #${r.newRank})`)
        .slice(0, 3);
      parts.push(`Mudança de posição: ${moves.join(", ")}`);
    }
    if (scoreChanges.length > 0) {
      const sMoves = scoreChanges
        .map(
          (s) =>
            `${s.name} (${s.delta > 0 ? `+${s.delta}` : s.delta} -> ${s.newScore})`,
        )
        .slice(0, 3);
      parts.push(`Pontuação: ${sMoves.join(", ")}`);
    }
    if (droppedModels.length > 0) {
      parts.push(`Deixaram o top ${topLimit}: ${droppedModels.join(", ")}`);
    }
    summaryText = `Mudanças no ranking: ${parts.join("; ")}.`;
  }

  return {
    hasChanges,
    summary: summaryText,
    newModels,
    rankChanges,
    scoreChanges,
    droppedModels,
    modelChanges,
  };
}

/**
 * Fetches models from Artificial Analysis live page, falling back to SQLite cache if offline.
 */
export async function fetchArtificialAnalysisModels(): Promise<
  IntelligenceModelRecord[]
> {
  try {
    const response = await axios.get<string>(ARTIFICIAL_ANALYSIS_MODELS_URL, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      timeout: 15000,
    });
    const models = extractIntelligenceModels(response.data);
    if (models.length > 0) return models;
    log.warn(
      "Artificial Analysis page returned 0 parsed models; checking DB cache",
    );
  } catch (err) {
    log.warn(
      `Artificial Analysis fetch failed: ${err instanceof Error ? err.message : String(err)}; checking DB cache`,
    );
  }

  const cached = db.getLatestIntelligenceSnapshot();
  if (cached && cached.models.length > 0) {
    log.info(`Using cached intelligence snapshot from ${cached.day}`);
    return cached.models;
  }

  return [];
}

/**
 * Crawls Artificial Analysis, detects changes, persists snapshot and knowledge base entry.
 */
export async function crawlArtificialAnalysisIntelligence(
  now = new Date(),
): Promise<{
  models: IntelligenceModelRecord[];
  diff: IntelligenceDiff;
  savedSnapshotId: number;
}> {
  const day = localDayIso(now);
  const models = await fetchArtificialAnalysisModels();
  if (models.length === 0) {
    throw new Error("Unable to fetch or recover Artificial Analysis models");
  }

  const previousSnapshot = db.getLatestIntelligenceSnapshot();
  const diff = diffIntelligenceSnapshots(models, previousSnapshot?.models);

  const savedSnapshotId = db.saveIntelligenceSnapshot({
    day,
    source_url: ARTIFICIAL_ANALYSIS_INTELLIGENCE_URL,
    models,
    changes: diff as unknown as Record<string, unknown>,
  });

  // Also index as an article so crawler and knowledge systems track it
  const top = models[0];
  const topOpen = models.find((m) => m.isOpenWeights);
  const articleUrl = `${ARTIFICIAL_ANALYSIS_INTELLIGENCE_URL}#${day}`;
  if (!db.urlExists(articleUrl)) {
    const summaryLines = [
      `Índice de Inteligência Artificial Analysis (${day}): liderança de ${top?.name ?? "N/A"} (${top?.intelligenceIndex ?? 0}).`,
      topOpen
        ? `Líder em pesos abertos: ${topOpen.name} (${topOpen.intelligenceIndex}).`
        : "",
      diff.summary,
    ]
      .filter(Boolean)
      .join(" ");

    db.saveArticle({
      title: `Artificial Analysis: Ranking de Inteligência (${top?.name ?? "Modelos"})`,
      source: "Artificial Analysis",
      url: articleUrl,
      summary: summaryLines.slice(0, 500),
      tags: JSON.stringify([
        "intelligence",
        "benchmark",
        "artificial-analysis",
        "llm-ranking",
      ]),
      engagement_score: 95,
    });
  }

  log.info(
    `Crawled Artificial Analysis: ${models.length} models, top: ${top?.name} (${top?.intelligenceIndex}), changes: ${diff.hasChanges}`,
  );

  return { models, diff, savedSnapshotId };
}
