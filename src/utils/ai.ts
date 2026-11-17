import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";
import { config } from "../config.js";
import { log } from "./logger.js";

export interface AskOptions {
  maxOutputTokens?: number;
  timeoutMs?: number;
  /** Tried before the configured chain; formats that teach pin a stronger model. */
  model?: string;
}

type MetricRecorder = (
  name: string,
  value: number,
  labels?: Record<string, string | number | boolean>,
) => void;

let metricRecorder: MetricRecorder = () => undefined;

export function setAiMetricRecorder(recorder: MetricRecorder) {
  metricRecorder = recorder;
}

let cachedProvider:
  | { key: string; provider: ReturnType<typeof createOpenAI> }
  | undefined;

function providerFor(baseURL: string, apiKey: string) {
  const key = `${baseURL}\n${apiKey}`;
  if (cachedProvider?.key !== key)
    cachedProvider = { key, provider: createOpenAI({ baseURL, apiKey }) };
  return cachedProvider.provider;
}

export async function ask(
  userPrompt: string,
  systemPrompt?: string,
  options?: AskOptions,
): Promise<string> {
  const apiBase = config.litellm.apiBase;
  const apiKey = config.litellm.apiKey;
  const primaryModel = config.litellm.model;
  const modelChain = [
    options?.model ?? "",
    primaryModel,
    ...config.litellm.fallbackModels,
  ].filter((m, i, arr) => m && arr.indexOf(m) === i);
  const timeoutMs = options?.timeoutMs ?? config.litellm.timeoutMs;
  const maxOutputTokens =
    options?.maxOutputTokens ?? config.litellm.maxOutputTokens;

  const openai = providerFor(apiBase, apiKey);

  let lastErr: unknown;

  for (let mi = 0; mi < modelChain.length; mi++) {
    const modelName = modelChain[mi];
    const isLast = mi === modelChain.length - 1;
    log.info(`Calling LiteLLM model via AI SDK: ${modelName} via ${apiBase}`);

    let attempt = 0;
    // O LiteLLM já reintenta e troca de deployment; aqui só cobre a cota do pool inteiro.
    const maxAttempts = 3;
    let delay = 3000;

    while (true) {
      const startedAt = Date.now();
      try {
        const result = await generateText({
          model: openai.chat(modelName),
          system: systemPrompt,
          prompt: userPrompt,
          abortSignal: AbortSignal.timeout(timeoutMs),
          // O laço abaixo já faz o retry de 429 com backoff, e o LiteLLM tem
          // num_retries próprio. Com o padrão do SDK (2) cada falha virava
          // até 3 × 6 chamadas antes de chegar ao fallback.
          maxRetries: 0,
          ...(maxOutputTokens ? { maxOutputTokens } : {}),
        });
        const { text } = result;
        metricRecorder("llm.latency_ms", Date.now() - startedAt, {
          model: modelName,
          outcome: text ? "success" : "empty",
        });
        metricRecorder("llm.input_tokens", result.usage?.inputTokens ?? 0, {
          model: modelName,
        });
        metricRecorder("llm.output_tokens", result.usage?.outputTokens ?? 0, {
          model: modelName,
        });

        if (!text) {
          log.warn(
            `Empty response from model ${modelName}${isLast ? "" : ", trying fallback model"}`,
          );
          break;
        }
        return text;
      } catch (err: unknown) {
        metricRecorder("llm.latency_ms", Date.now() - startedAt, {
          model: modelName,
          outcome: "error",
        });
        metricRecorder("llm.errors", 1, { model: modelName });
        const errMsg = err instanceof Error ? err.message : String(err);
        const isRateLimit =
          errMsg.includes("429") ||
          errMsg.includes("RESOURCE_EXHAUSTED") ||
          errMsg.includes("RateLimitError") ||
          errMsg.includes("throttling_error");

        if (isRateLimit && attempt < maxAttempts) {
          attempt++;
          log.warn(
            `Rate limit or quota hit on ${modelName}. Retrying attempt ${attempt}/${maxAttempts} in ${delay}ms...`,
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
          delay *= 2;
          continue;
        }

        lastErr = err;
        log.warn(
          `Model ${modelName} failed: ${errMsg}${isLast ? "" : ", trying fallback model"}`,
        );
        break;
      }
    }
  }

  log.error(
    `All LiteLLM models failed (${modelChain.join(", ")}): ${lastErr instanceof Error ? lastErr.message : String(lastErr)}`,
  );
  throw lastErr instanceof Error
    ? lastErr
    : new Error(
        `All LiteLLM models returned empty responses (${modelChain.join(", ")})`,
      );
}
