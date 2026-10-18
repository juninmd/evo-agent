import type { Edition, HealthStatus } from "./types";

/**
 * Texto de interface vive no catalogo, nunca solto no componente: `t()` resolve
 * a chave. Uma chave nova que nao existir aqui quebra o typecheck.
 */
const catalog = {
  "app.title": "Console do Evo Agent",
  "app.subtitle": "API do agente",
  "app.loading": "Carregando…",
  "app.statusLabel": "Saúde do agente",
  "app.refresh": "Atualizar",
  "app.refreshing": "Atualizando…",
  "app.updatedAt": "Atualizado {time}",
  "app.theme.toDark": "Tema escuro",
  "app.theme.toLight": "Tema claro",
  "app.apiHost": "API: {host}",
  "app.unexpectedError": "Erro inesperado",

  "tabs.label": "Seções do console",
  "tabs.overview": "Visão geral",
  "tabs.editions": "Edições",
  "tabs.sources": "Fontes",
  "tabs.cycles": "Ciclos",
  "tabs.prompts": "Prompts",
  "tabs.metrics": "Métricas",
  "tabs.settings": "Ajustes",

  "common.empty": "Nada para mostrar",
  "common.loadFailed": "Não foi possível carregar: {error}",
  "common.retry": "Tentar de novo",
  "common.all": "Todas",
  "common.title": "Título",
  "common.primary": "Primária",
  "common.primaryOnly": "Só primárias",
  "common.yes": "sim",
  "common.no": "não",
  "common.openInBrowser": "Abrir no navegador",
  "common.copy": "Copiar",
  "common.copied": "Copiado",
  "common.show": "Mostrar",
  "common.hide": "Ocultar",
  "common.of": "de",
  "common.loadingShort": "…",

  "health.healthy": "Saudável",
  "health.degraded": "Degradado",
  "health.critical": "Crítico",

  "overview.title": "Visão geral",
  "overview.healthReasons": "Motivos do estado atual",
  "overview.stats": "Operação",
  "overview.editionsToday": "Edições hoje",
  "overview.recentArticles": "Artigos em 48h",
  "overview.primarySources": "Fontes primárias em 48h",
  "overview.cyclesOk": "Ciclos com sucesso em 24h",
  "overview.cyclesFailed": "Ciclos com falha em 24h",
  "overview.pendingNotifications": "Notificações pendentes",
  "overview.deadLetter": "Notificações em dead-letter",
  "overview.staleRunning": "Ciclos presos em execução",
  "overview.stalePending": "Notificações presas no outbox",
  "overview.sources": "Fontes",
  "overview.sourcesHint":
    "{failing} com falha de {total} acompanhadas · {primary} primárias",
  "overview.sourcesFailing": "{count} com falha",
  "overview.sourcesPrimary": "{count} primária|{count} primárias",
  "overview.sourcesTotal": "{count} fonte|{count} fontes",
  "overview.intelligence": "Ranking de modelos",
  "overview.intelligenceHint": "Medido em {day}",
  "overview.latestEditions": "Últimas edições",
  "overview.lastCycles": "Últimos ciclos",
  "overview.viewAll": "Ver todas",
  "overview.runTitle": "Execução manual",
  "overview.runDisabled":
    "O disparo de ciclos está desligado no agente. Ligue API_ALLOW_RUNS=true no deploy para habilitar os botões.",
  "overview.runActive": "Rodando {mode} desde {time}",
  "overview.runStarted": "Ciclo {mode} iniciado",
  "overview.runFailed": "Não foi possível iniciar o ciclo: {error}",

  "editions.title": "Edições publicadas",
  "editions.filterKind": "Tipo",
  "editions.filterStatus": "Notificação",
  "editions.limit": "Limite",
  "editions.count": "{total} publicação|{total} publicações",
  "editions.empty": "Nenhuma edição publicada ainda.",
  "editions.kind.all": "Todas",
  "editions.kind.article": "Edição diária",
  "editions.kind.report": "Relatório",
  "editions.status.all": "Todas",
  "editions.status.pending": "Pendente",
  "editions.status.delivered": "Entregue",
  "editions.status.dead_letter": "Dead-letter",
  "editions.status.suppressed": "Suprimida",
  "editions.quality": "Primárias",
  "editions.sources": "Selecionadas",
  "editions.metrics.considered": "Consideradas",
  "editions.metrics.selected": "Selecionadas",
  "editions.metrics.rejected": "Rejeitadas",
  "editions.metrics.primarySources": "Primárias",
  "editions.attempts": "Tentativas",
  "editions.evidence": "Evidência preservada",
  "editions.evidenceHint":
    "{count} fonte citada nesta publicação|{count} fontes citadas nesta publicação",
  "editions.notificationError": "Erro de notificação",
  "editions.close": "Fechar",
  "editions.selectHint":
    "Selecione uma edição para ver o resumo e a evidência preservada.",

  "sources.title": "Fontes",
  "sources.window": "Janela",
  "sources.days": "{days} dia|{days} dias",
  "sources.health": "Saúde das fontes",
  "sources.recent": "Artigos coletados",
  "sources.source": "Fonte",
  "sources.primary": "Primária",
  "sources.articles": "Artigos",
  "sources.lastSeen": "Último artigo",
  "sources.failures": "Falhas seguidas",
  "sources.skipped": "Skips restantes",
  "sources.empty": "Nenhuma fonte coletou artigos nesta janela.",

  "cycles.title": "Ciclos",
  "cycles.type": "Tipo",
  "cycles.status": "Status",
  "cycles.id": "ID",
  "cycles.started": "Início",
  "cycles.duration": "Duração",
  "cycles.error": "Erro",
  "cycles.metrics": "Métricas",
  "cycles.count": "{total} execução|{total} execuções",
  "cycles.empty": "Nenhuma execução registrada.",
  "cycles.status.succeeded": "Sucesso",
  "cycles.status.failed": "Falha",
  "cycles.status.skipped": "Ignorado",
  "cycles.status.running": "Em execução",

  "prompts.title": "Prompt do sistema",
  "prompts.active": "Prompt ativo",
  "prompts.activeHint": "{chars} caracteres · atualizado {time}",
  "prompts.none": "Nenhum prompt promovido ainda.",
  "prompts.versions": "Versões",
  "prompts.score": "Pontuação",
  "prompts.reason": "Motivo",
  "prompts.created": "Criado em",
  "prompts.chars": "Caracteres",
  "prompts.status.promoted": "Promovido",
  "prompts.status.rejected": "Rejeitado",
  "prompts.status.rolled_back": "Revertido",
  "prompts.gate":
    "Promoção exige pontuação ≥ 70 e nenhuma regressão frente ao prompt ativo.",
  "prompts.rollbackHint":
    "A recuperação explícita continua sendo `npm run prompt:rollback`.",

  "metrics.title": "Métricas",
  "metrics.window": "Janela",
  "metrics.hours": "{hours} h",
  "metrics.name": "Métrica",
  "metrics.samples": "Amostras",
  "metrics.average": "Média",
  "metrics.minimum": "Mínimo",
  "metrics.maximum": "Máximo",
  "metrics.last": "Última leitura",
  "metrics.series": "Série de {name}",
  "metrics.points": "{count} leitura|{count} leituras",
  "metrics.empty": "Nenhuma métrica registrada nesta janela.",
  "metrics.selectHint": "Selecione uma métrica para ver a série.",
  "metrics.max": "Máx",
  "metrics.avg": "Média",
  "metrics.min": "Mín",
  "metrics.tip": "Clique no nome de uma métrica para ver a série ao lado.",

  "settings.title": "Ajustes",
  "settings.apiUrl": "URL da API",
  "settings.apiUrlHint":
    "Ex.: https://evo-agent.exemplo.svc ou http://127.0.0.1:8787",
  "settings.token": "API_TOKEN",
  "settings.tokenHint":
    "Mesmo valor configurado no agente. Fica só no processo Rust, nunca no webview.",
  "settings.tokenStored": "Token salvo. Deixe em branco para manter.",
  "settings.tokenMissing": "Nenhum token salvo ainda.",
  "settings.save": "Salvar",
  "settings.test": "Testar conexão",
  "settings.saved": "Configuração salva",
  "settings.testOk": "Conexão validada com o agente",
  "settings.testFailed": "Falha na conexão: {error}",
  "settings.clearToken": "Limpar token",
  "settings.connection": "Conexão do agente",
  "settings.runMode": "Modo",
  "settings.timezone": "Fuso dos agendamentos",
  "settings.database": "Banco",
  "settings.uptime": "No ar há",
  "settings.schedule": "Agendamentos",
  "settings.crawl": "Aprendizado",
  "settings.article": "Edições diárias",
  "settings.radar": "Radar",
  "settings.modelAlerts": "Alertas de modelo",
  "settings.runsEnabled": "Disparo manual",
  "settings.runsEnabledValue":
    "habilitado ({modes} modo)|habilitado ({modes} modos)",
  "settings.runsDisabledValue": "desabilitado (API_ALLOW_RUNS)",
  "settings.theme": "Tema",
  "settings.themeDark": "Escuro",
  "settings.themeLight": "Claro",
  "settings.themeSystem": "Seguir o sistema",
  "settings.notConfigured": "Informe a URL e o token do agente para começar.",

  // Badges de atencao nas abas: um numero que exige olhar, nao decoracao.
  "attention.pendingNotifications":
    "{count} notificação pendente ou em dead-letter|{count} notificações pendentes ou em dead-letter",
  "attention.failingSources":
    "{count} fonte com falha|{count} fontes com falha",
  "attention.failedCycles":
    "{count} ciclo com falha em 24h|{count} ciclos com falha em 24h",
  "attention.running": "Ciclo em execução",
} as const;

