/**
 * Fixtures do IPC do Tauri para os testes de ponta a ponta: sao dados
 * ficticios, nunca um dump do banco real.
 *
 * O `invoke` do `@tauri-apps/api` passa por `window.__TAURI_INTERNALS__`, entao
 * um navegador comum consegue simular o backend sem nenhum gancho no app.
 */
export const overview = {
  health: {
    status: "degraded",
    reasons: ["failed cycles in 24h", "no recent primary sources"],
  },
  stats: {
    pendingNotifications: 2,
    stalePendingNotifications: 0,
    deadLetterNotifications: 0,
    failedCycles24h: 1,
    staleRunningCycles: 0,
    successfulCycles24h: 11,
    recentArticles: 384,
    recentPrimarySources: 6,
  },
  day: "2026-10-17",
  editionsToday: 2,
  dailyEditionsTarget: 3,
  activeRun: null,
  runsEnabled: true,
  latestEditions: [
    {
      slug: "agentes-de-codigo-em-producao",
      title: "Agentes de código em produção",
      url: "https://exemplo.test/artigos/agentes-de-codigo-em-producao.html",
      date: "2026-10-17",
      summary: "Edição do dia com cinco assuntos.",
      tags: ["ai", "agents"],
      kind: "article",
      period: null,
      notificationStatus: "delivered",
      notificationAttempts: 1,
      notificationError: null,
      editorialMetrics: { considered: 42, selected: 6, rejected: 36, primarySources: 3 },
      publishedAt: "2026-10-17 12:05:00",
    },
    {
      slug: "radar-2026-10-16",
      title: "Radar 16/10",
      url: "https://exemplo.test/reports/radar-2026-10-16.html",
      date: "2026-10-16",
      summary: "Varredura entre fontes.",
      tags: ["radar"],
      kind: "report",
      period: "radar",
      notificationStatus: "pending",
      notificationAttempts: 2,
      notificationError: "Telegram API 429",
      editorialMetrics: { considered: 88, selected: 24, rejected: 64, primarySources: 9 },
      publishedAt: "2026-10-16 21:00:00",
    },
  ],
  lastCycles: [
    {
      id: 412,
      type: "daily",
      status: "succeeded",
      metrics: { published: 1 },
      error: null,
      startedAt: "2026-10-17 12:00:00",
      finishedAt: "2026-10-17 12:05:00",
      durationSeconds: 300,
    },
    {
      id: 411,
      type: "radar",
      status: "failed",
      metrics: {},
      error: "feed unavailable after 3 attempts",
      startedAt: "2026-10-17 11:30:00",
      finishedAt: "2026-10-17 11:31:00",
      durationSeconds: 60,
    },
  ],
  sources: { total: 51, failing: 4, primary: 12 },
  intelligence: {
    day: "2026-10-16",
    capturedAt: "2026-10-16 09:00:00",
    topModel: "Modelo Exemplo 3",
    topScore: 61.4,
    models: [],
  },
};

export const meta = {
  runMode: "API",
  timezone: "America/Sao_Paulo",
  dailyEditions: 3,
  schedule: {
    crawlIntervalMinutes: 40,
    articleCron: "0 8,13,18 * * *",
    radarCron: "0 21 * * *",
    modelAlertCron: "*/30 * * * *",
  },
  database: { path: "/app/data/knowledge.db" },
  runsEnabled: true,
  runnableModes: ["CRAWL", "DAILY", "RADAR", "TECHLEAD", "DEV_TIPS", "EBOOK"],
  startedAt: "2026-10-17T09:00:00.000Z",
  uptimeSeconds: 4 * 3600 + 25 * 60,
};

export const editions = {
  total: 2,
  items: overview.latestEditions,
};

