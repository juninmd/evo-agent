import { useCallback, useEffect, useMemo, useState } from "react";
import AppHeader from "./components/AppHeader";
import ErrorBanner from "./components/ErrorBanner";
import Skeleton from "./components/Skeleton";
import TabBar from "./components/TabBar";
import CyclesTab from "./components/tabs/CyclesTab";
import EditionsTab from "./components/tabs/EditionsTab";
import MetricsTab from "./components/tabs/MetricsTab";
import OverviewTab from "./components/tabs/OverviewTab";
import PromptsTab from "./components/tabs/PromptsTab";
import SettingsTab from "./components/tabs/SettingsTab";
import SourcesTab from "./components/tabs/SourcesTab";
import { api, errText } from "./lib/api";
import { attentionFor } from "./lib/attention";
import { t } from "./lib/i18n";
import { shortcutFor } from "./lib/shortcuts";
import { type TabId, panelId, tabId } from "./lib/tabs";
import {
  type ThemeId,
  applyTheme,
  followSystemTheme,
  loadTheme,
  nextTheme,
  withThemeTransition,
} from "./lib/theme";
import type { SettingsView } from "./lib/types";
import { usePoll } from "./lib/usePoll";

/** O que exige olhar, derivado da visao geral que o cabecalho ja le. */
export default function App() {
  const [settings, setSettings] = useState<SettingsView | null>(null);
  const [settingsError, setSettingsError] = useState<string | undefined>();
  const [tab, setTab] = useState<TabId>("overview");
  const [theme, setTheme] = useState<ThemeId>(() => loadTheme());

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // O atributo troca dentro da transicao (o fade precisa do antes e do depois);
  // o efeito acima repete a aplicacao, que e idempotente, e persiste a escolha.
  const changeTheme = useCallback((next: ThemeId) => {
    withThemeTransition(() => {
      applyTheme(next);
      setTheme(next);
    });
  }, []);

  // O SO pode trocar de tema com o console aberto.
  useEffect(
    () =>
      followSystemTheme(() => {
        if (theme === "sistema") applyTheme("sistema");
      }),
    [theme],
  );

  useEffect(() => {
    api
      .settingsGet()
      .then((view) => {
        setSettings(view);
        setSettingsError(undefined);
      })
      .catch((error) => setSettingsError(errText(error)));
  }, []);

  const configured = settings?.hasToken === true;
  // A chave vazia desliga a consulta enquanto nao ha o que consultar.
  const overview = usePoll(
    configured ? "overview" : "",
    () => api.overview(),
    30_000,
  );
  const meta = usePoll(configured ? "meta" : "", () => api.meta(), 300_000);

  const attention = useMemo(() => attentionFor(overview.data), [overview.data]);

  const onSaved = useCallback((view: SettingsView) => {
    setSettings(view);
    setSettingsError(undefined);
  }, []);

  const refresh = useCallback(() => {
    overview.reload();
    meta.reload();
  }, [overview, meta]);

  useEffect(() => {
    if (!configured) return;
    const onKeyDown = (event: KeyboardEvent) => {
      const action = shortcutFor(event, event.target as HTMLElement | null);
      if (!action) return;
      event.preventDefault();
      if (action.kind === "refresh") {
        refresh();
        return;
      }
      setTab(action.tab);
      // O foco acompanha: as setas continuam a navegacao a partir da aba nova.
      window.requestAnimationFrame(() =>
        document.getElementById(tabId(action.tab))?.focus(),
      );
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [configured, refresh]);

  if (settingsError) {
    return (
      <div className="p-3">
        <ErrorBanner
          message={t("common.loadFailed", { error: settingsError })}
        />
      </div>
    );
  }
  if (!settings) {
    return (
      <div className="p-3">
        <Skeleton label={t("app.loading")} shape="tiles" />
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-ink text-fg">
      <AppHeader
        baseUrl={settings.baseUrl}
        status={overview.data?.health.status ?? null}
        reasons={overview.data?.health.reasons ?? []}
        updatedAt={overview.updatedAt}
        loading={overview.loading}
        onRefresh={refresh}
        theme={theme}
        onCycleTheme={() => changeTheme(nextTheme(theme))}
      />

      {configured ? (
        <TabBar current={tab} onChange={setTab} attention={attention} />
      ) : null}

      {/* `min-h-full` faz uma aba curta ocupar a janela em vez de deixar um
          vazio embaixo; quem tem tabela preenche e rola por dentro do card. */}
      <main
        id={panelId(tab)}
        role="tabpanel"
        aria-labelledby={configured ? `aba-${tab}` : undefined}
        aria-busy={overview.loading}
        className="flex min-h-0 flex-1 flex-col overflow-y-auto p-3"
      >
        {/* `key` pela aba: o painel novo entra com a animacao de entrada. */}
        <div key={tab} className="evo-enter flex min-h-full flex-col gap-3">
          {!configured ? (
            <>
              <div className="rounded-lg border border-warn/40 bg-warn/10 px-3 py-2 text-xs text-warn">
                {t("settings.notConfigured")}
              </div>
              <SettingsTab
                settings={settings}
                meta={meta.data}
                theme={theme}
                onTheme={changeTheme}
                onSaved={onSaved}
              />
            </>
          ) : (
            <>
              {tab === "overview" && (
                <OverviewTab
                  overview={overview.data}
                  loading={overview.loading}
                  error={overview.error}
                  onRetry={refresh}
                  onOpenTab={setTab}
                  runModes={meta.data?.runnableModes ?? []}
                />
              )}
              {tab === "editions" && <EditionsTab />}
              {tab === "sources" && <SourcesTab />}
              {tab === "cycles" && (
                <CyclesTab modes={meta.data?.runnableModes ?? []} />
              )}
              {tab === "prompts" && <PromptsTab />}
              {tab === "metrics" && <MetricsTab />}
              {tab === "settings" && (
                <SettingsTab
                  settings={settings}
                  meta={meta.data}
                  theme={theme}
                  onTheme={changeTheme}
                  onSaved={onSaved}
                />
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
