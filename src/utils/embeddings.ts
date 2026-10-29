import { createOpenAI } from "@ai-sdk/openai";
import { embedMany } from "ai";
import { config } from "../config.js";
import { log } from "./logger.js";

/** Long enough to skip a backend in LiteLLM cooldown, short enough to retry next cycle. */
const CIRCUIT_OPEN_MS = 5 * 60_000;

let circuitOpenUntil = 0;

export function resetEmbeddingCircuit() {
  circuitOpenUntil = 0;
}

export function embeddingsEnabled(): boolean {
  return config.embedding.model !== "";
}

/**
 * Never throws: embeddings only sharpen dedup, so a dead backend must cost the
 * cycle one timeout at most and return null (callers fall back to lexical).
 * Callers batch: one call is one request and one timeout.
 */
export async function embedTexts(
  texts: string[],
): Promise<Float32Array[] | null> {
  if (texts.length === 0) return [];
  if (!embeddingsEnabled() || Date.now() < circuitOpenUntil) return null;
  const openai = createOpenAI({
    baseURL: config.litellm.apiBase,
    apiKey: config.litellm.apiKey,
  });
  const model = openai.embedding(config.embedding.model);
  try {
    const { embeddings } = await embedMany({
      model,
      values: texts,
      abortSignal: AbortSignal.timeout(config.embedding.timeoutMs),
    });
    return embeddings.map((embedding) => Float32Array.from(embedding));
  } catch (err) {
    circuitOpenUntil = Date.now() + CIRCUIT_OPEN_MS;
    log.warn(
      `Embeddings unavailable (${config.embedding.model}), using lexical dedup: ${err instanceof Error ? err.message : String(err)}`,
    );
    return null;
  }
}
