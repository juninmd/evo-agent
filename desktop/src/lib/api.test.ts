import { beforeEach, describe, expect, it, vi } from "vitest";

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn(async () => ({})) }));
vi.mock("@tauri-apps/api/core", () => ({ invoke }));

const { api, errText } = await import("./api");

beforeEach(() => {
  invoke.mockClear();
});

describe("api", () => {
  // Renomear um comando de um lado so quebra em runtime; este teste amarra os
  // dois lados de forma explicita.
  it("calls the Rust command names declared in commands.rs", async () => {
    await api.settingsGet();
    expect(invoke).toHaveBeenLastCalledWith("settings_get");

    await api.settingsSave("https://agente.example", null);
    expect(invoke).toHaveBeenLastCalledWith("settings_save", {
      baseUrl: "https://agente.example",
      token: null,
    });

    await api.settingsTest();
    expect(invoke).toHaveBeenLastCalledWith("settings_test");

    await api.overview();
    expect(invoke).toHaveBeenLastCalledWith("overview");

    await api.health();
    expect(invoke).toHaveBeenLastCalledWith("health");

    await api.meta();
    expect(invoke).toHaveBeenLastCalledWith("meta");

    await api.editionDetail("radar-2026-09-22");
    expect(invoke).toHaveBeenLastCalledWith("edition_detail", {
      slug: "radar-2026-09-22",
    });

    await api.prompts();
    expect(invoke).toHaveBeenLastCalledWith("prompts");

    await api.runStart("DAILY");
    expect(invoke).toHaveBeenLastCalledWith("run_start", { mode: "DAILY" });

    await api.openExternal("https://pages.example/a.html");
    expect(invoke).toHaveBeenLastCalledWith("open_external", {
      url: "https://pages.example/a.html",
    });
  });

  it("sends null for an absent filter so the API applies its default", async () => {
    await api.editions();
    expect(invoke).toHaveBeenLastCalledWith("editions", {
      limit: null,
      kind: null,
      status: null,
    });

    await api.editions({ kind: "report", limit: 10 });
    expect(invoke).toHaveBeenLastCalledWith("editions", {
      limit: 10,
      kind: "report",
      status: null,
    });

    await api.cycles({ status: "failed" });
    expect(invoke).toHaveBeenLastCalledWith("cycles", {
      limit: null,
      kind: null,
      status: "failed",
    });

    await api.sources();
    expect(invoke).toHaveBeenLastCalledWith("sources", { days: null });

    await api.articles();
    expect(invoke).toHaveBeenLastCalledWith("articles", {
      days: null,
      limit: null,
      primary: false,
    });

    await api.metrics({ name: "llm.latency_ms", hours: 24 });
    expect(invoke).toHaveBeenLastCalledWith("metrics", {
      name: "llm.latency_ms",
      hours: 24,
    });
  });
});

describe("errText", () => {
  it("passes the pt-BR string from Rust straight through", () => {
    expect(errText("token recusado pela API")).toBe("token recusado pela API");
    expect(errText(new Error("boom"))).toBe("boom");
    expect(errText(42)).toBe("erro inesperado");
  });
});