export const sources = {
  days: 7,
  items: [
    {
      source: "Anthropic News",
      primary: true,
      recentArticles: 8,
      lastSeenAt: "2026-10-17 11:50:00",
      consecutiveFailures: 0,
      skipRemaining: 0,
      healthUpdatedAt: "2026-10-17 11:50:00",
    },
    {
      source: "Reddit: LocalLLaMA",
      primary: false,
      recentArticles: 5,
      lastSeenAt: "2026-10-17 10:20:00",
      consecutiveFailures: 3,
      skipRemaining: 2,
      healthUpdatedAt: "2026-10-17 10:20:00",
    },
    {
      source: "Fonte Quebrada",
      primary: false,
      recentArticles: 0,
      lastSeenAt: null,
      consecutiveFailures: 6,
      skipRemaining: 4,
      healthUpdatedAt: "2026-10-16 18:00:00",
    },
  ],
};

export const articles = {
  days: 7,
  total: 2,
  items: [
    {
      id: 1,
      title: "Modelo Exemplo 3 chega com janela de 1M tokens",
      source: "Anthropic News",
      url: "https://exemplo.test/noticias/modelo-exemplo-3",
      summary: "Resumo curto da notícia.",
      tags: ["ai"],
      engagementScore: 128,
      crawledAt: "2026-10-17 11:50:00",
      primary: true,
    },
    {
      id: 2,
      title: "Relato de uso em produção",
      source: "Reddit: LocalLLaMA",
      url: "https://exemplo.test/r/1",
      summary: "",
      tags: [],
      engagementScore: 34,
      crawledAt: "2026-10-17 10:20:00",
      primary: false,
    },
  ],
};

export const cycles = {
  total: 2,
  items: overview.lastCycles,
};

export const prompts = {
  active: {
    prompt:
      "Você escreve em português brasileiro, cita as fontes com URL e nunca inventa fatos.",
    chars: 88,
    updatedAt: "2026-10-15 08:30:00",
  },
  items: [
    {
      id: 7,
      score: 95,
      status: "promoted",
      reason: "candidate passed policy gate 95/95",
      createdAt: "2026-10-15 08:30:00",
      promptChars: 88,
    },
    {
      id: 6,
      score: 62,
      status: "rejected",
      reason: "prompt policy regression: candidate=62, required=95",
      createdAt: "2026-10-14 19:10:00",
      promptChars: 140,
    },
  ],
};

export const metrics = {
  hours: 48,
  summary: [
    {
      name: "llm.latency_ms",
      samples: 12,
      average: 24807.5,
      minimum: 9100,
      maximum: 61000,
      lastRecorded: "2026-10-17 12:00:00",
    },
    {
      name: "editorial.quality_score",
      samples: 2,
      average: 84,
      minimum: 80,
      maximum: 88,
      lastRecorded: "2026-10-17 12:00:00",
    },
  ],
  points: [],
};

export const metricSeries = {
  hours: 48,
  summary: metrics.summary.slice(0, 1),
  points: [9100, 15400, 24800, 61000, 22500, 19800, 24300, 21100].map((value, index) => ({
    value,
    labels: { type: "daily" },
    recordedAt: `2026-10-17 1${index % 10}:00:00`,
  })),
};

export const editionDetail = {
  edition: {
    ...overview.latestEditions[0],
    editorialMetrics: {
      considered: 42,
      selected: 6,
      rejected: 36,
      buckets: { labs: 4 },
      primarySources: 3,
    },
  },
  evidence: [
    {
      sourceUrl: "https://exemplo.test/noticias/modelo-exemplo-3",
      sourceTitle: "Modelo Exemplo 3 chega com janela de 1M tokens",
      excerpt: "O anúncio cita ganhos de 30% em tarefas longas.",
      observedAt: "2026-10-17 09:00:00",
    },
  ],
};

export const settingsView = { baseUrl: "http://127.0.0.1:8787", hasToken: true };

export const runAccepted = {
  accepted: true,
  run: { mode: "DAILY", pid: 4242, startedAt: "2026-10-17T12:30:00.000Z" },
};

export const responses: Record<string, unknown> = {
  settings_get: settingsView,
  settings_save: settingsView,
  settings_test: meta,
  overview,
  health: { ...overview.health, stats: overview.stats, checkedAt: "2026-10-17T12:30:00.000Z" },
  meta,
  editions,
  edition_detail: editionDetail,
  articles,
  sources,
  cycles,
  prompts,
  metrics,
  run_start: runAccepted,
  open_external: null,
};

export type FixtureOverrides = Record<string, unknown>;
