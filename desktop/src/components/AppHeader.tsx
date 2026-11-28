import { Button, ProgressBar } from "@juninmd/sonido";
import type { ReactElement } from "react";
import { formatDateTime, hostOf } from "../lib/format";
import { t } from "../lib/i18n";
import type { ThemeId } from "../lib/theme";
import type { HealthStatus } from "../lib/types";
import { MarkIcon, MonitorIcon, MoonIcon, RefreshIcon, SunIcon } from "./Icons";
import StatusPill from "./StatusPill";

const THEME_ICON: Record<
  ThemeId,
  (props: { className?: string }) => ReactElement
> = {
  escuro: MoonIcon,
  claro: SunIcon,
  sistema: MonitorIcon,
};

const THEME_LABEL: Record<ThemeId, string> = {
  escuro: t("settings.themeDark"),
  claro: t("settings.themeLight"),
  sistema: t("settings.themeSystem"),
};

export default function AppHeader({
  baseUrl,
  status,
  reasons,
  updatedAt,
  loading,
  onRefresh,
  theme,
  onCycleTheme,
}: {
  baseUrl: string | null;
  status: HealthStatus | null;
  reasons: string[];
  updatedAt: number | null;
  loading: boolean;
  onRefresh: () => void;
  theme: ThemeId;
  onCycleTheme: () => void;
}) {
  const ThemeIcon = THEME_ICON[theme];

  return (
    <header className="shrink-0 border-b border-edge bg-panel">
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <MarkIcon />
          <div className="min-w-0">
            <h1 className="truncate text-sm font-semibold text-fg">
              {t("app.title")}
            </h1>
            <p className="truncate text-[11px] text-muted">
              {baseUrl
                ? t("app.apiHost", { host: hostOf(baseUrl) })
                : t("settings.notConfigured")}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {status && <StatusPill status={status} reasons={reasons} />}
          {updatedAt !== null && (
            <span className="text-[11px] text-faint">
              {t("app.updatedAt", {
                time: formatDateTime(new Date(updatedAt).toISOString()),
              })}
            </span>
          )}

          <Button
            variant="secondary"
            size="sm"
            onClick={onRefresh}
            disabled={loading}
            aria-label={t("app.refresh")}
            title={t("app.refresh")}
            iconStart={
              <RefreshIcon
                className={`size-3.5 ${loading ? "animate-spin" : ""}`}
              />
            }
          >
            <span className="hidden sm:inline">
              {loading ? t("app.refreshing") : t("app.refresh")}
            </span>
          </Button>

          <Button
            variant="secondary"
            size="icon"
            onClick={onCycleTheme}
            title={THEME_LABEL[theme]}
            aria-label={`${t("settings.theme")}: ${THEME_LABEL[theme]}`}
          >
            <ThemeIcon className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* Barra de atividade: so ocupa espaco enquanto ha leitura em andamento. */}
      <div className="h-1 overflow-hidden">
        {loading && (
          <ProgressBar label={t("app.refreshing")} tone="accent" size="sm" />
        )}
      </div>
    </header>
  );
}
