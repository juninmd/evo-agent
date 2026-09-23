import axios from "axios";
import { db } from "../knowledge/store.js";
import { launchTag } from "../utils/launch.js";
import { log } from "../utils/logger.js";
import { FEED_MAX_AGE_DAYS, summarizeSourceContent } from "./feed-items.js";

export const HF_TRENDING_SOURCE = "HF Trending Models";
export const OPENROUTER_SOURCE = "OpenRouter: New Models";
const TRENDING_LIMIT = 15;
// Same window as feeds: urlExists dedupes, so each launch still lands once.
const LAUNCH_WINDOW_DAYS = FEED_MAX_AGE_DAYS;
const LAUNCH_LIMIT = 10;
// owner/name only: blocks "../", "~alias" and ":variant" ids before building URLs.
const MODEL_ID = /^[\w.-]+\/[\w.-]+$/;
/** Launch feed is a catalog of 400+ models; only labs readers track make news. */
const MAJOR_VENDORS = new Set([
  "anthropic",
  "openai",
  "google",
  "meta",
  "meta-llama",
  "deepseek",
  "qwen",
  "mistralai",
  "x-ai",
  "moonshotai",
  "z-ai",
  "minimax",
  "amazon",
  "microsoft",
  "nvidia",
  "cohere",
  "baidu",
  "tencent",
  "bytedance",
  "xiaomi",
]);

export interface ModelSignal {
  title: string;
  url: string;
  summary: string;
  engagement: number;
  /** Release time in epoch seconds, when the source states it. */
  launchedAt?: number;
}

interface HubModel {
  id?: string;
  trendingScore?: number;
  likes?: number;
  downloads?: number;
  pipeline_tag?: string;
  createdAt?: string;
}

function epochSeconds(iso?: string): number | undefined {
  const time = new Date(iso ?? "").getTime();
  return Number.isNaN(time) ? undefined : Math.floor(time / 1000);
}

export interface CatalogModel {
  id?: string;
  name?: string;
  created?: number;
  description?: string;
  context_length?: number;
}

export function rankTrendingModels(
  models: HubModel[],
  day: string,
  limit = TRENDING_LIMIT,
): ModelSignal[] {
  return models
    .filter(
      (model) =>
        MODEL_ID.test(model.id ?? "") && (model.trendingScore ?? 0) > 0,
    )
    .sort(
      (left, right) => (right.trendingScore ?? 0) - (left.trendingScore ?? 0),
    )
    .slice(0, limit)
    .map((model) => ({
      title: model.id as string,
      // Day-scoped like GitHub Trending: the same model can trend on later days.
      url: `https://huggingface.co/${model.id}#trending-${day}`,
      summary: [
        model.pipeline_tag ?? "modelo",
        `${model.likes ?? 0} likes`,
        `${model.downloads ?? 0} downloads`,
        `trending ${model.trendingScore}`,
      ].join(" · "),
      engagement: model.trendingScore ?? 0,
      launchedAt: epochSeconds(model.createdAt),
    }));
}

export function newModelLaunches(
  models: CatalogModel[],
  now = new Date(),
  limit = LAUNCH_LIMIT,
): ModelSignal[] {
  const cutoff = now.getTime() / 1000 - LAUNCH_WINDOW_DAYS * 86_400;
  return models
    .filter((model) => {
      const id = model.id ?? "";
      return (
        MODEL_ID.test(id) &&
        MAJOR_VENDORS.has(id.split("/")[0]) &&
        (model.created ?? 0) >= cutoff
      );
    })
    .sort((left, right) => (right.created ?? 0) - (left.created ?? 0))
    .slice(0, limit)
    .map((model) => ({
      title: model.name || (model.id as string),
      url: `https://openrouter.ai/${model.id}`,
      summary: summarizeSourceContent(
        [
          model.context_length
            ? `${model.context_length} tokens de contexto.`
            : "",
          model.description ?? "",
        ].join(" "),
        500,
      ),
      engagement: 0,
      launchedAt: model.created,
    }));
}

function save(source: string, tags: string[], signals: ModelSignal[]): number {
  let saved = 0;
  for (const signal of signals) {
    if (db.urlExists(signal.url)) continue;
    db.saveArticle({
      title: signal.title,
      source,
      url: signal.url,
      summary: signal.summary,
      tags: JSON.stringify(
        signal.launchedAt ? [...tags, launchTag(signal.launchedAt)] : tags,
      ),
      engagement_score: signal.engagement,
    });
    saved++;
  }
  return saved;
}

export async function crawlTrendingModels(now = new Date()): Promise<number> {
  const response = await axios.get<HubModel[]>(
    "https://huggingface.co/api/models?sort=trendingScore&limit=50",
    { timeout: 15000 },
  );
  const models = Array.isArray(response.data) ? response.data : [];
  const saved = save(
    HF_TRENDING_SOURCE,
    ["models", "huggingface", "trending"],
    rankTrendingModels(models, now.toISOString().slice(0, 10)),
  );
  log.info(`Crawled ${HF_TRENDING_SOURCE}, ${saved} new signals`);
  return saved;
}

export async function fetchModelCatalog(): Promise<CatalogModel[]> {
  const response = await axios.get<{ data?: CatalogModel[] }>(
    "https://openrouter.ai/api/v1/models",
    { timeout: 15000 },
  );
  return Array.isArray(response.data?.data) ? response.data.data : [];
}

export async function crawlModelLaunches(now = new Date()): Promise<number> {
  const models = await fetchModelCatalog();
  const saved = save(
    OPENROUTER_SOURCE,
    ["models", "launches", "openrouter"],
    newModelLaunches(models, now),
  );
  log.info(`Crawled ${OPENROUTER_SOURCE}, ${saved} new launches`);
  return saved;
}
