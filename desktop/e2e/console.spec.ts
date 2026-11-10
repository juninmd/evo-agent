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

/**
 * Captura para docs/prints. As animacoes de entrada sao adiantadas ate o fim:
 * um print no meio do traco mostraria meio grafico.
 */
async function shot(page: Page, name: string) {
  await page.screenshot({
    path: `../docs/prints/${name}.png`,
    fullPage: true,
    animations: "disabled",
  });
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

  // O medidor diz o mesmo que o "2/3", para quem nao ve a barra.
  const progress = page.getByRole("meter", {
    name: "Edições publicadas hoje frente à meta",
  });
  await expect(progress).toHaveAttribute("aria-valuenow", "2");
  await expect(progress).toHaveAttribute("aria-valuemax", "3");
  // Saude das fontes: 47 saudaveis + 4 com falha = 51 acompanhadas.
  await expect(
    page.getByRole("img", { name: /Saudáveis: 47, Com falha: 4/ }),
  ).toBeVisible();
  // A fita le no sentido do tempo: a falha do radar vem antes do daily.
  await expect(
    page.getByRole("list", { name: /Radar: Falha, Daily: Sucesso/ }),
  ).toBeVisible();

  await shot(page, "console-visao-geral");

  // A segunda dobra: ultimas edicoes e a fita de estados dos ciclos.
  await page.getByRole("heading", { name: "Últimos ciclos" }).scrollIntoViewIfNeeded();
  await page.getByRole("tabpanel").evaluate((panel) => {
    panel.scrollTop = panel.scrollHeight;
  });
  await shot(page, "console-visao-geral-ciclos");
});

