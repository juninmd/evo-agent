import { describe, expect, it } from "vitest";
import {
  cycleStatusLabel,
  editionKindLabel,
  healthReasonLabel,
  runModeLabel,
  t,
} from "./i18n";

describe("runModeLabel", () => {
  // Os tipos chegam em minusculas do banco e em maiusculas das configuracoes:
  // as duas formas precisam render o mesmo rotulo.
  it("capitalizes a mode in either case", () => {
    expect(runModeLabel("daily")).toBe("Daily");
    expect(runModeLabel("DAILY")).toBe("Daily");
    expect(runModeLabel("radar")).toBe("Radar");
    expect(runModeLabel("RADAR")).toBe("Radar");
  });

  it("splits an underscored mode into words", () => {
    expect(runModeLabel("dev_tips")).toBe("Dev Tips");
    expect(runModeLabel("DEV_TIPS")).toBe("Dev Tips");
    expect(runModeLabel("model_alerts")).toBe("Model Alerts");
  });
});

describe("healthReasonLabel", () => {
  it("translates the reasons that travel in English", () => {
    expect(healthReasonLabel("no successful cycle in 24h")).toBe(
      "nenhum ciclo concluído em 24h",
    );
    expect(healthReasonLabel("stale running cycles")).toBe(
      "ciclos presos em execução",
    );
  });

  it("passes an unknown reason through instead of hiding it", () => {
    expect(healthReasonLabel("something new from the agent")).toBe(
      "something new from the agent",
    );
  });
});

describe("labels", () => {
  it("names a report with its period", () => {
    expect(editionKindLabel({ kind: "article", period: null })).toBe(
      "Edição diária",
    );
    expect(editionKindLabel({ kind: "report", period: "radar" })).toBe(
      "Relatório: radar",
    );
  });

  it("falls back to the raw status when the API adds one we do not know", () => {
    expect(cycleStatusLabel("succeeded")).toBe("Sucesso");
    expect(cycleStatusLabel("cancelled")).toBe("cancelled");
  });
});

describe("t", () => {
  it("substitutes named parameters and leaves unknown placeholders alone", () => {
    expect(t("editions.count", { total: 12 })).toBe("12 publicações");
    expect(t("metrics.hours", { hours: 48 })).toBe("48 h");
  });
});

describe("t() plurals", () => {
  // "1 ciclos com falha em 24h" is what the overview showed with a single failure.
  it("uses the singular form only for exactly 1", () => {
    expect(t("attention.failedCycles", { count: 1 })).toBe(
      "1 ciclo com falha em 24h",
    );
    expect(t("attention.failedCycles", { count: 2 })).toBe(
      "2 ciclos com falha em 24h",
    );
    expect(t("attention.failedCycles", { count: 0 })).toBe(
      "0 ciclos com falha em 24h",
    );
  });

  it("reads the count from whichever placeholder the entry uses", () => {
    expect(t("editions.count", { total: 1 })).toBe("1 publicação");
    expect(t("sources.days", { days: 1 })).toBe("1 dia");
    expect(t("editions.evidenceHint", { count: 1 })).toBe(
      "1 fonte citada nesta publicação",
    );
  });

  // formatCount renders 1000 as "1.000" in pt-BR: that is not a singular.
  it("does not mistake a formatted thousand for 1", () => {
    expect(t("overview.sourcesTotal", { count: "1.000" })).toBe("1.000 fontes");
    expect(t("overview.sourcesTotal", { count: "1" })).toBe("1 fonte");
  });
});
