import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";
import { log } from "./logger.js";

export async function ask(
  userPrompt: string,
  systemPrompt?: string,
): Promise<string> {
  const apiBase =
    process.env.LITELLM_API_BASE ??
    process.env.OPENCODE_API_BASE ??
    "https://openrouter.ai/api/v1";
  const apiKey =
    process.env.LITELLM_API_KEY ?? process.env.OPENCODE_API_KEY ?? "no-key";
  const modelName =
    process.env.LITELLM_MODEL ?? process.env.OPENCODE_MODEL ?? "z-ai/glm-4-32b";
  const timeoutMs = Number(process.env.LITELLM_TIMEOUT_MS ?? "300000");

  log.info(`Calling LiteLLM model via AI SDK: ${modelName} via ${apiBase}`);

  const openai = createOpenAI({
    baseURL: apiBase,
    apiKey: apiKey,
  });

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
      });

      if (!text) {
        log.warn(`Empty response from LiteLLM model ${modelName}`);
        return "";
      }
      return text;
    } catch (err: unknown) {
      attempt++;
      const errMsg = err instanceof Error ? err.message : String(err);
      const isRateLimit =
        errMsg.includes("429") ||
        errMsg.includes("RESOURCE_EXHAUSTED") ||
        errMsg.includes("RateLimitError") ||
        errMsg.includes("throttling_error");

      if (isRateLimit && attempt < maxAttempts) {
        log.warn(
          `Rate limit or quota hit. Retrying attempt ${attempt}/${maxAttempts} in ${delay}ms...`,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 2;
        continue;
      }

      log.error(`LiteLLM request failed after ${attempt} attempts: ${errMsg}`);
      throw err;
    }
  }
}
