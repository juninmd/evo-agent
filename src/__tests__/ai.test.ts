import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const generateText = vi.fn();

vi.mock("ai", () => ({
  generateText: (...args: unknown[]) => generateText(...args),
}));

vi.mock("@ai-sdk/openai", () => ({
  createOpenAI: () => ({
    chat: (name: string) => ({ modelId: name }),
  }),
}));

vi.mock("../config.js", () => ({
  config: {
    litellm: {
      apiBase: "http://test/v1",
      apiKey: "test-key",
      model: "primary",
      fallbackModels: ["fallback-1", "fallback-2"],
      timeoutMs: 60000,
      maxOutputTokens: 100,
    },
  },
}));

import { ask } from "../utils/ai.js";

describe("ask", () => {
  beforeEach(() => {
    generateText.mockReset();
    for (const key of [
      "LITELLM_MODEL",
      "OPENCODE_MODEL",
      "LITELLM_API_BASE",
      "OPENCODE_API_BASE",
    ]) {
      Reflect.deleteProperty(process.env, key);
    }
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns text from the primary model on success", async () => {
    generateText.mockResolvedValueOnce({ text: "ok" });
    await expect(ask("prompt")).resolves.toBe("ok");
    expect(generateText).toHaveBeenCalledTimes(1);
    expect(generateText.mock.calls[0][0].model.modelId).toBe("primary");
  });

  it("falls back to the next model when the primary fails", async () => {
    generateText
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValueOnce({ text: "from fallback" });
    await expect(ask("prompt")).resolves.toBe("from fallback");
    expect(generateText).toHaveBeenCalledTimes(2);
    expect(generateText.mock.calls[1][0].model.modelId).toBe("fallback-1");
  });

  it("treats empty text as failure and tries the next model", async () => {
    generateText
      .mockResolvedValueOnce({ text: "" })
      .mockResolvedValueOnce({ text: "recovered" });
    await expect(ask("prompt")).resolves.toBe("recovered");
    expect(generateText).toHaveBeenCalledTimes(2);
  });

  it("throws when every model returns empty text", async () => {
    generateText.mockResolvedValue({ text: "" });
    await expect(ask("prompt")).rejects.toThrow(/empty responses/);
    expect(generateText).toHaveBeenCalledTimes(3);
  });

  it("throws the last error when every model fails", async () => {
    generateText.mockRejectedValue(new Error("all down"));
    await expect(ask("prompt")).rejects.toThrow("all down");
    expect(generateText).toHaveBeenCalledTimes(3);
  });

  it("retries the same model on rate limit before falling back", async () => {
    vi.useFakeTimers();
    generateText
      .mockRejectedValueOnce(new Error("429 Too Many Requests"))
      .mockResolvedValueOnce({ text: "after retry" });
    const pending = ask("prompt");
    await vi.advanceTimersByTimeAsync(3000);
    await expect(pending).resolves.toBe("after retry");
    expect(generateText).toHaveBeenCalledTimes(2);
    expect(generateText.mock.calls[1][0].model.modelId).toBe("primary");
  });
});
