import axios from "axios";
import { db } from "../knowledge/store.js";
import { HTTP_LIMITS } from "../utils/http-limits.js";
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
  /** USD per token, as decimal strings. */
  pricing?: { prompt?: string; completion?: string };
  hugging_face_id?: string | null;
}

export interface ModelCard {
  id: string;
  name: string;
  url: string;
  /** USD per 1M tokens; null when the catalog has no price. */
  inputPrice: number | null;
  outputPrice: number | null;
  context: number | null;
  openWeights: boolean;
  hfUrl: string | null;
  launchedAt?: number;
}

function perMillion(raw?: string): number | null {
  const value = Number(raw);
  // OpenRouter uses negative prices for router pseudo-models.
  return raw === undefined || !Number.isFinite(value) || value < 0
    ? null
    : Math.round(value * 1_000_000 * 1000) / 1000;
}

/** Price, context and weights straight from the catalog: no model involved. */
export function modelCard(model: CatalogModel): ModelCard {
  const id = model.id ?? "";
  const hf = model.hugging_face_id ?? "";
  return {
    id,
    name: model.name || id,
    url: `https://openrouter.ai/${id}`,
    inputPrice: perMillion(model.pricing?.prompt),
    outputPrice: perMillion(model.pricing?.completion),
    context: model.context_length ?? null,
    openWeights: MODEL_ID.test(hf),
    hfUrl: MODEL_ID.test(hf) ? `https://huggingface.co/${hf}` : null,
    launchedAt: model.created,
  };
}

export function priceLine(card: ModelCard): string {
  if (card.inputPrice === null || card.outputPrice === null) return "";
  return card.inputPrice === 0 && card.outputPrice === 0
    ? "gratuito na OpenRouter"
    : `US$ ${card.inputPrice} / ${card.outputPrice} por 1M tokens (entrada/saída)`;
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

export function recentMajorModels(
  models: CatalogModel[],
  now = new Date(),
  windowDays = LAUNCH_WINDOW_DAYS,
): CatalogModel[] {
  const cutoff = now.getTime() / 1000 - windowDays * 86_400;
  return models
    .filter((model) => {
      const id = model.id ?? "";
      return (
        MODEL_ID.test(id) &&
        MAJOR_VENDORS.has(id.split("/")[0]) &&
        (model.created ?? 0) >= cutoff
      );
    })
    .sort((left, right) => (right.created ?? 0) - (left.created ?? 0));
}

export function newModelLaunches(
  models: CatalogModel[],
  now = new Date(),
  limit = LAUNCH_LIMIT,
): ModelSignal[] {
  return recentMajorModels(models, now)
    .slice(0, limit)
    .map((model) => {
      const card = modelCard(model);
      const price = priceLine(card);
      return {
        title: card.name,
        url: card.url,
        summary: summarizeSourceContent(
          [
            model.context_length
              ? `${model.context_length} tokens de contexto.`
              : "",
            price ? `${price}.` : "",
            card.openWeights ? "Pesos abertos." : "",
            model.description ?? "",
          ].join(" "),
          500,
        ),
        engagement: 0,
        launchedAt: model.created,
      };
    });
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
    { ...HTTP_LIMITS, timeout: 15000 },
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
    { ...HTTP_LIMITS, timeout: 15000 },
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
