import { describe, expect, it } from "vitest";
import {
  newModelLaunches,
  rankTrendingModels,
} from "../crawler/model-launches.js";

const NOW = new Date("2026-09-18T12:00:00Z");
const epoch = (daysAgo: number) =>
  Math.floor((NOW.getTime() - daysAgo * 86_400_000) / 1000);

describe("Hugging Face trending models", () => {
  it("ranks by trending score and keys the url by day so a model can trend again", () => {
    const ranked = rankTrendingModels(
      [
        { id: "Qwen/Qwen3.8-27B", trendingScore: 612, likes: 15583 },
        { id: "Edge0/Edge0-35B-A3B-preview", trendingScore: 2462 },
      ],
      "2026-09-18",
    );
    expect(ranked.map((model) => model.title)).toEqual([
      "Edge0/Edge0-35B-A3B-preview",
      "Qwen/Qwen3.8-27B",
    ]);
    expect(ranked[0].url).toBe(
      "https://huggingface.co/Edge0/Edge0-35B-A3B-preview#trending-2026-09-18",
    );
    expect(ranked[0].engagement).toBe(2462);
  });

  it("describes what the model is and how much it is used", () => {
    const [model] = rankTrendingModels(
      [
        {
          id: "deepseek-ai/DeepSeek-V4.1-Flash",
          trendingScore: 1120,
          likes: 3072,
          downloads: 390657,
          pipeline_tag: "image-text-to-text",
        },
      ],
      "2026-09-18",
    );
    expect(model.summary).toContain("image-text-to-text");
    expect(model.summary).toContain("3072 likes");
    expect(model.summary).toContain("390657 downloads");
  });

  it("drops ids that are not owner/name so the url cannot be steered", () => {
    expect(
      rankTrendingModels(
        [
          { id: "../../x", trendingScore: 9 },
          { id: "no-owner", trendingScore: 9 },
          { id: "a/b", trendingScore: 0 },
        ],
        "2026-09-18",
      ),
    ).toEqual([]);
  });
});

describe("OpenRouter model launches", () => {
  const model = (id: string, daysAgo: number, name = id) => ({
    id,
    name,
    created: epoch(daysAgo),
    description: `${name} is a model.`,
    context_length: 262144,
  });

  it("keeps the last two weeks of launches from major vendors, newest first", () => {
    const launches = newModelLaunches(
      [
        model("deepseek/deepseek-v4.1-flash", 8, "DeepSeek: V4.1 Flash"),
        model("openai/gpt-astra", 1, "OpenAI: GPT Astra"),
        model("meta/muse-spark-1.3", 13, "Meta: Muse Spark 1.3"),
        model("anthropic/claude-old", 30),
        model("someone/finetune", 1),
      ],
      NOW,
    );
    expect(launches.map((launch) => launch.title)).toEqual([
      "OpenAI: GPT Astra",
      "DeepSeek: V4.1 Flash",
      "Meta: Muse Spark 1.3",
    ]);
    expect(launches[0].url).toBe("https://openrouter.ai/openai/gpt-astra");
    expect(launches[0].summary).toContain("262144 tokens de contexto");
  });

  it("skips aliases and variants that are not new models", () => {
    expect(
      newModelLaunches(
        [
          model("~openai/gpt-astra-latest", 1),
          model("openai/gpt-astra:free", 1),
        ],
        NOW,
      ),
    ).toEqual([]);
  });
});
