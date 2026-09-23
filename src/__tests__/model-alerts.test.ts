import { describe, expect, it, vi } from "vitest";
import type { CatalogModel, ModelSignal } from "../crawler/model-launches.js";
import {
  MODEL_ALERTS_STATE_KEY,
  runModelAlerts,
} from "../notifier/model-alerts.js";

const NOW = new Date("2026-09-22T12:00:00Z");
const epoch = (daysAgo: number) =>
  Math.floor((NOW.getTime() - daysAgo * 86_400_000) / 1000);

function memoryStore(initial?: string[]) {
  const state = new Map<string, string>();
  if (initial) state.set(MODEL_ALERTS_STATE_KEY, JSON.stringify(initial));
  return {
    state,
    getState: (key: string) => state.get(key) ?? null,
    setState: (key: string, value: string) => void state.set(key, value),
  };
}

const seenUrls = (store: ReturnType<typeof memoryStore>) =>
  JSON.parse(store.state.get(MODEL_ALERTS_STATE_KEY) ?? "[]") as string[];

const catalog: CatalogModel[] = [
  { id: "anthropic/claude-old", name: "Claude Old", created: epoch(3) },
  { id: "openai/gpt-next", name: "GPT Next", created: epoch(0) },
  { id: "random-lab/tiny", name: "Tiny", created: epoch(0) },
];

function run(
  store: ReturnType<typeof memoryStore>,
  send = vi.fn(async (_launch: ModelSignal) => ({ delivered: true })),
  models = catalog,
) {
  return {
    send,
    result: runModelAlerts({
      store,
      fetchCatalog: async () => models,
      send,
      now: NOW,
    }),
  };
}

describe("model launch alerts", () => {
  it("records a baseline on first run instead of flooding the channel", async () => {
    const store = memoryStore();
    const { send, result } = run(store);
    expect(await result).toEqual({ baseline: true, alerted: 0, failed: 0 });
    expect(send).not.toHaveBeenCalled();
    expect(seenUrls(store)).toContain("https://openrouter.ai/openai/gpt-next");
  });

  it("alerts only launches not seen before, from major vendors", async () => {
    const store = memoryStore(["https://openrouter.ai/anthropic/claude-old"]);
    const { send, result } = run(store);
    expect(await result).toMatchObject({ alerted: 1, failed: 0 });
    expect(send.mock.calls.map(([launch]) => launch.title)).toEqual([
      "GPT Next",
    ]);
  });

  it("does not alert the same model twice across runs", async () => {
    const store = memoryStore([]);
    await run(store).result;
    const { send, result } = run(store);
    expect(await result).toMatchObject({ alerted: 0 });
    expect(send).not.toHaveBeenCalled();
  });

  it("keeps an undelivered launch unseen so the next run retries it", async () => {
    const store = memoryStore(["https://openrouter.ai/anthropic/claude-old"]);
    const failing = vi.fn(async () => ({ delivered: false, error: "429" }));
    expect(await run(store, failing).result).toMatchObject({
      alerted: 0,
      failed: 1,
    });
    expect(seenUrls(store)).not.toContain(
      "https://openrouter.ai/openai/gpt-next",
    );
    const { send, result } = run(store);
    expect(await result).toMatchObject({ alerted: 1 });
    expect(send).toHaveBeenCalledOnce();
  });

  it("alerts oldest launch first so the channel reads chronologically", async () => {
    const store = memoryStore([]);
    const { send, result } = run(store);
    await result;
    expect(send.mock.calls.map(([launch]) => launch.title)).toEqual([
      "Claude Old",
      "GPT Next",
    ]);
  });

  it("re-baselines a corrupt state row rather than replaying the window", async () => {
    const store = memoryStore();
    store.state.set(MODEL_ALERTS_STATE_KEY, "{not json");
    const { send, result } = run(store);
    expect(await result).toMatchObject({ baseline: true });
    expect(send).not.toHaveBeenCalled();
  });

  it("propagates catalog fetch failures instead of recording an empty baseline", async () => {
    const store = memoryStore();
    await expect(
      runModelAlerts({
        store,
        fetchCatalog: async () => {
          throw new Error("OpenRouter down");
        },
        send: vi.fn(),
        now: NOW,
      }),
    ).rejects.toThrow("OpenRouter down");
    expect(store.state.has(MODEL_ALERTS_STATE_KEY)).toBe(false);
  });
});
