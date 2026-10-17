import { t } from "./i18n";

export type TabId =
  | "overview"
  | "editions"
  | "sources"
  | "cycles"
  | "prompts"
  | "metrics"
  | "settings";

export const TABS: { id: TabId; label: string }[] = [
  { id: "overview", label: t("tabs.overview") },
  { id: "editions", label: t("tabs.editions") },
  { id: "sources", label: t("tabs.sources") },
  { id: "cycles", label: t("tabs.cycles") },
  { id: "prompts", label: t("tabs.prompts") },
  { id: "metrics", label: t("tabs.metrics") },
  { id: "settings", label: t("tabs.settings") },
];

export const panelId = (tab: TabId) => `painel-${tab}`;
export const tabId = (tab: TabId) => `aba-${tab}`;

export function isTabId(value: string): value is TabId {
  return TABS.some((tab) => tab.id === value);
}

/** Alvo da seta/Home/End no padrao WAI-ARIA de abas. */
export function nextTabIndex(current: TabId, key: string): number | null {
  const index = TABS.findIndex((tab) => tab.id === current);
  if (index < 0) return null;
  const last = TABS.length - 1;
  if (key === "ArrowRight") return (index + 1) % TABS.length;
  if (key === "ArrowLeft") return (index - 1 + TABS.length) % TABS.length;
  if (key === "Home") return 0;
  if (key === "End") return last;
  return null;
}
