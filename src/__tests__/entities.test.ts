import { describe, expect, it, vi } from "vitest";
import { extractEntityTags } from "../agent/entities.js";

const config = { apiKey: "test-key", model: "urchade/gliner_multi-v2.1" };

describe("extractEntityTags", () => {
  it("returns [] without an API key, never calling the network", async () => {
    const fetchImpl = vi.fn();
    const tags = await extractEntityTags(
      "Kubernetes lanca versao 2.0",
      {
        apiKey: "",
        model: config.model,
      },
      fetchImpl,
    );
    expect(tags).toEqual([]);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("slugifies and filters low-confidence entities from the API response", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        { text: "Kubernetes", label: "tecnologia", score: 0.91 },
        { text: "Ana Silva", label: "pessoa", score: 0.2 },
        { text: "OpenAI", label: "empresa", score: 0.75 },
      ],
    });
    const tags = await extractEntityTags(
      "Kubernetes e OpenAI anunciaram parceria",
      config,
      fetchImpl,
    );
    expect(tags).toEqual(["kubernetes", "openai"]);
  });

  it("returns [] when the API errors", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false });
    const tags = await extractEntityTags("texto qualquer", config, fetchImpl);
    expect(tags).toEqual([]);
  });

  it("returns [] on network failure or timeout instead of throwing", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error("network down"));
    const tags = await extractEntityTags("texto qualquer", config, fetchImpl);
    expect(tags).toEqual([]);
  });
});
