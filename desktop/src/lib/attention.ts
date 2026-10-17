import { t } from "./i18n";
import type { TabId } from "./tabs";
import type { Overview } from "./types";

export type Attention = {
  count: number;
  tone: "warn" | "danger" | "info";
  title: string;
};

/**
 * O que exige olhar, derivado da visao geral que o cabecalho ja le. Uma aba sem
 * entrada nao mostra badge: um "0" permanente vira ruido.
 */
export function attentionFor(
  overview: Overview | undefined,
): Partial<Record<TabId, Attention>> {
  if (!overview) return {};

  const { stats, sources, activeRun } = overview;
  const map: Partial<Record<TabId, Attention>> = {};

  const notifications =
    stats.pendingNotifications + stats.deadLetterNotifications;
  if (notifications > 0) {
    map.editions = {
      count: notifications,
      // Uma notificacao em dead-letter nao se recupera sozinha; pendente, sim.
      tone: stats.deadLetterNotifications > 0 ? "danger" : "warn",
      title: t("attention.pendingNotifications", { count: notifications }),
    };
  }

  if (sources.failing > 0) {
    map.sources = {
      count: sources.failing,
      tone: "warn",
      title: t("attention.failingSources", { count: sources.failing }),
    };
  }

  if (activeRun) {
    map.cycles = { count: 1, tone: "info", title: t("attention.running") };
  } else if (stats.failedCycles24h > 0) {
    map.cycles = {
      count: stats.failedCycles24h,
      tone: "warn",
      title: t("attention.failedCycles", { count: stats.failedCycles24h }),
    };
  }

  return map;
}
