import { config } from "../config.js";
import {
  getArticlesByUrls,
  getCachedVectors,
  saveVectors,
} from "../knowledge/embedding-cache.js";
import type { Article } from "../knowledge/store.js";
import { embedTexts, embeddingsEnabled } from "../utils/embeddings.js";
import { log } from "../utils/logger.js";

export type Embed = (texts: string[]) => Promise<Float32Array[] | null>;

export interface SemanticContext {
  vectors: Map<string, Float32Array>;
  /** Vectors of stories already published recently; a candidate close to one is a repeat. */
  priorVectors: Float32Array[];
}

export const EMPTY_SEMANTIC: SemanticContext = {
  vectors: new Map(),
  priorVectors: [],
};

const BATCH_SIZE = 64;

function embeddingText(article: Article): string {
  // Nomic models are trained with task prefixes; "clustering" is the one for dedup.
  const prefix = /nomic/i.test(config.embedding.model) ? "clustering: " : "";
  return `${prefix}${article.title}. ${(article.summary ?? "").slice(0, 400)}`;
}

/** Cached per (url, model); only the misses reach the backend. Partial results are fine. */
export async function vectorsFor(
  articles: Article[],
  embed: Embed = embedTexts,
): Promise<Map<string, Float32Array>> {
  if (!embeddingsEnabled() || articles.length === 0) return new Map();
  const model = config.embedding.model;
  const urls = articles.map((article) => article.url);
  const vectors = getCachedVectors(urls, model);
  const missing = articles.filter((article) => !vectors.has(article.url));
  if (missing.length === 0) return vectors;

  // Each batch is persisted as it lands: a later failure keeps the earlier work.
  let embedded = 0;
  for (let i = 0; i < missing.length; i += BATCH_SIZE) {
    const batch = missing.slice(i, i + BATCH_SIZE);
    const fresh = await embed(batch.map(embeddingText));
    if (!fresh || fresh.length !== batch.length) break;
    const entries = batch.map(
      (article, j) => [article.url, fresh[j]] as [string, Float32Array],
    );
    saveVectors(model, entries);
    for (const [url, vector] of entries) vectors.set(url, vector);
    embedded += batch.length;
  }
  if (embedded > 0) {
    log.info(`Embedded ${embedded}/${missing.length} missing articles`);
  }
  return vectors;
}

export async function semanticContext(
  candidates: Article[],
  recentlyUsedUrls: string[],
  embed: Embed = embedTexts,
): Promise<SemanticContext> {
  if (!embeddingsEnabled()) return EMPTY_SEMANTIC;
  const prior = getArticlesByUrls(recentlyUsedUrls);
  const vectors = await vectorsFor([...candidates, ...prior], embed);
  const priorVectors = prior.flatMap((article) => {
    const vector = vectors.get(article.url);
    return vector ? [vector] : [];
  });
  return { vectors, priorVectors };
}
