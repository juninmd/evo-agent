import { expect, test, type Page } from "@playwright/test";
import { metricSeries, responses, settingsView } from "./fixtures";

/**
 * O `invoke` do `@tauri-apps/api` entrega tudo a `window.__TAURI_INTERNALS__`,
 * entao o backend e simulado sem nenhum gancho no app.
 */
async function mockIpc(page: Page, overrides: Record<string, unknown> = {}) {
  const fixtures = { ...responses, metricSeries, ...overrides };
  await page.addInitScript((all) => {
    (window as unknown as { __EVO_FIXTURES__: unknown }).__EVO_FIXTURES__ = all;
    (window as unknown as { __TAURI_INTERNALS__: unknown }).__TAURI_INTERNALS__ = {
      invoke: (command: string, args: { name?: string } | undefined) => {
        const fixtures = (window as unknown as { __EVO_FIXTURES__: Record<string, unknown> })
          .__EVO_FIXTURES__;
        // A serie de uma metrica so vem quando o nome e pedido.
        if (command === "metrics" && args?.name) {
          return Promise.resolve(fixtures.metricSeries);
        }
        return Promise.resolve(fixtures[command] ?? null);
      },
    };
  }, fixtures);
}

async function open(page: Page, overrides: Record<string, unknown> = {}) {
  await mockIpc(page, overrides);
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Console do Evo Agent" })).toBeVisible();
}

test("visão geral mostra saúde, contadores e execução manual", async ({ page }) => {
  await open(page);

  await expect(page.getByText("Degradado")).toBeVisible();
  // Os motivos chegam em ingles do contrato de /health e a UI traduz.
  await expect(
    page.getByRole("listitem").filter({ hasText: "ciclos com falha em 24h" }),
  ).toBeVisible();
  await expect(
    page.getByRole("listitem").filter({ hasText: "nenhuma fonte primária recente" }),
  ).toBeVisible();
  await expect(page.getByText("2/3")).toBeVisible();
  await expect(page.getByText("384")).toBeVisible();
  // runsEnabled=true no fixture: os botoes respondem.
  await expect(page.getByRole("button", { name: "Daily" })).toBeEnabled();
  await expect(page.getByRole("button", { name: "Crawl" })).toBeEnabled();
  await expect(page.getByText("Agentes de código em produção")).toBeVisible();
  await expect(page.getByText("feed unavailable after 3 attempts")).toBeVisible();

  await page.screenshot({ path: "../docs/prints/console-visao-geral.png", fullPage: true });
});

test("navega por todas as seções", async ({ page }) => {
  await open(page);

  await page.getByRole("tab", { name: "Edições" }).click();
  await expect(page.getByText("2026-10-17 · agentes-de-codigo-em-producao")).toBeVisible();
  await page.getByRole("button", { name: "Agentes de código em produção" }).click();
  await expect(page.getByText("Modelo Exemplo 3 chega com janela de 1M tokens")).toBeVisible();
  await expect(
    page.getByText("O anúncio cita ganhos de 30% em tarefas longas."),
  ).toBeVisible();
  await page.screenshot({ path: "../docs/prints/console-edicoes.png", fullPage: true });

  await page.getByRole("tab", { name: "Fontes" }).click();
  await expect(page.getByRole("cell", { name: "Reddit: LocalLLaMA" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "Fonte Quebrada" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Modelo Exemplo 3 chega com janela de 1M tokens" }),
  ).toBeVisible();
  await page.screenshot({ path: "../docs/prints/console-fontes.png", fullPage: true });

  await page.getByRole("tab", { name: "Ciclos" }).click();
  await expect(page.getByRole("cell", { name: "300 s" })).toBeVisible();
  await page.screenshot({ path: "../docs/prints/console-ciclos.png", fullPage: true });

  await page.getByRole("tab", { name: "Prompts" }).click();
  await expect(page.getByText(/88 caracteres/)).toBeVisible();
  await expect(page.getByRole("cell", { name: "95", exact: true })).toBeVisible();
  await expect(page.getByText(/candidate passed policy gate/)).toBeVisible();
  await expect(page.getByText(/prompt policy regression/)).toBeVisible();
  await page.getByRole("button", { name: "Mostrar" }).click();
  await expect(page.getByText("Você escreve em português brasileiro")).toBeVisible();
  await page.screenshot({ path: "../docs/prints/console-prompts.png", fullPage: true });

  await page.getByRole("tab", { name: "Métricas" }).click();
  await expect(page.getByText("llm.latency_ms")).toBeVisible();
  await page.getByRole("button", { name: "llm.latency_ms" }).click();
  await expect(page.getByRole("img", { name: "llm.latency_ms" })).toBeVisible();
  await page.screenshot({ path: "../docs/prints/console-metricas.png", fullPage: true });

  await page.getByRole("tab", { name: "Ajustes" }).click();
  await expect(page.getByText("/app/data/knowledge.db")).toBeVisible();
  await expect(page.getByText("America/Sao_Paulo")).toBeVisible();
  await expect(page.getByText("habilitado (6 modos)")).toBeVisible();
  await page.screenshot({ path: "../docs/prints/console-ajustes.png", fullPage: true });
});

test("as abas respondem ao teclado", async ({ page }) => {
  await open(page);

  await page.getByRole("tab", { name: "Visão geral" }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("tab", { name: "Edições" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await page.keyboard.press("End");
  await expect(page.getByRole("tab", { name: "Ajustes" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("tab", { name: "Visão geral" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
});

test("sem token salvou, o console pede a configuração e esconde as abas", async ({ page }) => {
  await open(page, { settings_get: { ...settingsView, hasToken: false } });

  await expect(page.getByText("Informe a URL e o token do agente para começar.")).toBeVisible();
  await expect(page.getByRole("tablist")).toHaveCount(0);
  await page.screenshot({ path: "../docs/prints/console-sem-configuracao.png", fullPage: true });
});

test("com o disparo desligado no agente, os botões ficam inertes", async ({ page }) => {
  await open(page, {
    overview: { ...responses.overview, runsEnabled: false } as Record<string, unknown>,
  });

  await expect(page.getByRole("button", { name: "Daily" })).toBeDisabled();
  await expect(page.getByText(/API_ALLOW_RUNS/)).toBeVisible();
});

test("uma falha da API mantém o painel anterior e oferece repetir", async ({ page }) => {
  await mockIpc(page);
  await page.goto("/");
  await expect(page.getByText("Degradado")).toBeVisible();

  // A partir daqui toda leitura de overview falha.
  await page.evaluate(() => {
    const internals = (window as unknown as { __TAURI_INTERNALS__: { invoke: unknown } })
      .__TAURI_INTERNALS__;
    internals.invoke = (command: string) =>
      command === "overview"
        ? Promise.reject("sem conexão com o agente")
        : Promise.resolve(null);
  });
  await page.getByRole("button", { name: "Atualizar" }).click();

  await expect(page.getByText(/sem conexão com o agente/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Tentar de novo" })).toBeVisible();
});
