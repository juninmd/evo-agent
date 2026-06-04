import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";
import { config } from "../config.js";
import { log } from "./logger.js";

export interface AskOptions {
  maxOutputTokens?: number;
  timeoutMs?: number;
}

export async function ask(
  userPrompt: string,
  systemPrompt?: string,
  options?: AskOptions,
): Promise<string> {
  const apiBase =
    process.env.LITELLM_API_BASE ??
    process.env.OPENCODE_API_BASE ??
    "http://litellm.ai.svc.cluster.local:4000/v1";
  const apiKey =
    process.env.LITELLM_API_KEY ?? process.env.OPENCODE_API_KEY ?? "no-key";
  const primaryModel =
    process.env.LITELLM_MODEL ??
    process.env.OPENCODE_MODEL ??
    config.litellm.model;
  const modelChain = [primaryModel, ...config.litellm.fallbackModels].filter(
    (m, i, arr) => m && arr.indexOf(m) === i,
  );
  const timeoutMs = options?.timeoutMs ?? config.litellm.timeoutMs;
  const maxOutputTokens =
    options?.maxOutputTokens ?? config.litellm.maxOutputTokens;

  const openai = createOpenAI({
    baseURL: apiBase,
    apiKey: apiKey,
  });

  let lastErr: unknown;

  for (let mi = 0; mi < modelChain.length; mi++) {
    const modelName = modelChain[mi];
    const isLast = mi === modelChain.length - 1;
    log.info(`Calling LiteLLM model via AI SDK: ${modelName} via ${apiBase}`);

    let attempt = 0;
    const maxAttempts = 5;
    let delay = 3000;

    while (true) {
      try {
        const { text } = await generateText({
          model: openai.chat(modelName),
          system: systemPrompt,
          prompt: userPrompt,
          abortSignal: AbortSignal.timeout(timeoutMs),
          ...(maxOutputTokens ? { maxOutputTokens } : {}),
        });

        if (!text) {
          log.warn(
            `Empty response from model ${modelName}${isLast ? "" : ", trying fallback model"}`,
          );
          break;
        }
        return text;
      } catch (err: unknown) {
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
  if (lastErr) throw lastErr;
  return "";
}