test("o calendário mostra a meta diária e os dias sem edição", async ({ page }) => {
  await open(page);

  await expect(
    page.getByRole("heading", { name: "Calendário de publicações" }),
  ).toBeVisible();
  await expect(page.getByText("Últimos 35 dias · meta diária de 3")).toBeVisible();
  await expect(page.getByText(/dias com a meta de 3 batida/)).toBeVisible();
  await expect(page.getByText("3 dias sem edição")).toBeVisible();
  // Hoje (17/10) ainda esta em andamento: 2 de 3.
  const today = page.getByRole("img", { name: "17/10: 2 edições de 3" });
  await expect(today).toBeVisible();
  await expect(today).toHaveAttribute("data-today", "true");
  await expect(
    page.getByRole("img", { name: /03\/10: .* 1 notificação falhou/ }),
  ).toBeVisible();

  // O mesmo detalhe do hover chega pelo teclado: End vai ao ultimo dia.
  const grid = page.getByRole("application", {
    name: /Calendário de publicações/,
  });
  await grid.focus();
  await page.keyboard.press("End");
  await expect(grid.locator("[data-active=true]")).toHaveText("17");
  await page.keyboard.press("ArrowUp");
  await expect(grid.locator("[data-active=true]")).toHaveText("10");
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
  // Qualidade, ciclo de vida e revisoes vem da API e eram descartados.
  await expect(
    page.getByRole("meter", { name: "Pontuação editorial: 84 de 100" }),
  ).toBeVisible();
  await expect(page.getByText("Corrigida").first()).toBeVisible();
  await expect(
    page.getByText("6 de 42 fontes consideradas entraram na edição"),
  ).toBeVisible();
  await expect(
    page.getByRole("img", {
      name: /Funil editorial\. Primárias: 3, Outras selecionadas: 3, Rejeitadas: 36/,
    }),
  ).toBeVisible();
  await expect(page.getByText("Histórico de revisões")).toBeVisible();
  await expect(page.getByText("· atualização")).toBeVisible();
  await shot(page, "console-edicoes");

  await page.getByRole("tab", { name: "Fontes" }).click();
  await expect(page.getByRole("cell", { name: "Reddit: LocalLLaMA" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "Fonte Quebrada" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Modelo Exemplo 3 chega com janela de 1M tokens" }),
  ).toBeVisible();
  await shot(page, "console-fontes");

  await page.getByRole("tab", { name: "Ciclos" }).click();
  await expect(page.getByRole("cell", { name: "300 s" })).toBeVisible();
  // O tipo vem em minusculas do banco e o rotulo tem que sair capitalizado.
  await expect(page.getByRole("cell", { name: "Daily", exact: true })).toBeVisible();
  await expect(page.getByRole("cell", { name: "Radar", exact: true })).toBeVisible();
  // Resumo da lista carregada: 20 sucessos em 23 concluidos (1 foi ignorado).
  const summary = page.getByRole("region", { name: "Resumo dos ciclos listados" });
  await expect(summary.getByText("87%")).toBeVisible();
  await expect(summary.getByText("20 de 23 concluídos")).toBeVisible();
  await expect(page.getByRole("img", { name: "Duração por ciclo" })).toBeVisible();
  // Cada coluna responde ao ponteiro com o ciclo que representa.
  await page.getByTestId("cycle-bar").last().hover();
  await expect(page.locator(".evo-tooltip")).toContainText("Daily · 5 min");
  await expect(page.locator(".evo-tooltip")).toContainText("Sucesso");
  await shot(page, "console-ciclos");

  await page.getByRole("tab", { name: "Prompts" }).click();
  await expect(page.getByText(/88 caracteres/)).toBeVisible();
  await expect(page.getByRole("cell", { name: "95", exact: true })).toBeVisible();
  await expect(page.getByText(/candidate passed policy gate/)).toBeVisible();
  await expect(page.getByText(/prompt policy regression/)).toBeVisible();
  await page.getByRole("button", { name: "Mostrar" }).click();
  await expect(page.getByText("Você escreve em português brasileiro")).toBeVisible();
  await shot(page, "console-prompts");

  await page.getByRole("tab", { name: "Métricas" }).click();
  await expect(page.getByText("llm.latency_ms")).toBeVisible();
  await page.getByRole("button", { name: "llm.latency_ms" }).click();
  const chart = page.getByRole("img", { name: /llm\.latency_ms/ });
  await expect(chart).toBeVisible();
  // Eixo em marcas redondas, e o resumo da serie ao lado.
  await expect(chart.getByText("60 mil")).toBeVisible();
  await expect(page.getByRole("button", { name: "Copiar CSV" })).toBeVisible();
  await expect(page.getByText("19 leituras", { exact: true })).toBeVisible();
  // Nitidez: uma unidade do viewBox e um pixel CSS, entao nada e esticado.
  const scale = await chart.evaluate((node) => {
    const svg = node as SVGSVGElement;
    return svg.viewBox.baseVal.width / svg.getBoundingClientRect().width;
  });
  expect(scale).toBeCloseTo(1, 2);
  // O cursor gruda na leitura mais proxima do ponteiro.
  const box = await chart.boundingBox();
  if (!box) throw new Error("grafico sem caixa");
  await page.mouse.move(box.x + box.width * 0.55, box.y + box.height / 2);
  await expect(page.getByTestId("chart-cursor")).toBeVisible();
  await expect(page.locator(".evo-tooltip")).toContainText("61.000");
  await shot(page, "console-metricas");

  await page.getByRole("tab", { name: "Ajustes" }).click();
  await expect(page.getByText("/app/data/knowledge.db")).toBeVisible();
  await expect(page.getByText("America/Sao_Paulo")).toBeVisible();
  await expect(page.getByText("habilitado (6 modos)")).toBeVisible();
  await shot(page, "console-ajustes");
});

test("as abas sinalizam o que exige olhar", async ({ page }) => {
  await open(page);

  // Os badges saem da visao geral: 2 pendentes, 4 fontes com falha, 1 ciclo falho.
  await expect(page.getByRole("tab", { name: /2 notificações/ })).toBeVisible();
  await expect(page.getByRole("tab", { name: /4 fontes com falha/ })).toBeVisible();
  await expect(page.getByRole("tab", { name: /1 ciclo com falha/ })).toBeVisible();
});

test("sem nada pendente, nenhuma aba ganha badge", async ({ page }) => {
  await open(page, {
    overview: {
      ...responses.overview,
      stats: {
        ...responses.overview.stats,
        pendingNotifications: 0,
        deadLetterNotifications: 0,
        failedCycles24h: 0,
      },
      sources: { total: 51, failing: 0, primary: 12 },
    },
  });

  await expect(page.getByRole("tab", { name: /notificações/ })).toHaveCount(0);
  await expect(page.getByRole("tab", { name: /fontes? com falha/ })).toHaveCount(0);
  await expect(page.getByRole("tab", { name: /ciclos? com falha/ })).toHaveCount(0);
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

test("o tema claro troca as cores, não só o atributo", async ({ page }) => {
  await mockIpc(page);
  await page.addInitScript(() =>
    localStorage.setItem("evo-console.theme", "claro"),
  );
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Console do Evo Agent" })).toBeVisible();

  await expect(page.locator("html")).toHaveAttribute("data-skin", "claro");
  // O token precisa chegar ao fundo: um atributo trocado com a skin antiga
  // deixaria o texto escuro sobre fundo escuro.
  const background = await page.evaluate(
    () => getComputedStyle(document.body).backgroundColor,
  );
  expect(background).toBe("rgb(241, 245, 249)");

  await page.getByRole("tab", { name: "Fontes" }).click();
  await expect(page.getByRole("cell", { name: "Reddit: LocalLLaMA" })).toBeVisible();
  await shot(page, "console-tema-claro");

  // Os graficos usam os mesmos tokens: no tema claro o traco e o verde escuro.
  await page.getByRole("tab", { name: "Métricas" }).click();
  await page.getByRole("button", { name: "llm.latency_ms" }).click();
  const line = page.locator(".evo-chart-line");
  await expect(line).toBeVisible();
  expect(await line.evaluate((node) => getComputedStyle(node).stroke)).toBe(
    "rgb(21, 128, 61)",
  );
  await shot(page, "console-metricas-tema-claro");

  await page.getByRole("tab", { name: "Visão geral" }).click();
  await expect(page.getByText("Calendário de publicações")).toBeVisible();
  await shot(page, "console-visao-geral-tema-claro");
});

test("sem token salvou, o console pede a configuração e esconde as abas", async ({ page }) => {
  await open(page, { settings_get: { ...settingsView, hasToken: false } });

  await expect(
    page.getByText("Informe a URL e o token do agente para começar."),
  ).toBeVisible();
  await expect(page.getByRole("tablist")).toHaveCount(0);
  // Nada para conectar: o card de conexao nao pode ficar carregando para sempre.
  await expect(page.getByText("Conexão do agente")).toHaveCount(0);
  await expect(page.getByRole("group", { name: "Tema" })).toBeVisible();
  await shot(page, "console-sem-configuracao");
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

test("o gráfico de métricas se lê pelo teclado", async ({ page }) => {
  await open(page);
  await page.getByRole("tab", { name: "Métricas" }).click();
  await page.getByRole("button", { name: "llm.latency_ms" }).click();

  const chart = page.getByRole("application", { name: /llm\.latency_ms/ });
  await chart.focus();
  // A primeira seta pousa na leitura mais recente; Home volta a primeira.
  await page.keyboard.press("ArrowLeft");
  await expect(chart.locator("[aria-live]")).toHaveText("21.100 em 17/10, 10:00");
  await page.keyboard.press("Home");
  await expect(chart.locator("[aria-live]")).toHaveText("9.100 em 16/10, 16:00");
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("chart-cursor")).toHaveCount(0);
});

test("atalhos trocam de aba e atualizam, sem roubar a digitação", async ({ page }) => {
  await open(page);

  await page.keyboard.press("4");
  await expect(page.getByRole("tab", { name: /Ciclos/ })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(page.getByRole("tab", { name: /Ciclos/ })).toBeFocused();

  // `r` rele a visao geral: a chamada chega ao IPC.
  await page.evaluate(() => {
    const scope = window as unknown as {
      __TAURI_INTERNALS__: { invoke: (command: string, args: unknown) => unknown };
      __EVO_CALLS__: string[];
    };
    const original = scope.__TAURI_INTERNALS__.invoke;
    scope.__EVO_CALLS__ = [];
    scope.__TAURI_INTERNALS__.invoke = (command, args) => {
      scope.__EVO_CALLS__.push(command);
      return original(command, args);
    };
  });
  await page.keyboard.press("r");
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as unknown as { __EVO_CALLS__: string[] }).__EVO_CALLS__,
      ),
    )
    .toContain("overview");

  // Num campo de texto, "1" e um caractere.
  await page.keyboard.press("7");
  const url = page.getByLabel("URL da API");
  await url.fill("");
  await url.pressSequentially("http://10.0.0.1");
  await expect(url).toHaveValue("http://10.0.0.1");
  await expect(page.getByRole("tab", { name: "Ajustes" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
});

test("o marcador da aba ativa desliza até a aba escolhida", async ({ page }) => {
  await open(page);

  const marker = page.getByTestId("tab-marker");
  await expect(marker).toBeVisible();
  const before = await marker.boundingBox();
  await page.getByRole("tab", { name: "Métricas" }).click();
  const tab = await page.getByRole("tab", { name: "Métricas" }).boundingBox();
  if (!before || !tab) throw new Error("marcador sem caixa");
  // Depois da transicao o marcador fica sob a aba nova, com a largura dela.
  await expect
    .poll(async () => Math.round((await marker.boundingBox())?.x ?? 0))
    .toBe(Math.round(tab.x + 8));
  expect((await marker.boundingBox())?.x).toBeGreaterThan(before.x);
});

test("com menos movimento pedido, nada anima e tudo continua visível", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await open(page);
  await page.getByRole("tab", { name: "Métricas" }).click();
  await page.getByRole("button", { name: "llm.latency_ms" }).click();

  const line = page.locator(".evo-chart-line");
  await expect(line).toBeVisible();
  const style = await line.evaluate((node) => {
    const computed = getComputedStyle(node);
    return {
      duration: Number.parseFloat(computed.animationDuration),
      offset: Number.parseFloat(computed.strokeDashoffset),
    };
  });
  // Duracao desprezivel e o traco ja inteiro: o estado final, sem o caminho.
  expect(style.duration).toBeLessThan(0.001);
  await expect
    .poll(() =>
      line.evaluate((node) =>
        Number.parseFloat(getComputedStyle(node).strokeDashoffset),
      ),
    )
    .toBe(0);
});

test("as capturas saem em densidade 2x", async ({ page }) => {
  await open(page);
  expect(await page.evaluate(() => window.devicePixelRatio)).toBe(2);
});