export type MessageKey = keyof typeof catalog;

const PLACEHOLDER = /\{(\w+)\}/g;
const COUNT_PARAMS = ["count", "total", "days", "modes"];

/**
 * An entry written "um|outros" has a singular and a plural form; it is the
 * singular only when the count is exactly "1" (a formatted 1000 is "1.000").
 */
function pickForm(
  template: string,
  params: Record<string, string | number> | undefined,
): string {
  const [one, other] = template.split("|");
  if (other === undefined) return template;
  const name = params && COUNT_PARAMS.find((p) => p in params);
  return params && name && String(params[name]) === "1" ? one : other;
}

export function t(
  key: MessageKey,
  params?: Record<string, string | number>,
): string {
  const template = pickForm(catalog[key], params);
  if (!params) return template;
  return template.replace(PLACEHOLDER, (match, name: string) =>
    name in params ? String(params[name]) : match,
  );
}

export function healthLabel(status: HealthStatus): string {
  return t(`health.${status}` as MessageKey);
}

/**
 * Os motivos viajam em ingles porque sao o contrato documentado de `/health`
 * (docs/OPERATIONS.md); traduzir e responsabilidade de quem exibe.
 */
const HEALTH_REASONS: Record<string, string> = {
  "notifications in dead-letter": "notificações em dead-letter",
  "no successful cycle in 24h": "nenhum ciclo concluído em 24h",
  "failed cycles in 24h": "ciclos com falha em 24h",
  "stale running cycles": "ciclos presos em execução",
  "notification backlog above limit": "fila de notificações acima do limite",
  "notifications stuck in outbox": "notificações presas no outbox",
  "no articles collected in 48h": "nenhum artigo coletado em 48h",
  "no recent primary sources": "nenhuma fonte primária recente",
};

export function healthReasonLabel(reason: string): string {
  return HEALTH_REASONS[reason] ?? reason;
}

export function editionKindLabel(
  edition: Pick<Edition, "kind" | "period">,
): string {
  if (edition.kind === "article") return t("editions.kind.article");
  return edition.period
    ? `${t("editions.kind.report")}: ${edition.period}`
    : t("editions.kind.report");
}

export function notificationLabel(
  status: Edition["notificationStatus"],
): string {
  return t(`editions.status.${status}` as MessageKey);
}

export function cycleStatusLabel(status: string): string {
  const known = ["succeeded", "failed", "skipped", "running"];
  return known.includes(status)
    ? t(`cycles.status.${status}` as MessageKey)
    : status;
}

export function promptStatusLabel(status: string): string {
  const known = ["promoted", "rejected", "rolled_back"];
  return known.includes(status)
    ? t(`prompts.status.${status}` as MessageKey)
    : status;
}

export function runModeLabel(mode: string): string {
  return mode
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}
